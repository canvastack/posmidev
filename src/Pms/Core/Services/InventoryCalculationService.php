<?php

namespace Src\Pms\Core\Services;

use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Material;

/**
 * InventoryCalculationService
 * 
 * Service for BOM (Bill of Materials) explosion calculations
 * Calculates available quantities based on material stock and recipes
 * 
 * @package Src\Pms\Core\Services
 */
class InventoryCalculationService
{
    /**
     * Calculate available quantity for a BOM product
     * 
     * Performs BOM explosion to find bottleneck material
     * and maximum producible quantity
     *
     * @param string $productId
     * @param string $tenantId
     * @return array
     * @throws \InvalidArgumentException
     */
    public function calculateAvailableQuantity(string $productId, string $tenantId): array
    {
        // 1. Validate product exists and belongs to tenant
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$product) {
            throw new \InvalidArgumentException("Product not found or does not belong to this tenant");
        }

        // 2. Check inventory management type is 'bom'
        if (!isset($product->inventory_management_type) || $product->inventory_management_type !== 'bom') {
            throw new \InvalidArgumentException(
                "Product '{$product->name}' does not use BOM inventory management. " .
                "Current type: " . ($product->inventory_management_type ?? 'simple')
            );
        }

        // 3. Get active recipe for product
        $recipe = Recipe::where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with(['recipeMaterials.material'])
            ->first();

        if (!$recipe) {
            return [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'available_quantity' => 0,
                'recipe_id' => null,
                'recipe_name' => null,
                'can_produce' => false,
                'bottleneck_material' => null,
                'component_details' => [],
                'message' => 'No active recipe found for this product',
            ];
        }

        // 4-8. Perform BOM explosion calculation
        $explosion = $recipe->calculateMaxProducibleQuantity();

        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'available_quantity' => $explosion['max_quantity'],
            'recipe_id' => $recipe->id,
            'recipe_name' => $recipe->name,
            'can_produce' => $explosion['can_produce'],
            'bottleneck_material' => $explosion['limiting_material'],
            'component_details' => $explosion['all_materials_availability'],
            'yield_quantity' => $recipe->yield_quantity,
            'yield_unit' => $recipe->yield_unit,
        ];
    }

    /**
     * Bulk calculate availability for multiple products
     * 
     * More efficient than calling calculateAvailableQuantity() repeatedly
     * Uses eager loading to minimize queries
     *
     * @param array $productIds
     * @param string $tenantId
     * @return array
     */
    public function bulkCalculateAvailability(array $productIds, string $tenantId): array
    {
        // Validate input
        if (empty($productIds)) {
            return [];
        }

        // Eager load products with their active recipes and materials
        $products = Product::whereIn('id', $productIds)
            ->where('tenant_id', $tenantId)
            ->with([
                'recipes' => function ($query) {
                    $query->where('is_active', true)
                        ->with(['recipeMaterials.material']);
                }
            ])
            ->get();

        $results = [];

        foreach ($products as $product) {
            try {
                $result = $this->calculateAvailableQuantity($product->id, $tenantId);
                $results[$product->id] = $result;
            } catch (\Exception $e) {
                // Continue with other products even if one fails
                $results[$product->id] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'available_quantity' => 0,
                    'can_produce' => false,
                    'error' => $e->getMessage(),
                ];
            }
        }

        return $results;
    }

    /**
     * Check if specific quantity can be produced
     * 
     * @param string $productId
     * @param string $tenantId
     * @param int $requestedQuantity
     * @return array
     */
    public function checkProductionFeasibility(string $productId, string $tenantId, int $requestedQuantity): array
    {
        $availability = $this->calculateAvailableQuantity($productId, $tenantId);

        $isFeasible = $availability['available_quantity'] >= $requestedQuantity;

        return [
            'product_id' => $availability['product_id'],
            'product_name' => $availability['product_name'],
            'requested_quantity' => $requestedQuantity,
            'available_quantity' => $availability['available_quantity'],
            'is_feasible' => $isFeasible,
            'shortage' => $isFeasible ? 0 : ($requestedQuantity - $availability['available_quantity']),
            'bottleneck_material' => $availability['bottleneck_material'],
            'recipe_id' => $availability['recipe_id'],
        ];
    }

    /**
     * Get material requirements for producing specific quantity
     * 
     * Useful for planning and procurement
     *
     * @param string $productId
     * @param string $tenantId
     * @param int $quantity
     * @return array
     */
    public function getMaterialRequirements(string $productId, string $tenantId, int $quantity): array
    {
        // Get product with active recipe
        $product = Product::where('id', $productId)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$product) {
            throw new \InvalidArgumentException("Product not found");
        }

        $recipe = Recipe::where('product_id', $productId)
            ->where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->with(['recipeMaterials.material'])
            ->first();

        if (!$recipe) {
            throw new \InvalidArgumentException("No active recipe found for this product");
        }

        $requirements = [];
        $totalCost = 0;

        foreach ($recipe->recipeMaterials as $component) {
            $material = $component->material;
            $effectiveQty = $component->effective_quantity;
            $totalRequired = $effectiveQty * $quantity;
            $totalComponentCost = $totalRequired * $material->unit_cost;

            $requirements[] = [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'material_unit' => $material->unit,
                'quantity_per_unit' => $component->quantity_required,
                'waste_percentage' => $component->waste_percentage,
                'effective_quantity_per_unit' => $effectiveQty,
                'total_required' => $totalRequired,
                'current_stock' => $material->stock_quantity,
                'sufficient' => $material->stock_quantity >= $totalRequired,
                'shortage' => max(0, $totalRequired - $material->stock_quantity),
                'unit_cost' => $material->unit_cost,
                'total_cost' => round($totalComponentCost, 2),
            ];

            $totalCost += $totalComponentCost;
        }

        return [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'recipe_id' => $recipe->id,
            'recipe_name' => $recipe->name,
            'requested_quantity' => $quantity,
            'requirements' => $requirements,
            'total_cost' => round($totalCost, 2),
            'cost_per_unit' => round($totalCost / $quantity, 2),
        ];
    }

    /**
     * Get low stock materials that are used in active recipes
     * 
     * Helps prioritize which materials to restock
     *
     * @param string $tenantId
     * @return array
     */
    public function getLowStockMaterialsInActiveRecipes(string $tenantId): array
    {
        $lowStockMaterials = Material::forTenant($tenantId)
            ->lowStock()
            ->with([
                'recipeMaterials' => function ($query) {
                    $query->whereHas('recipe', function ($q) {
                        $q->where('is_active', true);
                    })->with(['recipe.product']);
                }
            ])
            ->get();

        $critical = [];

        foreach ($lowStockMaterials as $material) {
            $affectedProducts = [];
            
            foreach ($material->recipeMaterials as $recipeMaterial) {
                $recipe = $recipeMaterial->recipe;
                if ($recipe && $recipe->is_active) {
                    $affectedProducts[] = [
                        'product_id' => $recipe->product->id ?? null,
                        'product_name' => $recipe->product->name ?? null,
                        'recipe_id' => $recipe->id,
                        'recipe_name' => $recipe->name,
                    ];
                }
            }

            if (!empty($affectedProducts)) {
                $critical[] = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'current_stock' => $material->stock_quantity,
                    'reorder_level' => $material->reorder_level,
                    'unit' => $material->unit,
                    'stock_status' => $material->stock_status,
                    'affected_products' => $affectedProducts,
                    'priority' => $material->stock_status === 'critical' ? 'high' : 'medium',
                ];
            }
        }

        // Sort by priority (critical first)
        usort($critical, function ($a, $b) {
            if ($a['priority'] === 'high' && $b['priority'] !== 'high') {
                return -1;
            }
            if ($a['priority'] !== 'high' && $b['priority'] === 'high') {
                return 1;
            }
            return 0;
        });

        return $critical;
    }

    /**
     * Estimate production cost for a batch
     *
     * @param string $productId
     * @param string $tenantId
     * @param int $quantity
     * @return array
     */
    public function estimateProductionCost(string $productId, string $tenantId, int $quantity): array
    {
        $requirements = $this->getMaterialRequirements($productId, $tenantId, $quantity);

        return [
            'product_id' => $requirements['product_id'],
            'product_name' => $requirements['product_name'],
            'quantity' => $quantity,
            'total_material_cost' => $requirements['total_cost'],
            'cost_per_unit' => $requirements['cost_per_unit'],
            'recipe_used' => $requirements['recipe_name'],
        ];
    }
}