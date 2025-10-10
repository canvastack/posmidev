<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Core\Services\InventoryCalculationService;

/**
 * BatchProductionService
 * 
 * Service for batch production calculations and planning
 * Handles multi-batch requirements, material consumption, and production scheduling
 * 
 * @package Src\Pms\Core\Services
 */
class BatchProductionService
{
    private InventoryCalculationService $calculationService;

    public function __construct()
    {
        $this->calculationService = new InventoryCalculationService();
    }

    /**
     * Calculate material requirements for batch production
     *
     * @param string $productId
     * @param string $tenantId
     * @param int $quantity Desired production quantity
     * @return array
     */
    public function calculateBatchRequirements(string $productId, string $tenantId, int $quantity): array
    {
        $product = Product::forTenant($tenantId)->findOrFail($productId);

        if ($product->inventory_management_type !== 'bom') {
            throw new \InvalidArgumentException('Product does not use BOM inventory management');
        }

        $recipe = Recipe::where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with(['recipeMaterials.material'])
            ->first();

        if (!$recipe) {
            throw new \InvalidArgumentException('No active recipe found for this product');
        }

        $requirements = [];
        $totalCost = 0;
        $canProduce = true;
        $shortages = [];

        foreach ($recipe->recipeMaterials as $component) {
            $material = $component->material;
            $effectiveQuantity = $component->effective_quantity;
            $requiredForBatch = $effectiveQuantity * $quantity;
            $available = $material->stock_quantity;
            $shortage = $requiredForBatch > $available ? $requiredForBatch - $available : 0;

            if ($shortage > 0) {
                $canProduce = false;
                $shortages[] = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'shortage' => round($shortage, 3),
                    'unit' => $material->unit,
                ];
            }

            $componentCost = $requiredForBatch * $material->unit_cost;
            $totalCost += $componentCost;

            $requirements[] = [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'sku' => $material->sku,
                'unit' => $material->unit,
                'quantity_per_unit' => $component->quantity_required,
                'waste_percentage' => $component->waste_percentage,
                'effective_quantity_per_unit' => $component->effective_quantity,
                'total_required' => round($requiredForBatch, 3),
                'current_stock' => $material->stock_quantity,
                'remaining_after_production' => round($available - $requiredForBatch, 3),
                'is_sufficient' => $available >= $requiredForBatch,
                'shortage' => round($shortage, 3),
                'unit_cost' => $material->unit_cost,
                'total_cost' => round($componentCost, 2),
            ];
        }

        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'recipe_id' => $recipe->id,
            'recipe_name' => $recipe->name,
            'requested_quantity' => $quantity,
            'can_produce' => $canProduce,
            'material_requirements' => $requirements,
            'shortages' => $shortages,
            'cost_analysis' => [
                'total_material_cost' => round($totalCost, 2),
                'cost_per_unit' => round($totalCost / $quantity, 2),
            ],
            'calculated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Calculate optimal batch size based on available materials
     *
     * @param string $productId
     * @param string $tenantId
     * @return array
     */
    public function calculateOptimalBatchSize(string $productId, string $tenantId): array
    {
        $availability = $this->calculationService->calculateAvailableQuantity($productId, $tenantId);

        $maxProducible = $availability['available_quantity'];
        $bottleneck = $availability['bottleneck_material'];

        // Suggest batch sizes
        $suggestedBatches = [];
        $batchSizes = [10, 25, 50, 100, 200, 500];

        foreach ($batchSizes as $size) {
            if ($size <= $maxProducible) {
                $batchReq = $this->calculateBatchRequirements($productId, $tenantId, $size);
                $suggestedBatches[] = [
                    'batch_size' => $size,
                    'total_cost' => $batchReq['cost_analysis']['total_material_cost'],
                    'cost_per_unit' => $batchReq['cost_analysis']['cost_per_unit'],
                    'utilization_percentage' => round(($size / $maxProducible) * 100, 2),
                ];
            }
        }

        return [
            'product_id' => $productId,
            'product_name' => $availability['product_name'],
            'maximum_producible' => $maxProducible,
            'bottleneck_material' => $bottleneck,
            'suggested_batches' => $suggestedBatches,
            'recommendation' => $this->generateBatchRecommendation($maxProducible, $suggestedBatches),
        ];
    }

    /**
     * Calculate multi-product batch production plan
     *
     * @param array $productionPlan Array of ['product_id' => quantity]
     * @param string $tenantId
     * @return array
     */
    public function calculateMultiProductBatch(array $productionPlan, string $tenantId): array
    {
        $totalMaterialRequirements = [];
        $productDetails = [];
        $totalCost = 0;
        $overallFeasible = true;

        foreach ($productionPlan as $productId => $quantity) {
            try {
                $batchReq = $this->calculateBatchRequirements($productId, $tenantId, $quantity);
                
                if (!$batchReq['can_produce']) {
                    $overallFeasible = false;
                }

                $productDetails[] = [
                    'product_id' => $productId,
                    'product_name' => $batchReq['product_name'],
                    'quantity' => $quantity,
                    'can_produce' => $batchReq['can_produce'],
                    'total_cost' => $batchReq['cost_analysis']['total_material_cost'],
                    'shortages' => $batchReq['shortages'],
                ];

                $totalCost += $batchReq['cost_analysis']['total_material_cost'];

                // Aggregate material requirements
                foreach ($batchReq['material_requirements'] as $req) {
                    $materialId = $req['material_id'];
                    
                    if (!isset($totalMaterialRequirements[$materialId])) {
                        $totalMaterialRequirements[$materialId] = [
                            'material_id' => $materialId,
                            'material_name' => $req['material_name'],
                            'unit' => $req['unit'],
                            'current_stock' => $req['current_stock'],
                            'total_required' => 0,
                            'unit_cost' => $req['unit_cost'],
                            'used_in_products' => [],
                        ];
                    }

                    $totalMaterialRequirements[$materialId]['total_required'] += $req['total_required'];
                    $totalMaterialRequirements[$materialId]['used_in_products'][] = [
                        'product_name' => $batchReq['product_name'],
                        'quantity_required' => $req['total_required'],
                    ];
                }
            } catch (\Exception $e) {
                $productDetails[] = [
                    'product_id' => $productId,
                    'error' => $e->getMessage(),
                ];
            }
        }

        // Check overall material sufficiency
        $materialShortages = [];
        foreach ($totalMaterialRequirements as $materialId => $materialData) {
            $shortage = $materialData['total_required'] - $materialData['current_stock'];
            if ($shortage > 0) {
                $materialShortages[] = [
                    'material_id' => $materialId,
                    'material_name' => $materialData['material_name'],
                    'current_stock' => $materialData['current_stock'],
                    'total_required' => round($materialData['total_required'], 3),
                    'shortage' => round($shortage, 3),
                    'unit' => $materialData['unit'],
                ];
            }

            $totalMaterialRequirements[$materialId]['remaining_after_production'] = 
                round($materialData['current_stock'] - $materialData['total_required'], 3);
            $totalMaterialRequirements[$materialId]['is_sufficient'] = $shortage <= 0;
        }

        return [
            'production_plan' => $productDetails,
            'total_products' => count($productionPlan),
            'is_feasible' => $overallFeasible && empty($materialShortages),
            'aggregated_material_requirements' => array_values($totalMaterialRequirements),
            'material_shortages' => $materialShortages,
            'total_production_cost' => round($totalCost, 2),
            'calculated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Simulate production and calculate remaining stock
     *
     * @param string $productId
     * @param string $tenantId
     * @param int $quantity
     * @return array
     */
    public function simulateProduction(string $productId, string $tenantId, int $quantity): array
    {
        $batchReq = $this->calculateBatchRequirements($productId, $tenantId, $quantity);

        if (!$batchReq['can_produce']) {
            return [
                'success' => false,
                'message' => 'Cannot simulate production due to material shortages',
                'shortages' => $batchReq['shortages'],
            ];
        }

        // Simulate material deductions
        $materialChanges = [];
        foreach ($batchReq['material_requirements'] as $req) {
            $materialChanges[] = [
                'material_id' => $req['material_id'],
                'material_name' => $req['material_name'],
                'before_production' => $req['current_stock'],
                'consumed' => $req['total_required'],
                'after_production' => $req['remaining_after_production'],
                'unit' => $req['unit'],
                'will_be_low_stock' => $req['remaining_after_production'] < 0,
            ];
        }

        return [
            'success' => true,
            'product_id' => $productId,
            'product_name' => $batchReq['product_name'],
            'quantity_produced' => $quantity,
            'material_changes' => $materialChanges,
            'production_cost' => $batchReq['cost_analysis']['total_material_cost'],
            'cost_per_unit' => $batchReq['cost_analysis']['cost_per_unit'],
            'simulated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Get production capacity forecast
     *
     * @param string $productId
     * @param string $tenantId
     * @param int $days Number of days to forecast
     * @param float $avgDailyUsage Average daily usage rate
     * @return array
     */
    public function getProductionCapacityForecast(string $productId, string $tenantId, int $days, float $avgDailyUsage = 0): array
    {
        $availability = $this->calculationService->calculateAvailableQuantity($productId, $tenantId);
        
        $currentCapacity = $availability['available_quantity'];
        $bottleneck = $availability['bottleneck_material'];

        $forecast = [];
        $remainingCapacity = $currentCapacity;

        for ($day = 0; $day <= $days; $day++) {
            $depletion = $avgDailyUsage * $day;
            $capacityAtDay = max(0, $currentCapacity - $depletion);

            $forecast[] = [
                'day' => $day,
                'date' => now()->addDays($day)->format('Y-m-d'),
                'production_capacity' => round($capacityAtDay, 0),
                'capacity_percentage' => $currentCapacity > 0 ? round(($capacityAtDay / $currentCapacity) * 100, 2) : 0,
            ];

            if ($capacityAtDay <= 0) {
                break; // Stop forecasting when capacity reaches zero
            }
        }

        return [
            'product_id' => $productId,
            'product_name' => $availability['product_name'],
            'current_capacity' => $currentCapacity,
            'bottleneck_material' => $bottleneck,
            'forecast_period_days' => $days,
            'average_daily_usage' => $avgDailyUsage,
            'capacity_forecast' => $forecast,
            'days_until_depletion' => $avgDailyUsage > 0 ? ceil($currentCapacity / $avgDailyUsage) : null,
        ];
    }

    /**
     * Generate batch recommendation
     *
     * @param int $maxProducible
     * @param array $suggestedBatches
     * @return string
     */
    private function generateBatchRecommendation(int $maxProducible, array $suggestedBatches): string
    {
        if ($maxProducible === 0) {
            return 'Cannot produce. Material shortages detected.';
        }

        if ($maxProducible < 10) {
            return 'Very limited production capacity. Recommend restocking materials before production.';
        }

        $optimalBatch = collect($suggestedBatches)->sortBy('cost_per_unit')->first();
        
        if ($optimalBatch) {
            return "Recommended batch size: {$optimalBatch['batch_size']} units for optimal cost efficiency.";
        }

        return 'Maximum capacity: ' . $maxProducible . ' units. Plan batch size accordingly.';
    }
}