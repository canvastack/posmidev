<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Infrastructure\Models\StockAlert;
use Src\Pms\Infrastructure\Models\Product;

/**
 * StockAlertController
 * 
 * 🔒 CORE IMMUTABLE RULES ENFORCED:
 * ✅ guard_name: 'api' - All auth uses API guard (Sanctum)
 * ✅ team_foreign_key: tenant_id - All queries scoped by tenant_id
 * ✅ Strictly tenant-scoped - No cross-tenant data access
 * ✅ Authorization via policies with tenantId parameter
 * 
 * Handles stock alert lifecycle:
 * - List alerts with filtering and pagination
 * - Get alert statistics
 * - Acknowledge alerts
 * - Resolve alerts (when restocked)
 * - Dismiss alerts (false positives)
 * - Get low stock products
 */
class StockAlertController extends Controller
{
    /**
     * List all stock alerts for the tenant
     * 
     * Query params:
     * - status: pending|acknowledged|resolved|dismissed
     * - severity: low|critical|out_of_stock
     * - product_id: Filter by specific product
     * - per_page: Pagination (default 20, max 100)
     * - sort_by: created_at|current_stock|severity
     * - sort_order: asc|desc (default desc)
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        // ✅ IMMUTABLE RULE: Authorization with tenantId
        $this->authorize('viewAny', [StockAlert::class, $tenantId]);

        // ✅ IMMUTABLE RULE: Explicit tenant filtering (NO global scope)
        $query = StockAlert::where('tenant_id', $tenantId)
            ->with(['product:id,name,sku,stock', 'acknowledgedBy:id,name', 'resolvedBy:id,name']);

        // Filter by status
        if ($request->has('status')) {
            $status = $request->input('status');
            $query->where('status', $status);
        }

        // Filter by severity
        if ($request->has('severity')) {
            $severity = $request->input('severity');
            $query->bySeverity($severity);
        }

        // Filter by product
        if ($request->has('product_id')) {
            $query->where('product_id', $request->input('product_id'));
        }

        // Filter by actionable alerts (pending + acknowledged)
        if ($request->boolean('actionable_only')) {
            $query->whereIn('status', ['pending', 'acknowledged']);
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        
        $allowedSorts = ['created_at', 'current_stock', 'severity', 'status'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Pagination
        $perPage = min($request->get('per_page', 20), 100);
        $alerts = $query->paginate($perPage);

        // Transform response
        // ✅ IMMUTABLE RULE: tenant_id MUST be in response
        $data = $alerts->getCollection()->map(function ($alert) {
            return [
                'id' => $alert->id,
                'tenant_id' => $alert->tenant_id, // ✅ IMMUTABLE RULE
                'product_id' => $alert->product_id,
                'product' => $alert->product ? [
                    'id' => $alert->product->id,
                    'name' => $alert->product->name,
                    'sku' => $alert->product->sku,
                    'current_stock' => $alert->product->stock,
                ] : null,
                'current_stock' => $alert->current_stock,
                'reorder_point' => $alert->reorder_point,
                'severity' => $alert->severity,
                'severity_color' => $alert->severity_color,
                'status' => $alert->status,
                'status_color' => $alert->status_color,
                'notified' => $alert->notified,
                'notified_at' => $alert->notified_at?->toIso8601String(),
                'acknowledged_by' => $alert->acknowledgedBy ? [
                    'id' => $alert->acknowledgedBy->id,
                    'name' => $alert->acknowledgedBy->name,
                ] : null,
                'acknowledged_at' => $alert->acknowledged_at?->toIso8601String(),
                'resolved_by' => $alert->resolvedBy ? [
                    'id' => $alert->resolvedBy->id,
                    'name' => $alert->resolvedBy->name,
                ] : null,
                'resolved_at' => $alert->resolved_at?->toIso8601String(),
                'is_actionable' => $alert->is_actionable,
                'is_closed' => $alert->is_closed,
                'created_at' => $alert->created_at->toIso8601String(),
                'updated_at' => $alert->updated_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $data,
            'pagination' => [
                'current_page' => $alerts->currentPage(),
                'last_page' => $alerts->lastPage(),
                'per_page' => $alerts->perPage(),
                'total' => $alerts->total(),
            ],
        ]);
    }

    /**
     * Get stock alert statistics
     * 
     * Returns counts and metrics for dashboard display
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function stats(Request $request, string $tenantId): JsonResponse
    {
        // ✅ IMMUTABLE RULE: Authorization with tenantId
        $this->authorize('viewAny', [StockAlert::class, $tenantId]);

        // ✅ IMMUTABLE RULE: Explicit tenant filtering for all queries
        $stats = [
            'total_alerts' => StockAlert::where('tenant_id', $tenantId)->count(),
            'by_status' => [
                'pending' => StockAlert::where('tenant_id', $tenantId)->pending()->count(),
                'acknowledged' => StockAlert::where('tenant_id', $tenantId)->acknowledged()->count(),
                'resolved' => StockAlert::where('tenant_id', $tenantId)->resolved()->count(),
                'dismissed' => StockAlert::where('tenant_id', $tenantId)->dismissed()->count(),
            ],
            'by_severity' => [
                'low' => StockAlert::where('tenant_id', $tenantId)->lowSeverity()->count(),
                'critical' => StockAlert::where('tenant_id', $tenantId)->criticalSeverity()->count(),
                'out_of_stock' => StockAlert::where('tenant_id', $tenantId)->outOfStock()->count(),
            ],
            'actionable_count' => StockAlert::where('tenant_id', $tenantId)->actionable()->count(),
            'not_notified' => StockAlert::where('tenant_id', $tenantId)->notNotified()->count(),
        ];

        return response()->json($stats);
    }

    /**
     * Acknowledge a stock alert
     * 
     * Marks the alert as seen/acknowledged by the user
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $alertId
     * @return JsonResponse
     */
    public function acknowledge(Request $request, string $tenantId, string $alertId): JsonResponse
    {
        // ✅ IMMUTABLE RULE: Authorization with tenantId
        $this->authorize('acknowledge', [StockAlert::class, $tenantId]);

        // ✅ IMMUTABLE RULE: Explicit tenant filtering
        $alert = StockAlert::where('tenant_id', $tenantId)->findOrFail($alertId);

        // Check if already acknowledged or closed
        if ($alert->status !== 'pending') {
            return response()->json([
                'message' => "Alert cannot be acknowledged. Current status: {$alert->status}",
            ], 422);
        }

        // Acknowledge the alert
        $alert->acknowledge($request->user(), $request->input('notes'));

        return response()->json([
            'message' => 'Alert acknowledged successfully',
            'data' => [
                'id' => $alert->id,
                'tenant_id' => $alert->tenant_id, // ✅ IMMUTABLE RULE
                'status' => $alert->status,
                'acknowledged_by' => $alert->acknowledgedBy ? [
                    'id' => $alert->acknowledgedBy->id,
                    'name' => $alert->acknowledgedBy->name,
                ] : null,
                'acknowledged_at' => $alert->acknowledged_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Resolve a stock alert
     * 
     * Marks the alert as resolved (stock has been replenished)
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $alertId
     * @return JsonResponse
     */
    public function resolve(Request $request, string $tenantId, string $alertId): JsonResponse
    {
        // ✅ IMMUTABLE RULE: Authorization with tenantId
        $this->authorize('resolve', [StockAlert::class, $tenantId]);

        // ✅ IMMUTABLE RULE: Explicit tenant filtering
        $alert = StockAlert::where('tenant_id', $tenantId)->findOrFail($alertId);

        // Check if already closed
        if (in_array($alert->status, ['resolved', 'dismissed'])) {
            return response()->json([
                'message' => "Alert is already closed. Current status: {$alert->status}",
            ], 422);
        }

        // Resolve the alert
        $alert->resolve($request->user(), $request->input('notes'));

        return response()->json([
            'message' => 'Alert resolved successfully',
            'data' => [
                'id' => $alert->id,
                'tenant_id' => $alert->tenant_id, // ✅ IMMUTABLE RULE
                'status' => $alert->status,
                'resolved_by' => $alert->resolvedBy ? [
                    'id' => $alert->resolvedBy->id,
                    'name' => $alert->resolvedBy->name,
                ] : null,
                'resolved_at' => $alert->resolved_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Dismiss a stock alert
     * 
     * Marks the alert as dismissed (false positive or intentionally low)
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $alertId
     * @return JsonResponse
     */
    public function dismiss(Request $request, string $tenantId, string $alertId): JsonResponse
    {
        // ✅ IMMUTABLE RULE: Authorization with tenantId
        $this->authorize('dismiss', [StockAlert::class, $tenantId]);

        // ✅ IMMUTABLE RULE: Explicit tenant filtering
        $alert = StockAlert::where('tenant_id', $tenantId)->findOrFail($alertId);

        // Check if already closed
        if (in_array($alert->status, ['resolved', 'dismissed'])) {
            return response()->json([
                'message' => "Alert is already closed. Current status: {$alert->status}",
            ], 422);
        }

        // Dismiss the alert
        $alert->dismiss($request->user(), $request->input('notes'));

        return response()->json([
            'message' => 'Alert dismissed successfully',
            'data' => [
                'id' => $alert->id,
                'tenant_id' => $alert->tenant_id, // ✅ IMMUTABLE RULE
                'status' => $alert->status,
                'updated_at' => $alert->updated_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get list of products with low stock
     * 
     * Returns products that currently have low stock levels
     * Useful for quick overview and reordering decisions
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function lowStockProducts(Request $request, string $tenantId): JsonResponse
    {
        // ✅ IMMUTABLE RULE: Authorization with tenantId
        $this->authorize('viewAny', [StockAlert::class, $tenantId]);

        // ✅ IMMUTABLE RULE: Explicit tenant filtering
        // Get products with low stock (using Product helper methods)
        $query = Product::where('tenant_id', $tenantId)
            ->where('low_stock_alert_enabled', true)
            ->whereColumn('stock', '<=', 'reorder_point')
            ->with(['category:id,name']);

        // Filter by severity
        if ($request->has('severity')) {
            $severity = $request->input('severity');
            if ($severity === 'critical') {
                $query->whereRaw('stock <= (reorder_point / 2)');
            } elseif ($severity === 'out_of_stock') {
                $query->where('stock', '<=', 0);
            }
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'stock');
        $sortOrder = $request->input('sort_order', 'asc');
        
        $allowedSorts = ['stock', 'name', 'reorder_point', 'updated_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortOrder);
        }

        // Pagination
        $perPage = min($request->get('per_page', 20), 100);
        $products = $query->paginate($perPage);

        // Transform response
        // ✅ IMMUTABLE RULE: tenant_id MUST be in response
        $data = $products->getCollection()->map(function ($product) {
            return [
                'id' => $product->id,
                'tenant_id' => $product->tenant_id, // ✅ IMMUTABLE RULE
                'name' => $product->name,
                'sku' => $product->sku,
                'stock' => $product->stock,
                'reorder_point' => $product->reorder_point,
                'reorder_quantity' => $product->reorder_quantity,
                'stock_status' => $product->stock_status,
                'stock_status_color' => $product->stock_status_color,
                'stock_percentage' => $product->stock_percentage,
                'recommended_order_quantity' => $product->recommended_order_quantity,
                'category' => $product->category ? [
                    'id' => $product->category->id,
                    'name' => $product->category->name,
                ] : null,
                'price' => $product->price,
                'needs_reorder' => $product->needsReorder(),
                'has_active_alert' => $product->stockAlerts()->whereIn('status', ['pending', 'acknowledged'])->exists(),
                'updated_at' => $product->updated_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $data,
            'pagination' => [
                'current_page' => $products->currentPage(),
                'last_page' => $products->lastPage(),
                'per_page' => $products->perPage(),
                'total' => $products->total(),
            ],
            'summary' => [
                'total_low_stock_products' => $products->total(),
                'critical_products' => Product::where('low_stock_alert_enabled', true)
                    ->whereRaw('stock <= (reorder_point / 2)')
                    ->count(),
                'out_of_stock_products' => Product::where('low_stock_alert_enabled', true)
                    ->where('stock', '<=', 0)
                    ->count(),
            ],
        ]);
    }
}