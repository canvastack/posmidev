<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BOM\BulkAvailabilityRequest;
use Src\Pms\Core\Services\InventoryCalculationService;
use Src\Pms\Infrastructure\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BOMCalculationController extends Controller
{
    public function __construct(
        private InventoryCalculationService $inventoryCalculationService
    ) {}

    /**
     * Get available quantity for a product based on current material stock.
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function availableQuantity(Request $request, string $tenantId, string $productId): JsonResponse
    {
        if (!auth()->user()->can('bom.calculate')) {
            abort(403, 'Unauthorized');
        }

        try {
            $result = $this->inventoryCalculationService->calculateAvailableQuantity($productId, $tenantId);

            return response()->json([
                'success' => true,
                'data' => $result,
            ]);
        } catch (\InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'not found') || str_contains($e->getMessage(), 'does not belong')) {
                abort(404, $e->getMessage());
            }
            throw $e;
        }
    }

    /**
     * Get available quantities for multiple products.
     * 
     * @param BulkAvailabilityRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function bulkAvailability(BulkAvailabilityRequest $request, string $tenantId): JsonResponse
    {
        if (!auth()->user()->can('bom.calculate')) {
            abort(403, 'Unauthorized');
        }

        $productIds = $request->validated('product_ids');
        $results = [];
        $errors = [];

        foreach ($productIds as $productId) {
            try {
                $results[$productId] = $this->inventoryCalculationService->calculateAvailableQuantity($productId, $tenantId);
            } catch (\InvalidArgumentException $e) {
                // Skip products that don't exist or don't have recipes
                $errors[$productId] = $e->getMessage();
                \Log::debug("BOM calculation skipped for product {$productId}: " . $e->getMessage());
                continue;
            } catch (\Exception $e) {
                // Log unexpected errors but don't fail the whole request
                $errors[$productId] = 'Calculation failed';
                \Log::error("BOM calculation error for product {$productId}: " . $e->getMessage());
                continue;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results,
                'errors' => $errors,
            ],
        ]);
    }

    /**
     * Get production capacity forecast for a product.
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $productId
     * @return JsonResponse
     */
    public function productionCapacity(Request $request, string $tenantId, string $productId): JsonResponse
    {
        if (!auth()->user()->can('bom.calculate')) {
            abort(403, 'Unauthorized');
        }

        try {
            $result = $this->inventoryCalculationService->calculateAvailableQuantity($productId, $tenantId);
            
            // Get product details
            $product = Product::forTenant($tenantId)
                ->with('activeRecipe.components.material')
                ->findOrFail($productId);

            // Calculate production capacity metrics
            $availableQuantity = $result['available_quantity'];
            $recipe = $product->activeRecipe;
            
            $capacity = [
                'product_id' => $productId,
                'product_name' => $product->name,
                'available_quantity' => $availableQuantity,
                'max_producible_quantity' => $availableQuantity, // Alias for consistency
                'unit' => $recipe ? $recipe->yield_unit : 'pcs',
                'recipe_id' => $recipe ? $recipe->id : null,
                'bottleneck_material' => $result['bottleneck_material'] ?? null,
                'can_produce' => $availableQuantity > 0,
                'stock_status' => $this->getStockStatus($availableQuantity),
                'components_status' => $recipe ? $this->getComponentsStatus($recipe) : [],
            ];

            return response()->json([
                'success' => true,
                'data' => $capacity,
            ]);
        } catch (\InvalidArgumentException $e) {
            if (str_contains($e->getMessage(), 'not found') || str_contains($e->getMessage(), 'does not belong')) {
                abort(404, $e->getMessage());
            }
            throw $e;
        }
    }

    /**
     * Get stock status label based on available quantity.
     */
    private function getStockStatus(float $availableQuantity): string
    {
        if ($availableQuantity <= 0) {
            return 'out_of_stock';
        } elseif ($availableQuantity < 10) {
            return 'low_stock';
        } elseif ($availableQuantity < 50) {
            return 'moderate_stock';
        } else {
            return 'in_stock';
        }
    }

    /**
     * Get status of each component material.
     */
    private function getComponentsStatus($recipe): array
    {
        $components = [];
        
        foreach ($recipe->components as $component) {
            $material = $component->material;
            $requiredQty = $component->effective_quantity;
            $availableQty = $material->stock_quantity;
            $canProduce = $availableQty > 0 ? floor($availableQty / $requiredQty) : 0;
            
            $components[] = [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'required_per_unit' => $requiredQty,
                'available_stock' => $availableQty,
                'can_produce_units' => $canProduce,
                'unit' => $material->unit,
                'is_limiting' => false, // Will be updated by caller
            ];
        }
        
        return $components;
    }
}