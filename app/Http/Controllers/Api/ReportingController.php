<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Src\Pms\Core\Services\ReportingService;
use App\Http\Requests\BOM\ReportExportRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * ReportingController
 * 
 * Handles reporting and export endpoints
 * Provides executive dashboard, material usage, recipe costing, stock movement, and production efficiency reports
 * 
 * @package App\Http\Controllers\Api
 */
class ReportingController extends Controller
{
    public function __construct(
        private ReportingService $reportingService
    ) {}

    /**
     * Get executive dashboard
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function executiveDashboard(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $dashboard = $this->reportingService->generateExecutiveDashboard($tenantId);

        return response()->json([
            'success' => true,
            'data' => $dashboard,
        ]);
    }

    /**
     * Get material usage report
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function materialUsage(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $days = (int) $request->input('days', 30);
        
        $report = $this->reportingService->generateMaterialUsageReport($tenantId, $days);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get recipe costing report
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function recipeCosting(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $report = $this->reportingService->generateRecipeCostingReport($tenantId);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get stock movement report
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function stockMovement(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $days = (int) $request->input('days', 30);
        
        $report = $this->reportingService->generateStockMovementReport($tenantId, $days);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get production efficiency report
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function productionEfficiency(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $report = $this->reportingService->generateProductionEfficiencyReport($tenantId);

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Export report to specified format
     * 
     * @param ReportExportRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function export(ReportExportRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', \Src\Pms\Infrastructure\Models\Material::class);

        $reportType = $request->input('report_type');
        $format = $request->input('format', 'json');
        
        // Generate report based on type
        $reportData = match ($reportType) {
            'executive_dashboard' => $this->reportingService->generateExecutiveDashboard($tenantId),
            'material_usage' => $this->reportingService->generateMaterialUsageReport($tenantId, (int) $request->input('days', 30)),
            'recipe_costing' => $this->reportingService->generateRecipeCostingReport($tenantId),
            'stock_movement' => $this->reportingService->generateStockMovementReport($tenantId, (int) $request->input('days', 30)),
            'production_efficiency' => $this->reportingService->generateProductionEfficiencyReport($tenantId),
            'comprehensive' => $this->reportingService->generateComprehensiveInventoryReport($tenantId),
            default => throw new \InvalidArgumentException("Invalid report type: {$reportType}"),
        };

        // Export to requested format
        $exportData = $this->reportingService->exportReportToArray($reportType, $reportData);

        return response()->json([
            'success' => true,
            'message' => 'Report exported successfully',
            'data' => [
                'report_type' => $reportType,
                'format' => $format,
                'generated_at' => now()->toIso8601String(),
                'report_data' => $exportData,
            ],
        ]);
    }
}