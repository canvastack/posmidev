<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Carbon\Carbon;

/**
 * MaterialAnalyticsService
 * 
 * Service for material analytics and insights
 * Provides stock analysis, usage patterns, cost analysis, and trends
 * 
 * @package Src\Pms\Core\Services
 */
class MaterialAnalyticsService
{
    /**
     * Get stock status summary for tenant
     *
     * @param string $tenantId
     * @return array
     */
    public function getStockStatusSummary(string $tenantId): array
    {
        $materials = Material::forTenant($tenantId)->get();

        $totalMaterials = $materials->count();
        
        // Separate critical from low stock (critical = qty <= min_stock / 2)
        $outOfStock = $materials->filter(fn($m) => $m->stock_quantity <= 0)->count();
        $critical = $materials->filter(fn($m) => 
            $m->stock_quantity > 0 && 
            $m->min_stock_level > 0 && 
            $m->stock_quantity <= ($m->min_stock_level / 2)
        )->count();
        $lowStock = $materials->filter(fn($m) => 
            $m->is_low_stock && 
            $m->stock_quantity > 0 && 
            !($m->min_stock_level > 0 && $m->stock_quantity <= ($m->min_stock_level / 2))
        )->count();
        $normal = $totalMaterials - $lowStock - $critical - $outOfStock;

        $totalValue = $materials->sum(fn($m) => $m->stock_quantity * $m->unit_cost);

        // Match frontend StockStatusSummary interface (flat structure)
        return [
            'total_materials' => $totalMaterials,
            'normal_stock' => $normal,
            'low_stock' => $lowStock,
            'critical_stock' => $critical,
            'out_of_stock' => $outOfStock,
            'total_value' => round($totalValue, 2),
        ];
    }

    /**
     * Get materials by category with statistics
     *
     * @param string $tenantId
     * @return array
     */
    public function getMaterialsByCategory(string $tenantId): array
    {
        $materials = Material::forTenant($tenantId)->get();

        $categorized = $materials->groupBy('category')->map(function ($items, $category) {
            $totalValue = $items->sum(fn($m) => $m->stock_quantity * $m->unit_cost);
            $lowStock = $items->filter(fn($m) => $m->is_low_stock)->count();

            return [
                'category' => $category ?: 'Uncategorized',
                'total_materials' => $items->count(),
                'total_stock_value' => round($totalValue, 2),
                'low_stock_count' => $lowStock,
                'materials' => $items->map(function ($material) {
                    return [
                        'id' => $material->id,
                        'name' => $material->name,
                        'sku' => $material->sku,
                        'stock_quantity' => $material->stock_quantity,
                        'unit' => $material->unit,
                        'stock_value' => round($material->stock_quantity * $material->unit_cost, 2),
                    ];
                })->values(),
            ];
        })->values();

        return [
            'categories' => $categorized,
            'total_categories' => $categorized->count(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get material usage analysis over time period
     *
     * @param string $tenantId
     * @param string|null $materialId Optional specific material
     * @param int $days Number of days to analyze (default: 30)
     * @return array
     */
    public function getMaterialUsageAnalysis(string $tenantId, ?string $materialId = null, int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        $query = InventoryTransaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->with('material');

        if ($materialId) {
            $query->where('material_id', $materialId);
        }

        $transactions = $query->orderBy('created_at', 'desc')->get();

        // Group by material
        $byMaterial = $transactions->groupBy('material_id')->map(function ($txns) use ($days) {
            $material = $txns->first()->material;

            $totalIncrease = $txns->where('quantity_change', '>', 0)->sum('quantity_change');
            $totalDecrease = abs($txns->where('quantity_change', '<', 0)->sum('quantity_change'));
            $netChange = $totalIncrease - $totalDecrease;

            return [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'sku' => $material->sku,
                'unit' => $material->unit,
                'current_stock' => $material->stock_quantity,
                'total_increase' => round($totalIncrease, 3),
                'total_decrease' => round($totalDecrease, 3),
                'net_change' => round($netChange, 3),
                'transaction_count' => $txns->count(),
                'average_daily_usage' => $days > 0 ? round($totalDecrease / $days, 3) : 0,
                'days_until_stockout' => $material->stock_quantity > 0 && $totalDecrease > 0
                    ? round(($material->stock_quantity / ($totalDecrease / $days)), 1)
                    : null,
            ];
        })->values();

        return [
            'period' => [
                'from' => $startDate->toIso8601String(),
                'to' => now()->toIso8601String(),
                'days' => $days,
            ],
            'materials' => $byMaterial,
            'total_materials_analyzed' => $byMaterial->count(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get transaction trends by type and reason
     *
     * @param string $tenantId
     * @param int $days
     * @return array
     */
    public function getTransactionTrends(string $tenantId, int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        $transactions = InventoryTransaction::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $startDate)
            ->get();

        $byType = $transactions->groupBy('transaction_type')->map(function ($txns, $type) {
            return [
                'type' => $type,
                'count' => $txns->count(),
                'total_quantity_change' => round($txns->sum('quantity_change'), 3),
            ];
        })->values();

        $byReason = $transactions->groupBy('reason')->map(function ($txns, $reason) {
            return [
                'reason' => $reason,
                'count' => $txns->count(),
                'total_quantity_change' => round($txns->sum('quantity_change'), 3),
            ];
        })->values();

        // Daily trends
        $dailyTrends = $transactions->groupBy(function ($txn) {
            return $txn->created_at->format('Y-m-d');
        })->map(function ($txns, $date) {
            return [
                'date' => $date,
                'transaction_count' => $txns->count(),
                'total_increase' => round($txns->where('quantity_change', '>', 0)->sum('quantity_change'), 3),
                'total_decrease' => round(abs($txns->where('quantity_change', '<', 0)->sum('quantity_change')), 3),
            ];
        })->values();

        return [
            'period' => [
                'from' => $startDate->toIso8601String(),
                'to' => now()->toIso8601String(),
                'days' => $days,
            ],
            'by_type' => $byType,
            'by_reason' => $byReason,
            'daily_trends' => $dailyTrends,
            'total_transactions' => $transactions->count(),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get cost analysis for materials
     *
     * @param string $tenantId
     * @param array $categoryFilter Optional categories to filter
     * @return array
     */
    public function getCostAnalysis(string $tenantId, array $categoryFilter = []): array
    {
        $query = Material::forTenant($tenantId);

        if (!empty($categoryFilter)) {
            $query->whereIn('category', $categoryFilter);
        }

        $materials = $query->get();

        $totalStockValue = $materials->sum(fn($m) => $m->stock_quantity * $m->unit_cost);
        
        // Top 10 most valuable materials
        $topByValue = $materials->sortByDesc(fn($m) => $m->stock_quantity * $m->unit_cost)
            ->take(10)
            ->map(function ($material) {
                $value = $material->stock_quantity * $material->unit_cost;
                return [
                    'material_id' => $material->id,
                    'name' => $material->name,
                    'sku' => $material->sku,
                    'category' => $material->category,
                    'stock_quantity' => $material->stock_quantity,
                    'unit_cost' => $material->unit_cost,
                    'total_value' => round($value, 2),
                ];
            })->values();

        // Cost by category
        $costByCategory = $materials->groupBy('category')->map(function ($items, $category) {
            $totalValue = $items->sum(fn($m) => $m->stock_quantity * $m->unit_cost);
            return [
                'category' => $category ?: 'Uncategorized',
                'total_value' => round($totalValue, 2),
                'material_count' => $items->count(),
                'average_unit_cost' => round($items->avg('unit_cost'), 2),
            ];
        })->sortByDesc('total_value')->values();

        return [
            'total_stock_value' => round($totalStockValue, 2),
            'average_unit_cost' => round($materials->avg('unit_cost'), 2),
            'total_materials' => $materials->count(),
            'top_materials_by_value' => $topByValue,
            'cost_by_category' => $costByCategory,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get materials requiring attention (low stock, high usage, etc.)
     *
     * @param string $tenantId
     * @param int $days Days to analyze usage
     * @return array
     */
    public function getMaterialsRequiringAttention(string $tenantId, int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        // Get all materials for tenant
        $materials = Material::forTenant($tenantId)
            ->with(['transactions' => function ($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            }])
            ->get();

        $attention = [];

        foreach ($materials as $material) {
            $reasons = [];
            $priority = 0;

            // Check out of stock first (highest priority)
            if ($material->stock_quantity <= 0) {
                $reasons[] = 'Out of stock';
                $priority = 5; // Set to exactly 5 for out of stock
            } elseif ($material->is_low_stock && $material->stock_quantity > 0) {
                // Check low stock only if not out of stock (redundant check for safety)
                $reasons[] = 'Low stock (below reorder level)';
                $priority += 3;
            }

            // Check high usage rate (skip if out of stock)
            if ($material->stock_quantity > 0) {
                $totalDecrease = abs($material->transactions->where('quantity_change', '<', 0)->sum('quantity_change'));
                $avgDailyUsage = $totalDecrease / $days;

                if ($avgDailyUsage > 0) {
                    $daysRemaining = $material->stock_quantity / $avgDailyUsage;
                    if ($daysRemaining < 7) {
                        $reasons[] = "Only {$daysRemaining} days of stock remaining at current usage rate";
                        $priority += 4;
                    }
                }
            }

            // Check no recent activity (skip if out of stock)
            if ($material->stock_quantity > 0 && $material->transactions->count() === 0) {
                $reasons[] = 'No transactions in last ' . $days . ' days (possibly obsolete)';
                $priority += 1;
            }

            if (!empty($reasons)) {
                $attention[] = [
                    'material_id' => $material->id,
                    'name' => $material->name,
                    'sku' => $material->sku,
                    'category' => $material->category,
                    'current_stock' => $material->stock_quantity,
                    'reorder_level' => $material->reorder_level,
                    'unit' => $material->unit,
                    'supplier' => $material->supplier,
                    'priority' => $priority,
                    'reasons' => $reasons,
                    'average_daily_usage' => round($avgDailyUsage, 3),
                ];
            }
        }

        // Sort by priority (highest first)
        usort($attention, fn($a, $b) => $b['priority'] <=> $a['priority']);

        return [
            'materials_requiring_attention' => $attention,
            'total_count' => count($attention),
            'period_analyzed' => $days . ' days',
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get inventory turnover rate
     *
     * @param string $tenantId
     * @param int $days
     * @return array
     */
    public function getInventoryTurnoverRate(string $tenantId, int $days = 30): array
    {
        $startDate = Carbon::now()->subDays($days);

        $materials = Material::forTenant($tenantId)
            ->with(['transactions' => function ($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate)
                  ->where('quantity_change', '<', 0); // Only decreases (usage)
            }])
            ->get();

        $turnoverData = $materials->map(function ($material) use ($days) {
            $totalUsage = abs($material->transactions->sum('quantity_change'));
            $avgStock = $material->stock_quantity + ($totalUsage / 2); // Simplified average
            
            $turnoverRate = $avgStock > 0 ? ($totalUsage / $avgStock) : 0;

            return [
                'material_id' => $material->id,
                'name' => $material->name,
                'sku' => $material->sku,
                'current_stock' => $material->stock_quantity,
                'total_usage' => round($totalUsage, 3),
                'average_stock' => round($avgStock, 3),
                'turnover_rate' => round($turnoverRate, 2),
                'turnover_category' => $this->categorizeTurnover($turnoverRate),
            ];
        })->sortByDesc('turnover_rate')->values();

        return [
            'period' => [
                'from' => $startDate->toIso8601String(),
                'to' => now()->toIso8601String(),
                'days' => $days,
            ],
            'turnover_data' => $turnoverData,
            'average_turnover_rate' => round($turnoverData->avg('turnover_rate'), 2),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Categorize turnover rate
     *
     * @param float $rate
     * @return string
     */
    private function categorizeTurnover(float $rate): string
    {
        if ($rate > 2.0) return 'Very High';
        if ($rate > 1.0) return 'High';
        if ($rate > 0.5) return 'Moderate';
        if ($rate > 0.1) return 'Low';
        return 'Very Low';
    }
}