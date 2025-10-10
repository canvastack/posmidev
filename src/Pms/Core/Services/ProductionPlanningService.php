<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Collection;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Core\Services\InventoryCalculationService;
use Src\Pms\Core\Services\BatchProductionService;
use Carbon\Carbon;

/**
 * ProductionPlanningService
 * 
 * Service for production planning and optimization
 * Handles production schedules, capacity planning, and material optimization
 * 
 * @package Src\Pms\Core\Services
 */
class ProductionPlanningService
{
    private InventoryCalculationService $calculationService;
    private BatchProductionService $batchService;

    public function __construct()
    {
        $this->calculationService = new InventoryCalculationService();
        $this->batchService = new BatchProductionService();
    }

    /**
     * Create production plan for multiple products
     *
     * @param string $tenantId
     * @param array $productRequirements Array of ['product_id' => quantity]
     * @param array $options Planning options
     * @return array
     */
    public function createProductionPlan(string $tenantId, array $productRequirements, array $options = []): array
    {
        $priorityMode = $options['priority_mode'] ?? 'balanced'; // balanced, maximize_quantity, minimize_cost
        $allowPartial = $options['allow_partial'] ?? true;

        $multiProductAnalysis = $this->batchService->calculateMultiProductBatch($productRequirements, $tenantId);

        if ($multiProductAnalysis['is_feasible']) {
            return [
                'status' => 'feasible',
                'message' => 'All products can be produced with available materials',
                'production_plan' => $multiProductAnalysis['production_plan'],
                'material_requirements' => $multiProductAnalysis['aggregated_material_requirements'],
                'total_cost' => $multiProductAnalysis['total_production_cost'],
                'recommendations' => ['Execute production as planned'],
            ];
        }

        // Plan is not feasible - need to optimize
        if (!$allowPartial) {
            return [
                'status' => 'infeasible',
                'message' => 'Cannot produce requested quantities with available materials',
                'shortages' => $multiProductAnalysis['material_shortages'],
                'recommendations' => $this->generateShortageRecommendations($multiProductAnalysis['material_shortages']),
            ];
        }

        // Create optimized partial plan
        $optimizedPlan = $this->optimizeProductionPlan($tenantId, $productRequirements, $priorityMode);

        return [
            'status' => 'optimized',
            'message' => 'Original plan adjusted to fit available materials',
            'original_requirements' => $productRequirements,
            'optimized_plan' => $optimizedPlan,
            'recommendations' => $optimizedPlan['recommendations'],
        ];
    }

    /**
     * Optimize production plan based on material constraints
     *
     * @param string $tenantId
     * @param array $productRequirements
     * @param string $priorityMode
     * @return array
     */
    private function optimizeProductionPlan(string $tenantId, array $productRequirements, string $priorityMode): array
    {
        $feasibleProducts = [];
        $infeasibleProducts = [];

        foreach ($productRequirements as $productId => $requestedQty) {
            try {
                $availability = $this->calculationService->calculateAvailableQuantity($productId, $tenantId);
                $maxProducible = $availability['available_quantity'];

                if ($maxProducible >= $requestedQty) {
                    $feasibleProducts[$productId] = [
                        'product_id' => $productId,
                        'product_name' => $availability['product_name'],
                        'requested' => $requestedQty,
                        'suggested' => $requestedQty,
                        'status' => 'fully_feasible',
                    ];
                } elseif ($maxProducible > 0) {
                    $feasibleProducts[$productId] = [
                        'product_id' => $productId,
                        'product_name' => $availability['product_name'],
                        'requested' => $requestedQty,
                        'suggested' => $maxProducible,
                        'status' => 'partially_feasible',
                        'reduction_percentage' => round((($requestedQty - $maxProducible) / $requestedQty) * 100, 2),
                    ];
                } else {
                    $infeasibleProducts[$productId] = [
                        'product_id' => $productId,
                        'product_name' => $availability['product_name'],
                        'requested' => $requestedQty,
                        'status' => 'infeasible',
                        'reason' => 'Insufficient materials',
                    ];
                }
            } catch (\Exception $e) {
                $infeasibleProducts[$productId] = [
                    'product_id' => $productId,
                    'requested' => $requestedQty,
                    'status' => 'error',
                    'reason' => $e->getMessage(),
                ];
            }
        }

        $recommendations = [];
        if (!empty($feasibleProducts)) {
            $recommendations[] = 'Produce ' . count($feasibleProducts) . ' product(s) with available materials';
        }
        if (!empty($infeasibleProducts)) {
            $recommendations[] = 'Restock materials for ' . count($infeasibleProducts) . ' product(s)';
        }

        return [
            'feasible_products' => array_values($feasibleProducts),
            'infeasible_products' => array_values($infeasibleProducts),
            'total_products' => count($productRequirements),
            'feasible_count' => count($feasibleProducts),
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Calculate production capacity for all BOM products
     *
     * @param string $tenantId
     * @return array
     */
    public function calculateOverallCapacity(string $tenantId): array
    {
        $bomProducts = Product::forTenant($tenantId)
            ->where('inventory_management_type', 'bom')
            ->whereHas('activeRecipe')
            ->with(['activeRecipe'])
            ->get();

        $capacities = [];
        $bottleneckMaterials = [];

        foreach ($bomProducts as $product) {
            try {
                $availability = $this->calculationService->calculateAvailableQuantity($product->id, $tenantId);
                
                $capacities[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'current_capacity' => $availability['available_quantity'],
                    'bottleneck_material' => $availability['bottleneck_material']['material_name'] ?? null,
                    'recipe_name' => $availability['recipe_name'] ?? null,
                ];

                // Track bottleneck materials
                if (isset($availability['bottleneck_material'])) {
                    $materialId = $availability['bottleneck_material']['material_id'];
                    if (!isset($bottleneckMaterials[$materialId])) {
                        $bottleneckMaterials[$materialId] = [
                            'material_id' => $materialId,
                            'material_name' => $availability['bottleneck_material']['material_name'],
                            'affects_products' => [],
                        ];
                    }
                    $bottleneckMaterials[$materialId]['affects_products'][] = $product->name;
                }
            } catch (\Exception $e) {
                $capacities[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'current_capacity' => 0,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return [
            'total_bom_products' => count($bomProducts),
            'product_capacities' => $capacities,
            'critical_bottlenecks' => array_values($bottleneckMaterials),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Generate production schedule
     *
     * @param string $tenantId
     * @param array $orders Array of orders with product_id, quantity, due_date
     * @param int $planningHorizonDays
     * @return array
     */
    public function generateProductionSchedule(string $tenantId, array $orders, int $planningHorizonDays = 7): array
    {
        // Sort orders by due date
        usort($orders, fn($a, $b) => strtotime($a['due_date']) <=> strtotime($b['due_date']));

        $schedule = [];
        $materialAvailability = $this->getCurrentMaterialAvailability($tenantId);

        foreach ($orders as $index => $order) {
            $orderDate = Carbon::parse($order['due_date']);
            $productionDate = $orderDate->copy()->subDays(1); // Produce 1 day before due

            try {
                $requirements = $this->batchService->calculateBatchRequirements(
                    $order['product_id'],
                    $tenantId,
                    $order['quantity']
                );

                $canProduce = $this->checkMaterialSufficiency($requirements['material_requirements'], $materialAvailability);

                if ($canProduce) {
                    // Deduct materials from availability
                    foreach ($requirements['material_requirements'] as $req) {
                        $materialAvailability[$req['material_id']] -= $req['total_required'];
                    }

                    $schedule[] = [
                        'order_id' => $order['order_id'] ?? "ORD-" . ($index + 1),
                        'product_id' => $order['product_id'],
                        'product_name' => $requirements['product_name'],
                        'quantity' => $order['quantity'],
                        'production_date' => $productionDate->format('Y-m-d'),
                        'due_date' => $order['due_date'],
                        'status' => 'scheduled',
                        'production_cost' => $requirements['cost_analysis']['total_material_cost'],
                    ];
                } else {
                    $schedule[] = [
                        'order_id' => $order['order_id'] ?? "ORD-" . ($index + 1),
                        'product_id' => $order['product_id'],
                        'product_name' => $requirements['product_name'],
                        'quantity' => $order['quantity'],
                        'due_date' => $order['due_date'],
                        'status' => 'material_shortage',
                        'shortages' => $requirements['shortages'],
                    ];
                }
            } catch (\Exception $e) {
                $schedule[] = [
                    'order_id' => $order['order_id'] ?? "ORD-" . ($index + 1),
                    'product_id' => $order['product_id'],
                    'quantity' => $order['quantity'],
                    'due_date' => $order['due_date'],
                    'status' => 'error',
                    'error' => $e->getMessage(),
                ];
            }
        }

        $scheduledCount = collect($schedule)->where('status', 'scheduled')->count();
        $shortageCount = collect($schedule)->where('status', 'material_shortage')->count();

        return [
            'schedule' => $schedule,
            'total_orders' => count($orders),
            'scheduled' => $scheduledCount,
            'material_shortages' => $shortageCount,
            'planning_horizon_days' => $planningHorizonDays,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get current material availability
     *
     * @param string $tenantId
     * @return array
     */
    private function getCurrentMaterialAvailability(string $tenantId): array
    {
        $materials = Material::forTenant($tenantId)->get();
        
        $availability = [];
        foreach ($materials as $material) {
            $availability[$material->id] = $material->stock_quantity;
        }

        return $availability;
    }

    /**
     * Check material sufficiency against availability
     *
     * @param array $requirements
     * @param array $availability
     * @return bool
     */
    private function checkMaterialSufficiency(array $requirements, array $availability): bool
    {
        foreach ($requirements as $req) {
            $materialId = $req['material_id'];
            $required = $req['total_required'];
            
            if (!isset($availability[$materialId]) || $availability[$materialId] < $required) {
                return false;
            }
        }

        return true;
    }

    /**
     * Generate shortage recommendations
     *
     * @param array $shortages
     * @return array
     */
    private function generateShortageRecommendations(array $shortages): array
    {
        $recommendations = [];

        if (empty($shortages)) {
            return ['No shortages detected'];
        }

        $totalShortages = count($shortages);
        $recommendations[] = "Restock {$totalShortages} material(s) to enable production";

        foreach ($shortages as $shortage) {
            $recommendations[] = "Order {$shortage['shortage']} {$shortage['unit']} of {$shortage['material_name']}";
        }

        return $recommendations;
    }

    /**
     * Optimize material usage across products
     *
     * @param string $tenantId
     * @param array $productPriorities Array of product_id => priority_score
     * @return array
     */
    public function optimizeMaterialUsage(string $tenantId, array $productPriorities = []): array
    {
        $materials = Material::forTenant($tenantId)
            ->with(['recipeMaterials.recipe' => function ($q) {
                $q->where('is_active', true)->with('product');
            }])
            ->get();

        $optimizationInsights = [];

        foreach ($materials as $material) {
            $usedInRecipes = $material->recipeMaterials
                ->filter(fn($rm) => $rm->recipe && $rm->recipe->is_active)
                ->map(function ($rm) use ($material) {
                    $maxBatches = $material->stock_quantity > 0 
                        ? floor($material->stock_quantity / $rm->effective_quantity)
                        : 0;

                    return [
                        'recipe_id' => $rm->recipe->id,
                        'recipe_name' => $rm->recipe->name,
                        'product_id' => $rm->recipe->product_id,
                        'product_name' => $rm->recipe->product->name ?? null,
                        'quantity_per_unit' => $rm->effective_quantity,
                        'max_producible_batches' => $maxBatches,
                    ];
                });

            if ($usedInRecipes->isNotEmpty()) {
                $optimizationInsights[] = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'current_stock' => $material->stock_quantity,
                    'unit' => $material->unit,
                    'used_in_recipes' => $usedInRecipes->toArray(),
                    'optimization_suggestion' => $this->generateOptimizationSuggestion($material, $usedInRecipes),
                ];
            }
        }

        return [
            'optimization_insights' => $optimizationInsights,
            'total_materials_analyzed' => count($optimizationInsights),
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Generate optimization suggestion
     *
     * @param Material $material
     * @param Collection $usedInRecipes
     * @return string
     */
    private function generateOptimizationSuggestion(Material $material, Collection $usedInRecipes): string
    {
        $totalRecipes = $usedInRecipes->count();
        $minBatches = $usedInRecipes->min('max_producible_batches');

        if ($material->stock_quantity <= 0) {
            return "Out of stock - affects {$totalRecipes} product(s). Priority restock required.";
        }

        if ($material->is_low_stock) {
            return "Low stock - can produce only {$minBatches} batch(es) of constrained product. Consider restocking.";
        }

        return "Material is shared across {$totalRecipes} product(s). Monitor usage patterns.";
    }
}