<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Collection;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Carbon\Carbon;

/**
 * StockAlertService
 * 
 * Service for managing stock alerts and notifications
 * Monitors stock levels, usage patterns, and generates alerts
 * 
 * @package Src\Pms\Core\Services
 */
class StockAlertService
{
    /**
     * Get all active alerts for a tenant
     *
     * @param string $tenantId
     * @return array
     */
    public function getActiveAlerts(string $tenantId): array
    {
        $materials = Material::forTenant($tenantId)
            ->with(['recipeMaterials.recipe' => function ($q) {
                $q->where('is_active', true);
            }])
            ->get();

        $alerts = [];

        foreach ($materials as $material) {
            $materialAlerts = $this->checkMaterialAlerts($material);
            if (!empty($materialAlerts)) {
                $alerts[] = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'sku' => $material->sku,
                    'category' => $material->category,
                    'current_stock' => $material->stock_quantity,
                    'reorder_level' => $material->reorder_level,
                    'unit' => $material->unit,
                    'alerts' => $materialAlerts,
                    'alert_count' => count($materialAlerts),
                    'highest_severity' => $this->getHighestSeverity($materialAlerts),
                ];
            }
        }

        // Sort by severity
        usort($alerts, function ($a, $b) {
            $severityOrder = ['critical' => 3, 'warning' => 2, 'info' => 1];
            return $severityOrder[$b['highest_severity']] <=> $severityOrder[$a['highest_severity']];
        });

        return [
            'alerts' => $alerts,
            'total_alerts' => count($alerts),
            'severity_summary' => [
                'critical' => collect($alerts)->where('highest_severity', 'critical')->count(),
                'warning' => collect($alerts)->where('highest_severity', 'warning')->count(),
                'info' => collect($alerts)->where('highest_severity', 'info')->count(),
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Check alerts for a specific material
     *
     * @param Material $material
     * @return array
     */
    private function checkMaterialAlerts(Material $material): array
    {
        $alerts = [];

        // Alert 1: Out of stock
        if ($material->stock_quantity <= 0) {
            $alerts[] = [
                'type' => 'out_of_stock',
                'severity' => 'critical',
                'message' => 'Material is completely out of stock',
                'action_required' => 'Immediate reorder required',
            ];
        }

        // Alert 2: Below reorder level
        if ($material->stock_quantity > 0 && $material->is_low_stock) {
            $alerts[] = [
                'type' => 'below_reorder_level',
                'severity' => 'warning',
                'message' => "Stock is below reorder level ({$material->reorder_level} {$material->unit})",
                'action_required' => 'Consider reordering soon',
            ];
        }

        // Alert 3: Used in active recipes
        $activeRecipes = $material->recipeMaterials
            ->filter(fn($rm) => $rm->recipe && $rm->recipe->is_active)
            ->count();

        if ($activeRecipes > 0 && $material->is_low_stock) {
            $alerts[] = [
                'type' => 'active_recipe_low_stock',
                'severity' => 'warning',
                'message' => "Used in {$activeRecipes} active recipe(s) and stock is low",
                'action_required' => 'Priority reorder - affects production',
            ];
        }

        // Alert 4: Critical - used in active recipes and out of stock
        if ($activeRecipes > 0 && $material->stock_quantity <= 0) {
            $alerts[] = [
                'type' => 'active_recipe_out_of_stock',
                'severity' => 'critical',
                'message' => "Out of stock and used in {$activeRecipes} active recipe(s)",
                'action_required' => 'URGENT: Production halted - immediate reorder required',
            ];
        }

        return $alerts;
    }

    /**
     * Get highest severity from alerts
     *
     * @param array $alerts
     * @return string
     */
    private function getHighestSeverity(array $alerts): string
    {
        foreach (['critical', 'warning', 'info'] as $severity) {
            if (collect($alerts)->where('severity', $severity)->isNotEmpty()) {
                return $severity;
            }
        }
        return 'info';
    }

    /**
     * Get predictive stock alerts based on usage patterns
     *
     * @param string $tenantId
     * @param int $forecastDays Days to forecast (default 7)
     * @return array
     */
    public function getPredictiveAlerts(string $tenantId, int $forecastDays = 7): array
    {
        $materials = Material::forTenant($tenantId)
            ->with(['transactions' => function ($q) {
                $q->where('created_at', '>=', Carbon::now()->subDays(30))
                  ->where('quantity_change', '<', 0); // Only usage/decreases
            }])
            ->get();

        $predictiveAlerts = [];

        foreach ($materials as $material) {
            if ($material->transactions->isEmpty()) {
                continue;
            }

            $totalUsage = abs($material->transactions->sum('quantity_change'));
            $avgDailyUsage = $totalUsage / 30; // Based on 30 days

            if ($avgDailyUsage > 0) {
                $daysUntilStockout = $material->stock_quantity / $avgDailyUsage;
                $daysUntilReorderLevel = ($material->stock_quantity - $material->reorder_level) / $avgDailyUsage;

                if ($daysUntilStockout <= $forecastDays) {
                    $predictiveAlerts[] = [
                        'material_id' => $material->id,
                        'material_name' => $material->name,
                        'sku' => $material->sku,
                        'current_stock' => $material->stock_quantity,
                        'unit' => $material->unit,
                        'average_daily_usage' => round($avgDailyUsage, 3),
                        'days_until_stockout' => round($daysUntilStockout, 1),
                        'predicted_stockout_date' => now()->addDays($daysUntilStockout)->format('Y-m-d'),
                        'severity' => $daysUntilStockout <= 3 ? 'critical' : 'warning',
                        'message' => "Will run out in " . round($daysUntilStockout, 1) . " days at current usage rate",
                        'recommended_reorder_quantity' => round($avgDailyUsage * 30, 2), // 30 days worth
                    ];
                }
            }
        }

        // Sort by days until stockout (most urgent first)
        usort($predictiveAlerts, fn($a, $b) => $a['days_until_stockout'] <=> $b['days_until_stockout']);

        return [
            'predictive_alerts' => $predictiveAlerts,
            'total_alerts' => count($predictiveAlerts),
            'forecast_period_days' => $forecastDays,
            'based_on_usage_days' => 30,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get reorder recommendations
     *
     * @param string $tenantId
     * @param int $targetDaysOfStock Days of stock to maintain (default 30)
     * @return array
     */
    public function getReorderRecommendations(string $tenantId, int $targetDaysOfStock = 30): array
    {
        $materials = Material::forTenant($tenantId)
            ->lowStock()
            ->with(['transactions' => function ($q) {
                $q->where('created_at', '>=', Carbon::now()->subDays(30))
                  ->where('quantity_change', '<', 0);
            }])
            ->get();

        $recommendations = [];

        foreach ($materials as $material) {
            $totalUsage = abs($material->transactions->sum('quantity_change'));
            $avgDailyUsage = $totalUsage / 30;

            $recommendedQuantity = max(
                $material->reorder_level - $material->stock_quantity,
                $avgDailyUsage * $targetDaysOfStock
            );

            $estimatedCost = $recommendedQuantity * $material->unit_cost;

            $recommendations[] = [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'sku' => $material->sku,
                'supplier' => $material->supplier,
                'category' => $material->category,
                'current_stock' => $material->stock_quantity,
                'reorder_level' => $material->reorder_level,
                'unit' => $material->unit,
                'average_daily_usage' => round($avgDailyUsage, 3),
                'recommended_order_quantity' => round($recommendedQuantity, 2),
                'unit_cost' => $material->unit_cost,
                'estimated_order_cost' => round($estimatedCost, 2),
                'priority' => $material->stock_quantity <= 0 ? 'urgent' : 
                            ($material->stock_quantity < $material->reorder_level * 0.5 ? 'high' : 'medium'),
            ];
        }

        // Sort by priority
        $priorityOrder = ['urgent' => 3, 'high' => 2, 'medium' => 1];
        usort($recommendations, fn($a, $b) => $priorityOrder[$b['priority']] <=> $priorityOrder[$a['priority']]);

        $totalEstimatedCost = collect($recommendations)->sum('estimated_order_cost');

        return [
            'recommendations' => $recommendations,
            'total_materials' => count($recommendations),
            'total_estimated_cost' => round($totalEstimatedCost, 2),
            'target_days_of_stock' => $targetDaysOfStock,
            'priority_summary' => [
                'urgent' => collect($recommendations)->where('priority', 'urgent')->count(),
                'high' => collect($recommendations)->where('priority', 'high')->count(),
                'medium' => collect($recommendations)->where('priority', 'medium')->count(),
            ],
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Check stock sufficiency for upcoming orders
     *
     * @param string $tenantId
     * @param array $productionPlan Array of ['product_id' => quantity]
     * @return array
     */
    public function checkStockSufficiencyForOrders(string $tenantId, array $productionPlan): array
    {
        $alerts = [];
        $materialUsage = [];

        foreach ($productionPlan as $productId => $quantity) {
            $recipe = Recipe::where('product_id', $productId)
                ->where('tenant_id', $tenantId)
                ->where('is_active', true)
                ->with(['recipeMaterials.material', 'product'])
                ->first();

            if (!$recipe) {
                continue;
            }

            foreach ($recipe->recipeMaterials as $component) {
                $materialId = $component->material_id;
                $required = $component->effective_quantity * $quantity;

                if (!isset($materialUsage[$materialId])) {
                    $materialUsage[$materialId] = [
                        'material' => $component->material,
                        'total_required' => 0,
                        'used_in_products' => [],
                    ];
                }

                $materialUsage[$materialId]['total_required'] += $required;
                $materialUsage[$materialId]['used_in_products'][] = [
                    'product_name' => $recipe->product->name,
                    'quantity_needed' => $quantity,
                    'material_required' => round($required, 3),
                ];
            }
        }

        // Check sufficiency
        foreach ($materialUsage as $materialId => $data) {
            $material = $data['material'];
            $shortage = $data['total_required'] - $material->stock_quantity;

            if ($shortage > 0) {
                $alerts[] = [
                    'material_id' => $materialId,
                    'material_name' => $material->name,
                    'sku' => $material->sku,
                    'current_stock' => $material->stock_quantity,
                    'total_required' => round($data['total_required'], 3),
                    'shortage' => round($shortage, 3),
                    'unit' => $material->unit,
                    'used_in_products' => $data['used_in_products'],
                    'severity' => 'critical',
                    'message' => "Insufficient stock for planned production orders",
                ];
            }
        }

        return [
            'is_sufficient' => empty($alerts),
            'production_plan_items' => count($productionPlan),
            'materials_checked' => count($materialUsage),
            'shortage_alerts' => $alerts,
            'total_shortages' => count($alerts),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get alert summary dashboard
     *
     * @param string $tenantId
     * @return array
     */
    public function getAlertDashboard(string $tenantId): array
    {
        $activeAlerts = $this->getActiveAlerts($tenantId);
        $predictiveAlerts = $this->getPredictiveAlerts($tenantId, 7);
        $reorderRecommendations = $this->getReorderRecommendations($tenantId, 30);

        return [
            'summary' => [
                'active_alerts' => $activeAlerts['total_alerts'],
                'predictive_alerts' => $predictiveAlerts['total_alerts'],
                'reorder_recommendations' => $reorderRecommendations['total_materials'],
                'critical_count' => $activeAlerts['severity_summary']['critical'],
                'warning_count' => $activeAlerts['severity_summary']['warning'],
            ],
            'active_alerts' => array_slice($activeAlerts['alerts'], 0, 10), // Top 10
            'predictive_alerts' => array_slice($predictiveAlerts['predictive_alerts'], 0, 10), // Top 10
            'reorder_recommendations' => array_slice($reorderRecommendations['recommendations'], 0, 10), // Top 10
            'total_reorder_cost' => $reorderRecommendations['total_estimated_cost'],
            'generated_at' => now()->toIso8601String(),
        ];
    }
}