<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Services\TenantAnalyticsService;
use Src\Pms\Core\Services\ViewTrackingService;
use Src\Pms\Core\Services\SearchAnalyticsService;
use Src\Pms\Infrastructure\Models\Product;

/**
 * Tenant Analytics Controller
 * 
 * Provides tenant-wide analytics endpoints for dashboard and reporting.
 * Aggregates data across all products for business intelligence.
 * 
 * All endpoints require authentication and products.view permission.
 * All data is tenant-scoped for security.
 */
class TenantAnalyticsController extends Controller
{
    protected TenantAnalyticsService $analyticsService;
    protected ViewTrackingService $viewTrackingService;
    protected SearchAnalyticsService $searchAnalyticsService;
    
    public function __construct(
        TenantAnalyticsService $analyticsService,
        ViewTrackingService $viewTrackingService,
        SearchAnalyticsService $searchAnalyticsService
    ) {
        $this->analyticsService = $analyticsService;
        $this->viewTrackingService = $viewTrackingService;
        $this->searchAnalyticsService = $searchAnalyticsService;
    }
    
    /**
     * Get comprehensive analytics overview
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/overview
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function overview(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $overview = $this->analyticsService->getOverview(
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $overview,
        ]);
    }
    
    /**
     * Get top performing products
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/top-products
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function topProducts(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'metric' => 'nullable|in:revenue,quantity,profit,views',
            'limit' => 'nullable|integer|min:1|max:50',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $topProducts = $this->analyticsService->getTopProducts(
            $tenantId,
            $validated['metric'] ?? 'revenue',
            $validated['limit'] ?? 10,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $topProducts,
        ]);
    }
    
    /**
     * Get revenue breakdown by product
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/revenue-breakdown
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function revenueBreakdown(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $breakdown = $this->analyticsService->getRevenueBreakdown(
            $tenantId,
            $validated['limit'] ?? 10,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $breakdown,
        ]);
    }
    
    /**
     * Get profit analysis
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/profit-analysis
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function profitAnalysis(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $analysis = $this->analyticsService->getProfitAnalysis(
            $tenantId,
            $validated['limit'] ?? 10,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $analysis,
        ]);
    }
    
    /**
     * Get category performance
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/category-performance
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function categoryPerformance(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $performance = $this->analyticsService->getCategoryPerformance(
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $performance,
        ]);
    }
    
    /**
     * Get most viewed products
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/most-viewed
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function mostViewed(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $mostViewed = $this->viewTrackingService->getMostViewed(
            $tenantId,
            $validated['limit'] ?? 10,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $mostViewed,
        ]);
    }
    
    /**
     * Get popular search terms
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/search-terms
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function searchTerms(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $searches = $this->searchAnalyticsService->getPopularSearches(
            $tenantId,
            $validated['limit'] ?? 10,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $searches,
        ]);
    }
    
    /**
     * Get search trends
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/search-trends
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function searchTrends(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
            'group_by' => 'nullable|in:day,week,month',
        ]);
        
        $trends = $this->searchAnalyticsService->getSearchTrends(
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null,
            $validated['group_by'] ?? 'day'
        );
        
        return response()->json([
            'success' => true,
            'data' => $trends,
        ]);
    }
    
    /**
     * Get zero-result searches
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/zero-result-searches
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function zeroResultSearches(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:50',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $searches = $this->searchAnalyticsService->getZeroResultSearches(
            $tenantId,
            $validated['limit'] ?? 10,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $searches,
        ]);
    }
}