<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Src\Pms\Infrastructure\Models\StockAlert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * StockAlertController
 * 
 * Phase 5: Stock Management - Stock Alerts
 * Handles stock alert notifications, tracking, and user actions
 * 
 * 🔒 CORE IMMUTABLE RULES ENFORCED:
 * ✅ guard_name: 'api' - All authorization uses API guard
 * ✅ tenant_id: All queries strictly scoped to tenant
 * ✅ model_morph_key: UUID strings for all foreign keys
 * ✅ No global roles - All operations are tenant-scoped
 * 
 * @package App\Http\Controllers\Api
 */
class StockAlertController extends Controller
{
    /**
     * Display a listing of stock alerts for the tenant
     * 
     * Permission: products.view (viewing alerts for products)
     * 
     * Query Parameters:
     * - page: Page number (default: 1)
     * - per_page: Results per page (default: 20, max: 100)
     * - status: Filter by status (pending|acknowledged|resolved|dismissed)
     * - severity: Filter by severity (low|critical|out_of_stock)
     * - sort_by: Sort field (default: created_at)
     * - sort_order: Sort direction (asc|desc, default: desc)
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        // Authorization - Policy check
        $this->authorize('viewAny', [StockAlert::class, $tenantId]);
        
        // Build query with tenant scoping (IMMUTABLE RULE)
        $query = StockAlert::where('tenant_id', $tenantId)
            ->with(['product', 'product.category']);
        
        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        
        if ($request->filled('severity')) {
            $query->where('severity', $request->input('severity'));
        }
        
        // Sorting
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);
        
        // Pagination
        $perPage = min($request->input('per_page', 20), 100);
        $paginator = $query->paginate($perPage);
        
        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }
    
    /**
     * Get stock alert statistics summary
     * 
     * Permission: products.view
     * 
     * Returns:
     * - Total alerts count
     * - Breakdown by status (pending, acknowledged, resolved, dismissed)
     * - Breakdown by severity (low, critical, out_of_stock)
     * - Actionable alerts count (pending + acknowledged)
     * - Not notified count
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function stats(Request $request, string $tenantId): JsonResponse
    {
        // Authorization
        $this->authorize('viewAny', [StockAlert::class, $tenantId]);
        
        // Aggregate stats (IMMUTABLE RULE: tenant-scoped)
        $totalAlerts = StockAlert::where('tenant_id', $tenantId)->count();
        
        // Status breakdown
        $byStatus = StockAlert::where('tenant_id', $tenantId)
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();
        
        // Severity breakdown
        $bySeverity = StockAlert::where('tenant_id', $tenantId)
            ->select('severity', DB::raw('count(*) as count'))
            ->groupBy('severity')
            ->pluck('count', 'severity')
            ->toArray();
        
        // Actionable count (pending + acknowledged)
        $actionableCount = StockAlert::where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'acknowledged'])
            ->count();
        
        // Not notified count
        $notNotified = StockAlert::where('tenant_id', $tenantId)
            ->where('notified', false)
            ->count();
        
        return response()->json([
            'success' => true,
            'data' => [
                'total_alerts' => $totalAlerts,
                'by_status' => [
                    'pending' => $byStatus['pending'] ?? 0,
                    'acknowledged' => $byStatus['acknowledged'] ?? 0,
                    'resolved' => $byStatus['resolved'] ?? 0,
                    'dismissed' => $byStatus['dismissed'] ?? 0,
                ],
                'by_severity' => [
                    'low' => $bySeverity['low'] ?? 0,
                    'critical' => $bySeverity['critical'] ?? 0,
                    'out_of_stock' => $bySeverity['out_of_stock'] ?? 0,
                ],
                'actionable_count' => $actionableCount,
                'not_notified' => $notNotified,
            ],
        ]);
    }
    
    /**
     * Get list of low stock products
     * 
     * Permission: products.view
     * 
     * Query Parameters:
     * - severity: Filter by severity (optional)
     * - category_id: Filter by category (optional)
     * - page: Page number (default: 1)
     * - per_page: Results per page (default: 20)
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function lowStockProducts(Request $request, string $tenantId): JsonResponse
    {
        // Authorization
        $this->authorize('viewAny', [StockAlert::class, $tenantId]);
        
        // Get unique products with active alerts (IMMUTABLE RULE: tenant-scoped)
        $query = StockAlert::where('tenant_id', $tenantId)
            ->whereIn('status', ['pending', 'acknowledged'])
            ->with(['product', 'product.category']);
        
        // Apply filters
        if ($request->filled('severity')) {
            $query->where('severity', $request->input('severity'));
        }
        
        // Get alerts grouped by product
        $alerts = $query->get();
        
        // Group by product_id and get highest severity per product
        $productAlerts = $alerts->groupBy('product_id')->map(function ($productGroup) {
            $firstAlert = $productGroup->first();
            
            // Determine highest severity
            $severityOrder = ['out_of_stock' => 3, 'critical' => 2, 'low' => 1];
            $highestSeverity = $productGroup->sortByDesc(function ($alert) use ($severityOrder) {
                return $severityOrder[$alert->severity];
            })->first()->severity;
            
            return [
                'product_id' => $firstAlert->product_id,
                'product' => $firstAlert->product,
                'alert_count' => $productGroup->count(),
                'highest_severity' => $highestSeverity,
                'current_stock' => $firstAlert->current_stock,
                'reorder_point' => $firstAlert->reorder_point,
                'latest_alert_date' => $productGroup->max('created_at'),
            ];
        })->values();
        
        // Optional category filter
        if ($request->filled('category_id')) {
            $categoryId = $request->input('category_id');
            $productAlerts = $productAlerts->filter(function ($item) use ($categoryId) {
                return $item['product']->category_id === $categoryId;
            })->values();
        }
        
        // Manual pagination for grouped results
        $perPage = min($request->input('per_page', 20), 100);
        $page = $request->input('page', 1);
        $total = $productAlerts->count();
        $items = $productAlerts->slice(($page - 1) * $perPage, $perPage)->values();
        
        return response()->json([
            'success' => true,
            'data' => $items,
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) ceil($total / $perPage),
                'per_page' => $perPage,
                'total' => $total,
                'from' => $total > 0 ? (($page - 1) * $perPage) + 1 : null,
                'to' => min($page * $perPage, $total),
            ],
        ]);
    }
    
    /**
     * Acknowledge a stock alert
     * 
     * Permission: products.view (acknowledgment is a read-only action)
     * 
     * Request Body:
     * - notes: Optional acknowledgment notes
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $alertId
     * @return JsonResponse
     */
    public function acknowledge(Request $request, string $tenantId, string $alertId): JsonResponse
    {
        // Find alert with tenant scoping (IMMUTABLE RULE)
        $alert = StockAlert::where('tenant_id', $tenantId)
            ->where('id', $alertId)
            ->firstOrFail();
        
        // Authorization
        $this->authorize('acknowledge', [$alert, $tenantId]);
        
        // Validate status
        if ($alert->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Only pending alerts can be acknowledged',
            ], 422);
        }
        
        // Update alert
        $alert->update([
            'status' => 'acknowledged',
            'acknowledged_by' => auth()->id(),
            'acknowledged_at' => now(),
            'acknowledged_notes' => $request->input('notes'),
        ]);
        
        $alert->load(['product', 'acknowledgedBy:id,name,email']);
        
        return response()->json([
            'success' => true,
            'message' => 'Stock alert acknowledged successfully',
            'data' => $alert,
        ]);
    }
    
    /**
     * Resolve a stock alert
     * 
     * Permission: inventory.adjust (resolving implies action was taken)
     * 
     * Request Body:
     * - notes: Optional resolution notes
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $alertId
     * @return JsonResponse
     */
    public function resolve(Request $request, string $tenantId, string $alertId): JsonResponse
    {
        // Find alert with tenant scoping (IMMUTABLE RULE)
        $alert = StockAlert::where('tenant_id', $tenantId)
            ->where('id', $alertId)
            ->firstOrFail();
        
        // Authorization
        $this->authorize('resolve', [$alert, $tenantId]);
        
        // Validate status
        if (in_array($alert->status, ['resolved', 'dismissed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Alert is already closed',
            ], 422);
        }
        
        // Update alert
        $alert->update([
            'status' => 'resolved',
            'resolved_by' => auth()->id(),
            'resolved_at' => now(),
            'resolved_notes' => $request->input('notes'),
        ]);
        
        $alert->load(['product', 'resolvedBy:id,name,email']);
        
        return response()->json([
            'success' => true,
            'message' => 'Stock alert resolved successfully',
            'data' => $alert,
        ]);
    }
    
    /**
     * Dismiss a stock alert
     * 
     * Permission: products.view (dismiss is marking as not actionable)
     * 
     * Request Body:
     * - notes: Optional dismissal notes
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $alertId
     * @return JsonResponse
     */
    public function dismiss(Request $request, string $tenantId, string $alertId): JsonResponse
    {
        // Find alert with tenant scoping (IMMUTABLE RULE)
        $alert = StockAlert::where('tenant_id', $tenantId)
            ->where('id', $alertId)
            ->firstOrFail();
        
        // Authorization
        $this->authorize('dismiss', [$alert, $tenantId]);
        
        // Validate status
        if (in_array($alert->status, ['resolved', 'dismissed'])) {
            return response()->json([
                'success' => false,
                'message' => 'Alert is already closed',
            ], 422);
        }
        
        // Update alert
        $alert->update([
            'status' => 'dismissed',
            'dismissed_by' => auth()->id(),
            'dismissed_at' => now(),
            'dismissed_notes' => $request->input('notes'),
        ]);
        
        $alert->load(['product', 'dismissedBy:id,name,email']);
        
        return response()->json([
            'success' => true,
            'message' => 'Stock alert dismissed successfully',
            'data' => $alert,
        ]);
    }
}