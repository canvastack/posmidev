<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BOM\AnalyticsFilterRequest;
use Src\Pms\Core\Services\StockAlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * BOMAlertController
 * 
 * Handles BOM-specific stock alert endpoints
 * Provides active alerts, predictive alerts, reorder recommendations, and alert dashboard
 * 
 * @package App\Http\Controllers\Api
 */
class BOMAlertController extends Controller
{
    public function __construct(
        private StockAlertService $alertService
    ) {}

    /**
     * Get active stock alerts
     * 
     * Returns flat array of alerts for frontend compatibility
     * Service returns: { alerts: [...], total_alerts: N, severity_summary: {...}, generated_at: "..." }
     * Frontend expects: ApiResponse<StockAlert[]>
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function active(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $serviceResponse = $this->alertService->getActiveAlerts($tenantId);

        // Transform: Extract alerts array from service response object
        // Frontend expects flat array, service returns nested object
        $alerts = $serviceResponse['alerts'] ?? [];

        return response()->json([
            'success' => true,
            'data' => $alerts,
            'meta' => [
                'total_alerts' => $serviceResponse['total_alerts'] ?? count($alerts),
                'severity_summary' => $serviceResponse['severity_summary'] ?? [],
                'generated_at' => $serviceResponse['generated_at'] ?? now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get predictive stock alerts
     * 
     * Returns flat array of predictive alerts for frontend compatibility
     * Service returns: { predictive_alerts: [...], total_alerts: N, forecast_period_days: 7, ... }
     * Frontend expects: ApiResponse<PredictiveAlert[]>
     * 
     * @param AnalyticsFilterRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function predictive(AnalyticsFilterRequest $request, string $tenantId): JsonResponse
    {
        $forecastDays = (int) $request->input('forecast_days', 7);
        
        $serviceResponse = $this->alertService->getPredictiveAlerts($tenantId, $forecastDays);

        // Transform: Extract predictive_alerts array from service response object
        $alerts = $serviceResponse['predictive_alerts'] ?? [];

        return response()->json([
            'success' => true,
            'data' => $alerts,
            'meta' => [
                'total_alerts' => $serviceResponse['total_alerts'] ?? count($alerts),
                'forecast_period_days' => $serviceResponse['forecast_period_days'] ?? $forecastDays,
                'based_on_usage_days' => $serviceResponse['based_on_usage_days'] ?? 30,
                'generated_at' => $serviceResponse['generated_at'] ?? now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get reorder recommendations
     * 
     * Returns flat array of recommendations for frontend compatibility
     * Service returns: { recommendations: [...], total_materials: N, total_estimated_cost: 1234.56, ... }
     * Frontend expects: ApiResponse<ReorderRecommendation[]>
     * 
     * @param AnalyticsFilterRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function reorderRecommendations(AnalyticsFilterRequest $request, string $tenantId): JsonResponse
    {
        $targetDaysOfStock = (int) $request->input('target_days_of_stock', 30);
        
        $serviceResponse = $this->alertService->getReorderRecommendations($tenantId, $targetDaysOfStock);

        // Transform: Extract recommendations array from service response object
        $recommendations = $serviceResponse['recommendations'] ?? [];

        return response()->json([
            'success' => true,
            'data' => $recommendations,
            'meta' => [
                'total_materials' => $serviceResponse['total_materials'] ?? count($recommendations),
                'total_estimated_cost' => $serviceResponse['total_estimated_cost'] ?? 0,
                'target_days_of_stock' => $serviceResponse['target_days_of_stock'] ?? $targetDaysOfStock,
                'priority_summary' => $serviceResponse['priority_summary'] ?? [],
                'generated_at' => $serviceResponse['generated_at'] ?? now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get alert dashboard summary
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function dashboard(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $dashboard = $this->alertService->getAlertDashboard($tenantId);

        return response()->json([
            'success' => true,
            'data' => $dashboard,
        ]);
    }
}