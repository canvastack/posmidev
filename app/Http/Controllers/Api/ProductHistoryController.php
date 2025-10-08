<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductPriceHistory;
use App\Models\ProductStockHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;
use Src\Pms\Infrastructure\Models\Product;

class ProductHistoryController extends Controller
{
    /**
     * Get all activity logs for a product
     *
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function index(Request $request, string $tenantId, string $productId): JsonResponse
    {
        // Verify product exists and belongs to tenant
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Check permission
        if (!auth()->user()->can('products.view')) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to view product history.',
            ], 403);
        }

        // Get paginated activity logs for this product
        $perPage = min($request->get('per_page', 20), 100); // Max 100 items per page
        
        // Build query
        $query = Activity::where('subject_type', Product::class)
            ->where('subject_id', $productId)
            ->where('tenant_id', $tenantId);
        
        // Apply event type filter if provided
        if ($request->has('event') && $request->filled('event')) {
            $query->where('event', $request->get('event'));
        }
        
        // Apply date range filter if provided
        if ($request->has('date_from') && $request->filled('date_from')) {
            $query->where('created_at', '>=', $request->get('date_from'));
        }
        
        if ($request->has('date_to') && $request->filled('date_to')) {
            $query->where('created_at', '<=', $request->get('date_to'));
        }
        
        $activities = $query->with('causer:id,name,email')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        // Transform activities data
        $transformedActivities = $activities->getCollection()->map(function ($activity) {
            return [
                'id' => $activity->id,
                'event' => $activity->event,
                'description' => $activity->description,
                'properties' => $activity->properties,
                'changes' => [
                    'old' => $activity->properties['old'] ?? null,
                    'attributes' => $activity->properties['attributes'] ?? null,
                ],
                'causer' => $activity->causer ? [
                    'id' => $activity->causer->id,
                    'name' => $activity->causer->name,
                    'email' => $activity->causer->email,
                ] : null,
                'created_at' => $activity->created_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $transformedActivities,
            'pagination' => [
                'current_page' => $activities->currentPage(),
                'last_page' => $activities->lastPage(),
                'per_page' => $activities->perPage(),
                'total' => $activities->total(),
            ],
            'meta' => [
                'product_id' => $product->id,
                'product_name' => $product->name,
            ],
        ]);
    }

    /**
     * Get price history for a product
     *
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function priceHistory(Request $request, string $tenantId, string $productId): JsonResponse
    {
        // Verify product exists and belongs to tenant
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Check permission
        if (!auth()->user()->can('products.view')) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to view product price history.',
            ], 403);
        }

        // Get paginated price history
        $perPage = min($request->get('per_page', 50), 100); // Max 100 items for price history
        $priceHistory = ProductPriceHistory::where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->with('changedBy:id,name,email')
            ->orderByDesc('changed_at')
            ->paginate($perPage);

        // Transform price history data
        $transformedPriceHistory = $priceHistory->getCollection()->map(function ($history) {
            return [
                'id' => $history->id,
                'old_price' => (float) $history->old_price,
                'new_price' => (float) $history->new_price,
                'old_cost_price' => (float) $history->old_cost_price,
                'new_cost_price' => (float) $history->new_cost_price,
                'price_change' => $history->price_change,
                'price_change_percentage' => round($history->price_change_percentage, 2),
                'changed_by' => $history->changedBy ? [
                    'id' => $history->changedBy->id,
                    'name' => $history->changedBy->name,
                    'email' => $history->changedBy->email,
                ] : null,
                'changed_at' => $history->changed_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $transformedPriceHistory,
            'pagination' => [
                'current_page' => $priceHistory->currentPage(),
                'last_page' => $priceHistory->lastPage(),
                'per_page' => $priceHistory->perPage(),
                'total' => $priceHistory->total(),
            ],
            'meta' => [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'current_price' => (float) $product->price,
                'current_cost_price' => (float) $product->cost_price,
            ],
        ]);
    }

    /**
     * Get stock history for a product
     *
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function stockHistory(Request $request, string $tenantId, string $productId): JsonResponse
    {
        // Verify product exists and belongs to tenant
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->firstOrFail();

        // Check permission
        if (!auth()->user()->can('products.view')) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to view product stock history.',
            ], 403);
        }

        // Get paginated stock history
        $perPage = min($request->get('per_page', 50), 100); // Max 100 items for stock history
        $stockHistory = ProductStockHistory::where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->with('changedBy:id,name,email')
            ->orderByDesc('changed_at')
            ->paginate($perPage);

        // Transform stock history data
        $transformedStockHistory = $stockHistory->getCollection()->map(function ($history) {
            return [
                'id' => $history->id,
                'old_stock' => $history->old_stock,
                'new_stock' => $history->new_stock,
                'change_amount' => $history->change_amount,
                'change_direction' => $history->change_direction,
                'absolute_change' => $history->absolute_change,
                'change_type' => $history->change_type,
                'reference_id' => $history->reference_id,
                'reference_type' => $history->reference_type,
                'notes' => $history->notes,
                'changed_by' => $history->changedBy ? [
                    'id' => $history->changedBy->id,
                    'name' => $history->changedBy->name,
                    'email' => $history->changedBy->email,
                ] : null,
                'changed_at' => $history->changed_at->toIso8601String(),
            ];
        });

        return response()->json([
            'data' => $transformedStockHistory,
            'pagination' => [
                'current_page' => $stockHistory->currentPage(),
                'last_page' => $stockHistory->lastPage(),
                'per_page' => $stockHistory->perPage(),
                'total' => $stockHistory->total(),
            ],
            'meta' => [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'current_stock' => $product->stock,
            ],
        ]);
    }
}