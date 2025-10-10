<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Src\Pms\Core\Services\MaterialAnalyticsService;
use App\Http\Requests\BOM\AnalyticsFilterRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * MaterialAnalyticsController
 * 
 * Handles material analytics and insights endpoints
 * Provides stock status, category analysis, usage trends, cost analysis, and turnover rates
 * 
 * @package App\Http\Controllers\Api
 */
class MaterialAnalyticsController extends Controller
{
    public function __construct(
        private MaterialAnalyticsService $analyticsService
    ) {}

    /**
     * Get stock status summary
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function stockStatus(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $summary = $this->analyticsService->getStockStatusSummary($tenantId);

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * Get materials grouped by category with statistics
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function categories(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $result = $this->analyticsService->getMaterialsByCategory($tenantId);
        
        // Extract the categories array to match frontend API contract
        // Frontend expects: ApiResponse<CategorySummary[]>
        // Transform service data to match CategorySummary interface
        $categories = collect($result['categories'])->map(function ($cat) {
            return [
                'category' => $cat['category'],
                'material_count' => $cat['total_materials'], // Map field name
                'total_value' => $cat['total_stock_value'], // Map field name
                'low_stock_count' => $cat['low_stock_count'],
            ];
        })->toArray();

        return response()->json([
            'success' => true,
            'data' => $categories,
        ]);
    }

    /**
     * Get material usage trends
     * 
     * @param AnalyticsFilterRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function usageTrends(AnalyticsFilterRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $days = (int) $request->input('days', 30);
        
        // Get transaction trends
        $result = $this->analyticsService->getTransactionTrends($tenantId, $days);
        
        // Extract daily trends and transform to match UsageTrend interface
        // Frontend expects: ApiResponse<UsageTrend[]>
        // UsageTrend: { date, total_usage, total_cost, transaction_count }
        $trends = collect($result['daily_trends'])->map(function ($trend) {
            return [
                'date' => $trend['date'],
                'total_usage' => $trend['total_increase'] ?? 0, // Map increase as usage
                'total_cost' => 0, // Transaction doesn't track cost, set to 0
                'transaction_count' => $trend['transaction_count'],
            ];
        })->toArray();
        
        return response()->json([
            'success' => true,
            'data' => $trends,
        ]);
    }

    /**
     * Get cost analysis by category
     * 
     * @param AnalyticsFilterRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function costAnalysis(AnalyticsFilterRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $categoryFilter = $request->input('categories', []);
        
        $analysis = $this->analyticsService->getCostAnalysis($tenantId, $categoryFilter);

        return response()->json([
            'success' => true,
            'data' => $analysis,
        ]);
    }

    /**
     * Get inventory turnover rate
     * 
     * @param AnalyticsFilterRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function turnoverRate(AnalyticsFilterRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $days = (int) $request->input('days', 30);
        
        $turnover = $this->analyticsService->getInventoryTurnoverRate($tenantId, $days);

        return response()->json([
            'success' => true,
            'data' => $turnover,
        ]);
    }
}