<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Carbon\Carbon;

/**
 * ReportingService
 * 
 * Service for generating comprehensive reports and analytics
 * Combines data from multiple services for executive dashboards
 * 
 * @package Src\Pms\Core\Services
 */
class ReportingService
{
    private MaterialAnalyticsService $analyticsService;
    private MaterialCostTrackingService $costService;
    private StockAlertService $alertService;
    private InventoryCalculationService $calculationService;

    public function __construct()
    {
        $this->analyticsService = new MaterialAnalyticsService();
        $this->costService = new MaterialCostTrackingService();
        $this->alertService = new StockAlertService();
        $this->calculationService = new InventoryCalculationService();
    }

    /**
     * Generate executive dashboard report
     *
     * @param string $tenantId
     * @return array
     */
    public function generateExecutiveDashboard(string $tenantId): array
    {
        $stockSummary = $this->analyticsService->getStockStatusSummary($tenantId);
        $inventoryValue = $this->costService->calculateInventoryValue($tenantId, true);
        $alerts = $this->alertService->getActiveAlerts($tenantId);
        $productionCapacity = $this->getProductionCapacitySummary($tenantId);

        return [
            'report_type' => 'Executive Dashboard',
            'tenant_id' => $tenantId,
            'generated_at' => now()->toIso8601String(),
            'key_metrics' => [
                'total_materials' => $stockSummary['total_materials'],
                'total_inventory_value' => $inventoryValue['total_inventory_value'],
                'active_alerts' => $alerts['total_alerts'],
                'critical_alerts' => $alerts['severity_summary']['critical'],
                'production_ready_products' => $productionCapacity['ready_count'],
            ],
            'stock_status' => $stockSummary['stock_status'],
            'inventory_value_by_category' => $inventoryValue['value_by_category'],
            'top_alerts' => array_slice($alerts['alerts'], 0, 5),
            'production_capacity' => $productionCapacity,
        ];
    }

    /**
     * Generate material usage report
     *
     * @param string $tenantId
     * @param int $days
     * @return array
     */
    public function generateMaterialUsageReport(string $tenantId, int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        $transactions = InventoryTransaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->with('material')
            ->get();

        // Group by material
        $byMaterial = $transactions->groupBy('material_id')->map(function ($txns) use ($days) {
            $material = $txns->first()->material;

            $increases = $txns->where('quantity_change', '>', 0);
            $decreases = $txns->where('quantity_change', '<', 0);

            return [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'sku' => $material->sku,
                'category' => $material->category,
                'unit' => $material->unit,
                'opening_stock' => round($txns->first()->quantity_before, 3),
                'closing_stock' => round($material->stock_quantity, 3),
                'total_received' => round($increases->sum('quantity_change'), 3),
                'total_consumed' => round(abs($decreases->sum('quantity_change')), 3),
                'net_change' => round($material->stock_quantity - $txns->first()->quantity_before, 3),
                'transaction_count' => $txns->count(),
                'average_daily_usage' => $days > 0 ? round(abs($decreases->sum('quantity_change')) / $days, 3) : 0,
            ];
        })->sortByDesc('total_consumed')->values();

        return [
            'report_type' => 'Material Usage Report',
            'period' => [
                'from' => $startDate->toIso8601String(),
                'to' => now()->toIso8601String(),
                'days' => $days,
            ],
            'summary' => [
                'total_materials_used' => $byMaterial->count(),
                'total_transactions' => $transactions->count(),
                'total_quantity_consumed' => round($byMaterial->sum('total_consumed'), 3),
                'total_quantity_received' => round($byMaterial->sum('total_received'), 3),
            ],
            'material_details' => $byMaterial,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Generate recipe costing report
     *
     * @param string $tenantId
     * @return array
     */
    public function generateRecipeCostingReport(string $tenantId): array
    {
        $recipes = Recipe::forTenant($tenantId)
            ->where('is_active', true)
            ->with(['recipeMaterials.material', 'product'])
            ->get();

        $recipeData = $recipes->map(function ($recipe) {
            $totalCost = $recipe->calculateTotalCost();
            
            $components = $recipe->recipeMaterials->map(function ($component) use ($totalCost) {
                $componentCost = $component->effective_quantity * $component->material->unit_cost;
                
                return [
                    'material_name' => $component->material->name,
                    'quantity_required' => $component->quantity_required,
                    'waste_percentage' => $component->waste_percentage,
                    'effective_quantity' => $component->effective_quantity,
                    'unit' => $component->unit,
                    'unit_cost' => $component->material->unit_cost,
                    'total_cost' => round($componentCost, 2),
                    'cost_percentage' => $totalCost > 0 ? round(($componentCost / $totalCost) * 100, 2) : 0,
                ];
            })->sortByDesc('total_cost')->values();

            return [
                'recipe_id' => $recipe->id,
                'recipe_name' => $recipe->name,
                'product_id' => $recipe->product_id,
                'product_name' => $recipe->product->name ?? null,
                'yield_quantity' => $recipe->yield_quantity,
                'yield_unit' => $recipe->yield_unit,
                'total_cost' => round($totalCost, 2),
                'cost_per_unit' => round($totalCost / $recipe->yield_quantity, 2),
                'component_count' => $recipe->recipeMaterials->count(),
                'components' => $components,
                'most_expensive_component' => $components->first(),
            ];
        })->sortByDesc('total_cost')->values();

        return [
            'report_type' => 'Recipe Costing Report',
            'summary' => [
                'total_active_recipes' => $recipes->count(),
                'average_recipe_cost' => round($recipeData->avg('total_cost'), 2),
                'highest_cost_recipe' => $recipeData->first() ? ['recipe_name' => $recipeData->first()['recipe_name'], 'total_cost' => $recipeData->first()['total_cost']] : null,
                'lowest_cost_recipe' => $recipeData->last() ? ['recipe_name' => $recipeData->last()['recipe_name'], 'total_cost' => $recipeData->last()['total_cost']] : null,
            ],
            'recipes' => $recipeData,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Generate stock movement report
     *
     * @param string $tenantId
     * @param int $days
     * @return array
     */
    public function generateStockMovementReport(string $tenantId, int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        $transactions = InventoryTransaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->with('material')
            ->orderBy('created_at', 'desc')
            ->get();

        // By transaction type
        $byType = $transactions->groupBy('transaction_type')->map(function ($txns, $type) {
            return [
                'type' => $type,
                'count' => $txns->count(),
                'total_quantity' => round($txns->sum('quantity_change'), 3),
            ];
        })->values();

        // By reason
        $byReason = $transactions->groupBy('reason')->map(function ($txns, $reason) {
            return [
                'reason' => $reason,
                'count' => $txns->count(),
                'total_quantity' => round($txns->sum('quantity_change'), 3),
            ];
        })->values();

        // Daily movement
        $dailyMovement = $transactions->groupBy(function ($txn) {
            return $txn->created_at->format('Y-m-d');
        })->map(function ($txns, $date) {
            return [
                'date' => $date,
                'transaction_count' => $txns->count(),
                'total_increases' => round($txns->where('quantity_change', '>', 0)->sum('quantity_change'), 3),
                'total_decreases' => round(abs($txns->where('quantity_change', '<', 0)->sum('quantity_change')), 3),
                'net_change' => round($txns->sum('quantity_change'), 3),
            ];
        })->values();

        return [
            'report_type' => 'Stock Movement Report',
            'period' => [
                'from' => $startDate->toIso8601String(),
                'to' => now()->toIso8601String(),
                'days' => $days,
            ],
            'summary' => [
                'total_transactions' => $transactions->count(),
                'total_materials_affected' => $transactions->pluck('material_id')->unique()->count(),
                'net_stock_change' => round($transactions->sum('quantity_change'), 3),
            ],
            'by_transaction_type' => $byType,
            'by_reason' => $byReason,
            'daily_movement' => $dailyMovement,
            'recent_transactions' => $transactions->take(20)->map(function ($txn) {
                return [
                    'date' => $txn->created_at->format('Y-m-d H:i:s'),
                    'material_name' => $txn->material->name,
                    'type' => $txn->transaction_type,
                    'reason' => $txn->reason,
                    'quantity_change' => $txn->quantity_change,
                    'quantity_after' => $txn->quantity_after,
                    'notes' => $txn->notes,
                ];
            }),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Generate production efficiency report
     *
     * @param string $tenantId
     * @return array
     */
    public function generateProductionEfficiencyReport(string $tenantId): array
    {
        $bomProducts = Product::forTenant($tenantId)
            ->where('inventory_management_type', 'bom')
            ->whereHas('activeRecipe')
            ->with(['activeRecipe'])
            ->get();

        $efficiencyData = [];

        foreach ($bomProducts as $product) {
            try {
                $availability = $this->calculationService->calculateAvailableQuantity($product->id, $tenantId);
                
                $recipe = $product->activeRecipe;
                $totalCost = $recipe->calculateTotalCost();
                $wasteComponents = $recipe->recipeMaterials->where('waste_percentage', '>', 0)->count();
                $avgWaste = $recipe->recipeMaterials->avg('waste_percentage');

                $efficiencyData[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'recipe_name' => $recipe->name,
                    'production_capacity' => $availability['available_quantity'],
                    'recipe_cost' => round($totalCost, 2),
                    'cost_per_unit' => round($totalCost / $recipe->yield_quantity, 2),
                    'component_count' => $recipe->recipeMaterials->count(),
                    'components_with_waste' => $wasteComponents,
                    'average_waste_percentage' => round($avgWaste, 2),
                    'bottleneck_material' => $availability['bottleneck_material']['material_name'] ?? null,
                    'efficiency_score' => $this->calculateEfficiencyScore($availability['available_quantity'], $avgWaste),
                ];
            } catch (\Exception $e) {
                // Skip products with errors
                continue;
            }
        }

        // Sort by efficiency score
        usort($efficiencyData, fn($a, $b) => $b['efficiency_score'] <=> $a['efficiency_score']);

        return [
            'report_type' => 'Production Efficiency Report',
            'summary' => [
                'total_bom_products' => count($efficiencyData),
                'average_efficiency_score' => round(collect($efficiencyData)->avg('efficiency_score'), 2),
                'products_at_full_capacity' => collect($efficiencyData)->where('production_capacity', '>', 100)->count(),
                'products_with_waste' => collect($efficiencyData)->where('average_waste_percentage', '>', 0)->count(),
            ],
            'efficiency_data' => $efficiencyData,
            'top_efficient_products' => array_slice($efficiencyData, 0, 5),
            'least_efficient_products' => array_slice(array_reverse($efficiencyData), 0, 5),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Generate comprehensive inventory report
     *
     * @param string $tenantId
     * @return array
     */
    public function generateComprehensiveInventoryReport(string $tenantId): array
    {
        return [
            'report_type' => 'Comprehensive Inventory Report',
            'tenant_id' => $tenantId,
            'generated_at' => now()->toIso8601String(),
            'executive_summary' => $this->generateExecutiveDashboard($tenantId),
            'stock_status' => $this->analyticsService->getStockStatusSummary($tenantId),
            'cost_analysis' => $this->costService->calculateInventoryValue($tenantId, true),
            'active_alerts' => $this->alertService->getActiveAlerts($tenantId),
            'predictive_alerts' => $this->alertService->getPredictiveAlerts($tenantId, 7),
            'categories' => $this->analyticsService->getMaterialsByCategory($tenantId),
        ];
    }

    /**
     * Get production capacity summary
     *
     * @param string $tenantId
     * @return array
     */
    private function getProductionCapacitySummary(string $tenantId): array
    {
        $bomProducts = Product::forTenant($tenantId)
            ->where('inventory_management_type', 'bom')
            ->whereHas('activeRecipe')
            ->get();

        $readyCount = 0;
        $limitedCount = 0;
        $zeroCount = 0;

        foreach ($bomProducts as $product) {
            try {
                $availability = $this->calculationService->calculateAvailableQuantity($product->id, $tenantId);
                $capacity = $availability['available_quantity'];

                if ($capacity > 50) {
                    $readyCount++;
                } elseif ($capacity > 0) {
                    $limitedCount++;
                } else {
                    $zeroCount++;
                }
            } catch (\Exception $e) {
                continue;
            }
        }

        return [
            'total_bom_products' => $bomProducts->count(),
            'ready_count' => $readyCount,
            'limited_count' => $limitedCount,
            'zero_capacity_count' => $zeroCount,
        ];
    }

    /**
     * Calculate efficiency score
     *
     * @param int $capacity
     * @param float $avgWaste
     * @return float
     */
    private function calculateEfficiencyScore(int $capacity, float $avgWaste): float
    {
        // Simple efficiency score: capacity factor (70%) + waste factor (30%)
        $capacityScore = min($capacity / 100, 1.0) * 70;
        $wasteScore = max(0, (1 - ($avgWaste / 100))) * 30;

        return round($capacityScore + $wasteScore, 2);
    }

    /**
     * Export report to array format (for CSV/Excel)
     *
     * @param string $reportType
     * @param array $reportData
     * @return array ['headers' => [], 'rows' => []]
     */
    public function exportReportToArray(string $reportType, array $reportData): array
    {
        // Generic export formatter
        switch ($reportType) {
            case 'executive_dashboard':
                return $this->formatExecutiveDashboardExport($reportData);
            case 'material_usage':
                return $this->formatMaterialUsageExport($reportData);
            case 'recipe_costing':
                return $this->formatRecipeCostingExport($reportData);
            default:
                return [
                    'headers' => ['Report Type', 'Generated At'],
                    'rows' => [[$reportType, now()->toIso8601String()]],
                ];
        }
    }

    /**
     * Format executive dashboard for export
     *
     * @param array $data
     * @return array
     */
    private function formatExecutiveDashboardExport(array $data): array
    {
        $headers = ['Metric', 'Value'];
        $rows = [
            ['Total Materials', $data['key_metrics']['total_materials']],
            ['Total Inventory Value', '$' . number_format($data['key_metrics']['total_inventory_value'], 2)],
            ['Active Alerts', $data['key_metrics']['active_alerts']],
            ['Critical Alerts', $data['key_metrics']['critical_alerts']],
            ['Production Ready Products', $data['key_metrics']['production_ready_products']],
        ];

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * Format material usage for export
     *
     * @param array $data
     * @return array
     */
    private function formatMaterialUsageExport(array $data): array
    {
        $headers = ['Material', 'SKU', 'Category', 'Opening Stock', 'Received', 'Consumed', 'Closing Stock', 'Avg Daily Usage'];
        
        $rows = collect($data['material_details'])->map(function ($material) {
            return [
                $material['material_name'],
                $material['sku'] ?? '',
                $material['category'] ?? '',
                $material['opening_stock'],
                $material['total_received'],
                $material['total_consumed'],
                $material['closing_stock'],
                $material['average_daily_usage'],
            ];
        })->toArray();

        return ['headers' => $headers, 'rows' => $rows];
    }

    /**
     * Format recipe costing for export
     *
     * @param array $data
     * @return array
     */
    private function formatRecipeCostingExport(array $data): array
    {
        $headers = ['Recipe', 'Product', 'Yield', 'Total Cost', 'Cost Per Unit', 'Components'];
        
        $rows = collect($data['recipes'])->map(function ($recipe) {
            return [
                $recipe['recipe_name'],
                $recipe['product_name'] ?? '',
                $recipe['yield_quantity'] . ' ' . $recipe['yield_unit'],
                '$' . number_format($recipe['total_cost'], 2),
                '$' . number_format($recipe['cost_per_unit'], 2),
                $recipe['component_count'],
            ];
        })->toArray();

        return ['headers' => $headers, 'rows' => $rows];
    }
}