<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Services\ProductAnalyticsService;
use Src\Pms\Infrastructure\Models\Product;

/**
 * Product Analytics Controller
 * 
 * Provides product-level analytics endpoints including:
 * - Sales metrics and trends
 * - Stock metrics and movements
 * - Profit analysis
 * - Variant performance comparison
 * - Combined overview
 * 
 * All endpoints are tenant-scoped and require products.view permission
 */
class ProductAnalyticsController extends Controller
{
    protected ProductAnalyticsService $analyticsService;
    
    public function __construct(ProductAnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }
    
    /**
     * Get sales metrics for a product
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function salesMetrics(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $metrics = $this->analyticsService->getSalesMetrics(
            $productId,
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }
    
    /**
     * Get stock metrics for a product
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function stockMetrics(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $metrics = $this->analyticsService->getStockMetrics(
            $productId,
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }
    
    /**
     * Get profit metrics for a product
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function profitMetrics(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $metrics = $this->analyticsService->getProfitMetrics(
            $productId,
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $metrics,
        ]);
    }
    
    /**
     * Get variant performance comparison
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function variantPerformance(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);
        
        $variants = $this->analyticsService->getVariantPerformance(
            $productId,
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null,
            $validated['limit'] ?? 10
        );
        
        return response()->json([
            'success' => true,
            'data' => $variants,
        ]);
    }
    
    /**
     * Get combined analytics overview
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function overview(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $overview = $this->analyticsService->getOverview(
            $productId,
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $overview,
        ]);
    }
}