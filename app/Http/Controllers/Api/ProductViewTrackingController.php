<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Services\ViewTrackingService;
use Src\Pms\Infrastructure\Models\Product;

/**
 * Product View Tracking Controller
 * 
 * Handles tracking of product page views for analytics.
 * Supports both authenticated and anonymous tracking.
 */
class ProductViewTrackingController extends Controller
{
    protected ViewTrackingService $viewTrackingService;
    
    public function __construct(ViewTrackingService $viewTrackingService)
    {
        $this->viewTrackingService = $viewTrackingService;
    }
    
    /**
     * Track a product view
     * 
     * POST /api/v1/tenants/{tenantId}/products/{productId}/track-view
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function trackView(Request $request, string $tenantId, string $productId): JsonResponse
    {
        // Verify product exists and belongs to tenant
        $product = Product::where('tenant_id', $tenantId)
            ->where('id', $productId)
            ->firstOrFail();
        
        // Get user ID if authenticated (optional)
        $userId = $request->user()?->id;
        
        // Track view
        $view = $this->viewTrackingService->trackView(
            $productId,
            $tenantId,
            $userId,
            [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]
        );
        
        return response()->json([
            'success' => true,
            'message' => 'View tracked successfully',
        ], 201);
    }
    
    /**
     * Get view statistics for a product
     * 
     * GET /api/v1/tenants/{tenantId}/products/{productId}/view-stats
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function viewStats(Request $request, string $tenantId, string $productId): JsonResponse
    {
        // Check permission
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
        ]);
        
        $stats = $this->viewTrackingService->getViewStats(
            $productId,
            $tenantId,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );
        
        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
    
    /**
     * Get view trends for a product
     * 
     * GET /api/v1/tenants/{tenantId}/products/{productId}/view-trends
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function viewTrends(Request $request, string $tenantId, string $productId): JsonResponse
    {
        // Check permission
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
            'group_by' => 'nullable|in:day,week,month',
        ]);
        
        $trends = $this->viewTrackingService->getViewTrends(
            $productId,
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
}