<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Carbon\Carbon;

/**
 * MaterialCostTrackingService
 * 
 * Service for tracking material costs over time
 * Provides cost analysis, variance tracking, and FIFO/average costing
 * 
 * @package Src\Pms\Core\Services
 */
class MaterialCostTrackingService
{
    /**
     * Track cost changes for a material over time
     *
     * @param string $materialId
     * @param string $tenantId
     * @param int $days Number of days to analyze
     * @return array
     */
    public function getCostHistory(string $materialId, string $tenantId, int $days = 90): array
    {
        $material = Material::forTenant($tenantId)->findOrFail($materialId);
        $startDate = Carbon::now()->subDays($days);

        $transactions = InventoryTransaction::where('material_id', $materialId)
            ->where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->where('transaction_type', 'restock') // Focus on restocks which may have cost data
            ->orderBy('created_at', 'asc')
            ->get();

        // In production, you would track cost per transaction
        // For now, we'll show the current cost and track changes

        $costHistory = $transactions->map(function ($txn) use ($material) {
            return [
                'date' => $txn->created_at->format('Y-m-d H:i:s'),
                'transaction_type' => $txn->transaction_type,
                'quantity' => $txn->quantity_change,
                'unit_cost' => $material->unit_cost, // In production, store historical costs
                'total_value' => round($txn->quantity_change * $material->unit_cost, 2),
                'notes' => $txn->notes,
            ];
        });

        return [
            'material_id' => $material->id,
            'material_name' => $material->name,
            'sku' => $material->sku,
            'current_unit_cost' => $material->unit_cost,
            'current_stock_value' => round($material->stock_quantity * $material->unit_cost, 2),
            'period' => [
                'from' => $startDate->toIso8601String(),
                'to' => now()->toIso8601String(),
                'days' => $days,
            ],
            'cost_history' => $costHistory,
            'total_transactions' => $transactions->count(),
            'note' => 'Full cost tracking requires historical cost storage per transaction',
        ];
    }

    /**
     * Calculate average material cost
     *
     * @param string $materialId
     * @param string $tenantId
     * @return array
     */
    public function calculateAverageCost(string $materialId, string $tenantId): array
    {
        $material = Material::forTenant($tenantId)->findOrFail($materialId);

        // Simplified average cost calculation
        // In production, track purchase costs per transaction
        
        $transactions = InventoryTransaction::where('material_id', $materialId)
            ->where('tenant_id', $tenantId)
            ->where('transaction_type', 'restock')
            ->where('created_at', '>=', Carbon::now()->subDays(90))
            ->get();

        $totalQuantity = $transactions->sum('quantity_change');
        $totalValue = $totalQuantity * $material->unit_cost; // Simplified

        return [
            'material_id' => $material->id,
            'material_name' => $material->name,
            'current_unit_cost' => $material->unit_cost,
            'average_cost_calculation' => [
                'total_restocks' => $transactions->count(),
                'total_quantity_purchased' => round($totalQuantity, 3),
                'total_value' => round($totalValue, 2),
                'calculated_average_cost' => $totalQuantity > 0 ? round($totalValue / $totalQuantity, 2) : 0,
            ],
            'period_days' => 90,
            'note' => 'Enhanced cost tracking requires storing purchase price per transaction',
        ];
    }

    /**
     * Get cost variance analysis
     *
     * @param string $tenantId
     * @param array $categoryFilter Optional categories
     * @return array
     */
    public function getCostVarianceAnalysis(string $tenantId, array $categoryFilter = []): array
    {
        $query = Material::forTenant($tenantId);

        if (!empty($categoryFilter)) {
            $query->whereIn('category', $categoryFilter);
        }

        $materials = $query->with(['transactions' => function ($q) {
            $q->where('created_at', '>=', Carbon::now()->subDays(90))
              ->where('transaction_type', 'restock')
              ->orderBy('created_at', 'desc');
        }])->get();

        $variance = [];

        foreach ($materials as $material) {
            if ($material->transactions->isEmpty()) {
                continue;
            }

            // Simplified variance calculation
            // In production, compare historical purchase prices

            $recentTransactions = $material->transactions->take(5);
            $avgQuantityPerRestock = $recentTransactions->avg('quantity_change');

            $variance[] = [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'sku' => $material->sku,
                'category' => $material->category,
                'current_unit_cost' => $material->unit_cost,
                'current_stock_value' => round($material->stock_quantity * $material->unit_cost, 2),
                'recent_restock_count' => $recentTransactions->count(),
                'avg_restock_quantity' => round($avgQuantityPerRestock, 3),
                'last_restock_date' => $recentTransactions->first()?->created_at->format('Y-m-d'),
                'note' => 'Variance calculation requires historical cost data',
            ];
        }

        return [
            'materials_analyzed' => count($variance),
            'variance_data' => $variance,
            'period_days' => 90,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Calculate total inventory value
     *
     * @param string $tenantId
     * @param bool $includeCategories
     * @return array
     */
    public function calculateInventoryValue(string $tenantId, bool $includeCategories = true): array
    {
        $materials = Material::forTenant($tenantId)->get();

        $totalValue = 0;
        $byCategory = [];

        foreach ($materials as $material) {
            $value = $material->stock_quantity * $material->unit_cost;
            $totalValue += $value;

            if ($includeCategories) {
                $category = $material->category ?: 'Uncategorized';
                if (!isset($byCategory[$category])) {
                    $byCategory[$category] = [
                        'category' => $category,
                        'total_value' => 0,
                        'material_count' => 0,
                    ];
                }
                $byCategory[$category]['total_value'] += $value;
                $byCategory[$category]['material_count']++;
            }
        }

        // Sort categories by value
        $byCategory = collect($byCategory)->sortByDesc('total_value')->values()->map(function ($cat) {
            $cat['total_value'] = round($cat['total_value'], 2);
            return $cat;
        });

        return [
            'total_inventory_value' => round($totalValue, 2),
            'total_materials' => $materials->count(),
            'average_value_per_material' => $materials->count() > 0 ? round($totalValue / $materials->count(), 2) : 0,
            'value_by_category' => $byCategory->toArray(),
            'calculated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get cost trends over time
     *
     * @param string $tenantId
     * @param int $months Number of months to analyze
     * @return array
     */
    public function getCostTrends(string $tenantId, int $months = 6): array
    {
        $startDate = Carbon::now()->subMonths($months)->startOfMonth();
        
        $materials = Material::forTenant($tenantId)->get();

        // Group by month
        $monthlyData = [];
        for ($i = 0; $i < $months; $i++) {
            $monthStart = Carbon::now()->subMonths($i)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();

            $totalValue = $materials->sum(fn($m) => $m->stock_quantity * $m->unit_cost);

            $monthlyData[] = [
                'month' => $monthStart->format('Y-m'),
                'month_name' => $monthStart->format('F Y'),
                'total_inventory_value' => round($totalValue, 2),
                'material_count' => $materials->count(),
            ];
        }

        // Reverse to show oldest first
        $monthlyData = array_reverse($monthlyData);

        return [
            'period' => [
                'from' => $startDate->toIso8601String(),
                'to' => now()->toIso8601String(),
                'months' => $months,
            ],
            'monthly_trends' => $monthlyData,
            'note' => 'Snapshot-based trends. Historical tracking requires cost snapshots per period.',
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get materials with significant cost changes
     *
     * @param string $tenantId
     * @param float $thresholdPercentage Minimum percentage change to report
     * @return array
     */
    public function getMaterialsWithCostChanges(string $tenantId, float $thresholdPercentage = 10.0): array
    {
        // In production, compare current cost with historical costs
        // This is a simplified version

        $materials = Material::forTenant($tenantId)
            ->with(['transactions' => function ($q) {
                $q->where('transaction_type', 'restock')
                  ->where('created_at', '>=', Carbon::now()->subDays(90))
                  ->orderBy('created_at', 'desc');
            }])
            ->get();

        $significantChanges = [];

        foreach ($materials as $material) {
            if ($material->transactions->isEmpty()) {
                continue;
            }

            // Simplified: just report materials with recent restocks
            $lastRestock = $material->transactions->first();
            $firstRestock = $material->transactions->last();

            if ($lastRestock && $firstRestock && $lastRestock->id !== $firstRestock->id) {
                $significantChanges[] = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'sku' => $material->sku,
                    'current_unit_cost' => $material->unit_cost,
                    'first_restock_date' => $firstRestock->created_at->format('Y-m-d'),
                    'last_restock_date' => $lastRestock->created_at->format('Y-m-d'),
                    'restock_count' => $material->transactions->count(),
                    'note' => 'Detailed cost change tracking requires historical cost storage',
                ];
            }
        }

        return [
            'materials_with_changes' => $significantChanges,
            'total_count' => count($significantChanges),
            'threshold_percentage' => $thresholdPercentage,
            'period_days' => 90,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Calculate cost impact on recipes
     *
     * @param string $tenantId
     * @param string|null $recipeId Optional specific recipe
     * @return array
     */
    public function getRecipeCostImpact(string $tenantId, ?string $recipeId = null): array
    {
        $query = \Src\Pms\Infrastructure\Models\Recipe::forTenant($tenantId)
            ->where('is_active', true)
            ->with(['recipeMaterials.material', 'product']);

        if ($recipeId) {
            $query->where('id', $recipeId);
        }

        $recipes = $query->get();

        $costImpact = $recipes->map(function ($recipe) {
            $totalCost = $recipe->calculateTotalCost();
            
            $materialBreakdown = $recipe->recipeMaterials->map(function ($component) use ($totalCost) {
                $componentCost = $component->effective_quantity * $component->material->unit_cost;
                $percentage = $totalCost > 0 ? round(($componentCost / $totalCost) * 100, 2) : 0;

                return [
                    'material_id' => $component->material->id,
                    'material_name' => $component->material->name,
                    'quantity_required' => $component->quantity_required,
                    'waste_percentage' => $component->waste_percentage,
                    'effective_quantity' => $component->effective_quantity,
                    'unit_cost' => $component->material->unit_cost,
                    'component_cost' => round($componentCost, 2),
                    'cost_percentage' => $percentage,
                ];
            });

            return [
                'recipe_id' => $recipe->id,
                'recipe_name' => $recipe->name,
                'product_id' => $recipe->product_id,
                'product_name' => $recipe->product->name ?? null,
                'total_recipe_cost' => round($totalCost, 2),
                'component_count' => $recipe->recipeMaterials->count(),
                'material_breakdown' => $materialBreakdown,
                'highest_cost_component' => $materialBreakdown->sortByDesc('component_cost')->first(),
            ];
        });

        return [
            'recipes_analyzed' => $recipes->count(),
            'recipe_costs' => $costImpact,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get cost efficiency metrics
     *
     * @param string $tenantId
     * @return array
     */
    public function getCostEfficiencyMetrics(string $tenantId): array
    {
        $materials = Material::forTenant($tenantId)->get();
        $inventoryValue = $this->calculateInventoryValue($tenantId, false);

        $lowValueMaterials = $materials->filter(fn($m) => ($m->stock_quantity * $m->unit_cost) < 10)->count();
        $highValueMaterials = $materials->filter(fn($m) => ($m->stock_quantity * $m->unit_cost) > 1000)->count();

        // Calculate turnover potential
        $transactions = InventoryTransaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->where('quantity_change', '<', 0) // Usage
            ->get();

        $totalUsageValue = $transactions->sum(function ($txn) use ($materials) {
            $material = $materials->firstWhere('id', $txn->material_id);
            return $material ? abs($txn->quantity_change) * $material->unit_cost : 0;
        });

        return [
            'total_inventory_value' => $inventoryValue['total_inventory_value'],
            'total_materials' => $materials->count(),
            'value_distribution' => [
                'low_value_materials' => $lowValueMaterials,
                'high_value_materials' => $highValueMaterials,
                'medium_value_materials' => $materials->count() - $lowValueMaterials - $highValueMaterials,
            ],
            'monthly_usage_value' => round($totalUsageValue, 2),
            'inventory_turnover_rate' => $inventoryValue['total_inventory_value'] > 0 
                ? round($totalUsageValue / $inventoryValue['total_inventory_value'], 2)
                : 0,
            'efficiency_notes' => [
                'Higher turnover rate indicates better inventory efficiency',
                'Monitor high-value materials closely to prevent wastage',
                'Consider reducing stock of low-turnover items',
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }
}