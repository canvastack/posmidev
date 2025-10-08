<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Services\SearchAnalyticsService;
use Src\Pms\Infrastructure\Models\Product;

/**
 * Search Analytics Controller
 * 
 * Handles tracking of product searches and provides search analytics.
 * Helps understand what users are looking for.
 */
class SearchAnalyticsController extends Controller
{
    protected SearchAnalyticsService $searchAnalyticsService;
    
    public function __construct(SearchAnalyticsService $searchAnalyticsService)
    {
        $this->searchAnalyticsService = $searchAnalyticsService;
    }
    
    /**
     * Track a product search
     * 
     * POST /api/v1/tenants/{tenantId}/analytics/track-search
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function trackSearch(Request $request, string $tenantId): JsonResponse
    {
        $validated = $request->validate([
            'search_term' => 'required|string|max:255',
            'results_count' => 'required|integer|min:0',
        ]);
        
        // Get user ID if authenticated (optional)
        $userId = $request->user()?->id;
        
        // Track search
        $search = $this->searchAnalyticsService->trackSearch(
            $validated['search_term'],
            $tenantId,
            $validated['results_count'],
            $userId,
            [
                'ip_address' => $request->ip(),
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'Search tracked successfully',
        ], 201);
    }
    
    /**
     * Get search statistics summary
     * 
     * GET /api/v1/tenants/{tenantId}/analytics/search-stats
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function searchStats(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $stats = $this->searchAnalyticsService->getSearchStats(
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}