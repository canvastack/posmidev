<?php

namespace Tests\Feature\Integration;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;

/**
 * Multi-Product Production Scenario Integration Test
 * 
 * Tests complex scenarios involving multiple products sharing materials:
 * 1. Shared material pool across products
 * 2. Batch planning for multiple products
 * 3. Material constraint analysis
 * 4. Production prioritization
 * 5. Optimal batch size calculation
 * 
 * Validates that BOM engine correctly handles real-world cafe/restaurant scenarios.
 */
class MultiProductProductionScenarioTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    public function test_multiple_products_sharing_same_materials(): void
    {
        // Scenario: Cafe with 3 coffee drinks sharing espresso beans and milk
        
        // Step 1: Create shared materials
        $espresso = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Espresso Beans',
            'unit' => 'g',
            'stock_quantity' => 1000, // 1kg
            'unit_cost' => 0.05,
        ]);

        $milk = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Milk',
            'unit' => 'ml',
            'stock_quantity' => 5000, // 5L
            'unit_cost' => 0.01,
        ]);

        $chocolate = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Chocolate Syrup',
            'unit' => 'ml',
            'stock_quantity' => 500,
            'unit_cost' => 0.03,
        ]);

        // Step 2: Create 3 products with recipes

        // Product 1: Espresso (uses only espresso beans)
        $espressoProduct = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Espresso',
            'inventory_management_type' => 'bom',
        ]);

        $espressoRecipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $espressoProduct->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $espressoRecipe->id,
            'material_id' => $espresso->id,
            'quantity_required' => 18,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        // Product 2: Latte (uses espresso + milk)
        $latteProduct = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Latte',
            'inventory_management_type' => 'bom',
        ]);

        $latteRecipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $latteProduct->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $latteRecipe->id,
            'material_id' => $espresso->id,
            'quantity_required' => 18,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $latteRecipe->id,
            'material_id' => $milk->id,
            'quantity_required' => 200,
            'waste_percentage' => 0,
            'unit' => 'ml',
        ]);

        // Product 3: Mocha (uses espresso + milk + chocolate)
        $mochaProduct = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Mocha',
            'inventory_management_type' => 'bom',
        ]);

        $mochaRecipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $mochaProduct->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $mochaRecipe->id,
            'material_id' => $espresso->id,
            'quantity_required' => 18,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $mochaRecipe->id,
            'material_id' => $milk->id,
            'quantity_required' => 180,
            'waste_percentage' => 0,
            'unit' => 'ml',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $mochaRecipe->id,
            'material_id' => $chocolate->id,
            'quantity_required' => 30,
            'waste_percentage' => 0,
            'unit' => 'ml',
        ]);

        // Step 3: Check bulk availability for all products
        $bulkResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/bulk-availability",
            [
                'product_ids' => [
                    $espressoProduct->id,
                    $latteProduct->id,
                    $mochaProduct->id,
                ],
            ],
            $this->authenticatedRequest()['headers']
        );

        $bulkResponse->assertOk();

        $results = collect($bulkResponse->json('data'));

        // Espresso: 1000g / 18g = 55
        $espressoResult = $results->firstWhere('product_id', $espressoProduct->id);
        $this->assertEquals(55, $espressoResult['available_quantity']);

        // Latte: Limited by milk (5000ml / 200ml = 25) vs espresso (1000g / 18g = 55)
        $latteResult = $results->firstWhere('product_id', $latteProduct->id);
        $this->assertEquals(25, $latteResult['available_quantity']);
        $this->assertEquals('Milk', $latteResult['bottleneck_material']['material_name']);

        // Mocha: Limited by chocolate (500ml / 30ml = 16) vs espresso (55) vs milk (27)
        $mochaResult = $results->firstWhere('product_id', $mochaProduct->id);
        $this->assertEquals(16, $mochaResult['available_quantity']);
        $this->assertEquals('Chocolate Syrup', $mochaResult['bottleneck_material']['material_name']);
    }

    public function test_multi_product_batch_planning(): void
    {
        // Scenario: Plan production for morning rush - 20 lattes, 15 cappuccinos
        
        // Create shared materials
        $coffee = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Coffee Beans',
            'unit' => 'g',
            'stock_quantity' => 2000,
            'unit_cost' => 0.05,
        ]);

        $milk = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Milk',
            'unit' => 'ml',
            'stock_quantity' => 8000,
            'unit_cost' => 0.01,
        ]);

        // Create Latte
        $latte = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Latte',
            'inventory_management_type' => 'bom',
        ]);

        $latteRecipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $latte->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $latteRecipe->id,
            'material_id' => $coffee->id,
            'quantity_required' => 20,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $latteRecipe->id,
            'material_id' => $milk->id,
            'quantity_required' => 250,
            'waste_percentage' => 0,
            'unit' => 'ml',
        ]);

        // Create Cappuccino
        $cappuccino = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Cappuccino',
            'inventory_management_type' => 'bom',
        ]);

        $cappuccinoRecipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $cappuccino->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $cappuccinoRecipe->id,
            'material_id' => $coffee->id,
            'quantity_required' => 18,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $cappuccinoRecipe->id,
            'material_id' => $milk->id,
            'quantity_required' => 150,
            'waste_percentage' => 0,
            'unit' => 'ml',
        ]);

        // Calculate multi-product batch plan
        $planResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/multi-product-plan",
            [
                'products' => [
                    [
                        'product_id' => $latte->id,
                        'quantity' => 20,
                    ],
                    [
                        'product_id' => $cappuccino->id,
                        'quantity' => 15,
                    ],
                ],
            ],
            $this->authenticatedRequest()['headers']
        );

        $planResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_feasible',
                    'total_products',
                    'aggregated_material_requirements',
                    'material_shortages',
                ],
            ]);

        $this->assertTrue($planResponse->json('data.is_feasible'));

        // Verify material requirements
        // Coffee needed: (20 * 20g) + (15 * 18g) = 400 + 270 = 670g (have 2000g) ✓
        // Milk needed: (20 * 250ml) + (15 * 150ml) = 5000 + 2250 = 7250ml (have 8000ml) ✓
        
        $materials = collect($planResponse->json('data.aggregated_material_requirements'));
        
        $coffeeReq = $materials->firstWhere('material_name', 'Coffee Beans');
        $this->assertEquals(670, $coffeeReq['total_required']);
        $this->assertTrue($coffeeReq['is_sufficient']);

        $milkReq = $materials->firstWhere('material_name', 'Milk');
        $this->assertEquals(7250, $milkReq['total_required']);
        $this->assertTrue($milkReq['is_sufficient']);
    }

    public function test_multi_product_batch_with_insufficient_materials(): void
    {
        // Scenario: Try to produce more than materials allow
        
        $ingredient = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Special Ingredient',
            'unit' => 'g',
            'stock_quantity' => 100, // Only 100g available
            'unit_cost' => 1.00,
        ]);

        // Product A needs 40g
        $productA = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Product A',
            'inventory_management_type' => 'bom',
        ]);

        $recipeA = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $productA->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipeA->id,
            'material_id' => $ingredient->id,
            'quantity_required' => 40,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        // Product B needs 30g
        $productB = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Product B',
            'inventory_management_type' => 'bom',
        ]);

        $recipeB = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $productB->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipeB->id,
            'material_id' => $ingredient->id,
            'quantity_required' => 30,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        // Try to make 2 of A and 2 of B = (2*40) + (2*30) = 160g (need 100g only)
        $planResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/multi-product-plan",
            [
                'products' => [
                    ['product_id' => $productA->id, 'quantity' => 2],
                    ['product_id' => $productB->id, 'quantity' => 2],
                ],
            ],
            $this->authenticatedRequest()['headers']
        );

        $planResponse->assertOk();
        
        $this->assertFalse($planResponse->json('data.is_feasible'));
        $this->assertNotEmpty($planResponse->json('data.material_shortages'));

        $insufficient = collect($planResponse->json('data.material_shortages'));
        $ingredientShortage = $insufficient->firstWhere('material_name', 'Special Ingredient');
        
        $this->assertNotNull($ingredientShortage);
        $this->assertEquals(140, $ingredientShortage['total_required']); // (2*40) + (2*30) = 140g
        $this->assertEquals(100, $ingredientShortage['current_stock']);
        $this->assertEquals(40, $ingredientShortage['shortage']); // 140 - 100 = 40
    }

    public function test_optimal_batch_size_calculation(): void
    {
        // Scenario: Find optimal batch size based on material constraints
        
        $material1 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Material 1',
            'stock_quantity' => 1000,
            'unit' => 'g',
        ]);

        $material2 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Material 2',
            'stock_quantity' => 600,
            'unit' => 'ml',
        ]);

        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'inventory_management_type' => 'bom',
        ]);

        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material1->id,
            'quantity_required' => 50,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material2->id,
            'quantity_required' => 40,
            'waste_percentage' => 0,
            'unit' => 'ml',
        ]);

        // Find optimal batch size (min: 5, max: 20, target: 15)
        $optimalResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/optimal-batch-size",
            [
                'product_id' => $product->id,
                'min_quantity' => 5,
                'max_quantity' => 20,
                'target_quantity' => 15,
            ],
            $this->authenticatedRequest()['headers']
        );

        $optimalResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'product_id',
                    'product_name',
                    'maximum_producible',
                    'bottleneck_material',
                    'suggested_batches',
                    'recommendation',
                ],
            ]);

        // Material 1: 1000 / 50 = 20
        // Material 2: 600 / 40 = 15
        // Maximum producible = 15 (limited by material 2)
        $this->assertEquals(15, $optimalResponse->json('data.maximum_producible'));
        $this->assertEquals('Material 2', $optimalResponse->json('data.bottleneck_material.material_name'));
        $this->assertNotEmpty($optimalResponse->json('data.suggested_batches'));
        $this->assertNotEmpty($optimalResponse->json('data.recommendation'));
    }

    public function test_production_efficiency_report_for_multiple_products(): void
    {
        // Create multiple products with different efficiency profiles
        
        $sharedMaterial = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Shared Material',
            'stock_quantity' => 1000,
            'unit_cost' => 10.00,
            'unit' => 'g',
        ]);

        // Efficient product (low waste)
        $efficientProduct = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Efficient Product',
            'inventory_management_type' => 'bom',
        ]);

        $efficientRecipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $efficientProduct->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $efficientRecipe->id,
            'material_id' => $sharedMaterial->id,
            'quantity_required' => 10,
            'waste_percentage' => 2, // Only 2% waste
            'unit' => 'g',
        ]);

        // Wasteful product (high waste)
        $wastefulProduct = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Wasteful Product',
            'inventory_management_type' => 'bom',
        ]);

        $wastefulRecipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $wastefulProduct->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $wastefulRecipe->id,
            'material_id' => $sharedMaterial->id,
            'quantity_required' => 10,
            'waste_percentage' => 20, // 20% waste - needs optimization
            'unit' => 'g',
        ]);

        // Get production efficiency report
        $reportResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/production-efficiency",
            $this->authenticatedRequest()['headers']
        );

        $reportResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'report_type',
                    'summary',
                    'efficiency_data',
                    'top_efficient_products',
                    'least_efficient_products',
                ],
            ]);

        // Verify efficiency rankings
        $topEfficient = collect($reportResponse->json('data.top_efficient_products'));
        $leastEfficient = collect($reportResponse->json('data.least_efficient_products'));

        $this->assertTrue($topEfficient->contains('product_name', 'Efficient Product'));
        $this->assertTrue($leastEfficient->contains('product_name', 'Wasteful Product'));
    }

    public function test_batch_requirements_with_cost_estimate(): void
    {
        // Scenario: Calculate exact material needs and cost for batch production
        
        $flour = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Flour',
            'stock_quantity' => 6000,
            'unit_cost' => 0.005,
            'unit' => 'g',
        ]);

        $sugar = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sugar',
            'stock_quantity' => 3000, // Increased: needs 2550g for batch of 50
            'unit_cost' => 0.01,
            'unit' => 'g',
        ]);

        $butter = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Butter',
            'stock_quantity' => 2000, // Increased: needs 1545g for batch of 50
            'unit_cost' => 0.02,
            'unit' => 'g',
        ]);

        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Cookies',
            'inventory_management_type' => 'bom',
        ]);

        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $flour->id,
            'quantity_required' => 100,
            'waste_percentage' => 5,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $sugar->id,
            'quantity_required' => 50,
            'waste_percentage' => 2,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $butter->id,
            'quantity_required' => 30,
            'waste_percentage' => 3,
            'unit' => 'g',
        ]);

        // Calculate requirements for batch of 50
        $batchResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/batch-requirements",
            [
                'product_id' => $product->id,
                'quantity' => 50,
            ],
            $this->authenticatedRequest()['headers']
        );

        $batchResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'product_id',
                    'product_name',
                    'recipe_id',
                    'recipe_name',
                    'requested_quantity',
                    'can_produce',
                    'material_requirements',
                    'shortages',
                    'cost_analysis',
                ],
            ]);

        $this->assertTrue($batchResponse->json('data.can_produce'));

        // Verify calculations
        $materials = collect($batchResponse->json('data.material_requirements'));
        
        // Flour: 50 * (100 * 1.05) = 5250g
        $flourReq = $materials->firstWhere('material_name', 'Flour');
        $this->assertEquals(5250, $flourReq['total_required']);
        $this->assertEquals(0.005, $flourReq['unit_cost'], 'Flour unit cost should be 0.005');
        $this->assertEqualsWithDelta(26.25, $flourReq['total_cost'], 0.01, 'Flour total cost should be 26.25');
        
        // Sugar: 50 * (50 * 1.02) = 2550g
        $sugarReq = $materials->firstWhere('material_name', 'Sugar');
        $this->assertEquals(2550, $sugarReq['total_required']);
        $this->assertEquals(0.01, $sugarReq['unit_cost'], 'Sugar unit cost should be 0.01');
        $this->assertEqualsWithDelta(25.50, $sugarReq['total_cost'], 0.01, 'Sugar total cost should be 25.50');
        
        // Butter: 50 * (30 * 1.03) = 1545g
        $butterReq = $materials->firstWhere('material_name', 'Butter');
        $this->assertEquals(1545, $butterReq['total_required']);
        $this->assertEquals(0.02, $butterReq['unit_cost'], 'Butter unit cost should be 0.02');
        $this->assertEqualsWithDelta(30.90, $butterReq['total_cost'], 0.01, 'Butter total cost should be 30.90');

        // Total cost: (5250 * 0.005) + (2550 * 0.01) + (1545 * 0.02)
        //           = 26.25 + 25.50 + 30.90 = 82.65
        $this->assertEqualsWithDelta(82.65, $batchResponse->json('data.cost_analysis.total_material_cost'), 0.01);
    }
}