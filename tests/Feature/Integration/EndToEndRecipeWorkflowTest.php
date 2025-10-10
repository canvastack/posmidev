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
 * End-to-End Recipe Workflow Integration Test
 * 
 * Tests the complete recipe lifecycle:
 * 1. Create product
 * 2. Create materials
 * 3. Create recipe
 * 4. Add recipe components
 * 5. Activate recipe
 * 6. Calculate BOM (available quantity)
 * 7. Get cost breakdown
 * 8. Generate reports
 * 
 * Validates that all BOM recipe management and calculation features work together.
 */
class EndToEndRecipeWorkflowTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    public function test_complete_recipe_creation_to_bom_calculation_workflow(): void
    {
        // Step 1: Create a product
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Cappuccino',
            'inventory_management_type' => 'bom',
        ]);

        // Step 2: Create required materials
        $espresso = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Espresso Beans',
            'unit' => 'g',
            'stock_quantity' => 5000,
            'unit_cost' => 0.05,
        ]);

        $milk = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Fresh Milk',
            'unit' => 'ml',
            'stock_quantity' => 10000,
            'unit_cost' => 0.01,
        ]);

        $sugar = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'White Sugar',
            'unit' => 'g',
            'stock_quantity' => 2000,
            'unit_cost' => 0.002,
        ]);

        // Step 3: Create recipe via API
        $recipeData = [
            'product_id' => $product->id,
            'name' => 'Cappuccino Recipe v1',
            'yield_quantity' => 1,
            'yield_unit' => 'serving',
            'instructions' => 'Brew espresso, steam milk, combine',
        ];

        $recipeResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes",
            $recipeData,
            $this->authenticatedRequest()['headers']
        );

        $recipeResponse->assertCreated()
            ->assertJsonPath('data.name', 'Cappuccino Recipe v1');

        $recipeId = $recipeResponse->json('data.id');

        // Step 4: Add recipe components via API
        // Component 1: Espresso (20g with 2% waste)
        $component1Response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipeId}/components",
            [
                'material_id' => $espresso->id,
                'quantity_required' => 20,
                'unit' => 'g',
                'waste_percentage' => 2,
                'notes' => 'Double shot espresso',
            ],
            $this->authenticatedRequest()['headers']
        );
        $component1Response->assertCreated();

        // Component 2: Milk (150ml with 5% waste for foam)
        $component2Response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipeId}/components",
            [
                'material_id' => $milk->id,
                'quantity_required' => 150,
                'unit' => 'ml',
                'waste_percentage' => 5,
                'notes' => 'Steamed milk with foam',
            ],
            $this->authenticatedRequest()['headers']
        );
        $component2Response->assertCreated();

        // Component 3: Sugar (5g with 0% waste)
        $component3Response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipeId}/components",
            [
                'material_id' => $sugar->id,
                'quantity_required' => 5,
                'unit' => 'g',
                'waste_percentage' => 0,
                'notes' => 'Optional sweetener',
            ],
            $this->authenticatedRequest()['headers']
        );
        $component3Response->assertCreated();

        // Step 5: Get recipe cost breakdown
        $costResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipeId}/cost-breakdown",
            $this->authenticatedRequest()['headers']
        );

        $costResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'recipe_id',
                    'recipe_name',
                    'total_cost',
                    'cost_per_unit',
                    'yield_quantity',
                    'yield_unit',
                    'components',
                ],
            ]);

        // Verify cost calculation
        // Espresso: 20 * 1.02 * 0.05 = 1.02
        // Milk: 150 * 1.05 * 0.01 = 1.575
        // Sugar: 5 * 1.00 * 0.002 = 0.01
        // Total: 2.605
        $totalCost = $costResponse->json('data.total_cost');
        $this->assertEqualsWithDelta(2.605, $totalCost, 0.01);

        // Step 6: Activate recipe
        $activateResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipeId}/activate",
            [],
            $this->authenticatedRequest()['headers']
        );

        $activateResponse->assertOk()
            ->assertJsonPath('data.is_active', true);

        // Step 7: Calculate available quantity (BOM explosion)
        $bomResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        $bomResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'product_id',
                    'product_name',
                    'available_quantity',
                    'bottleneck_material',
                    'component_details',
                ],
            ]);

        // Calculate expected available quantity
        // Espresso: 5000 / (20 * 1.02) = 245.09
        // Milk: 10000 / (150 * 1.05) = 63.49
        // Sugar: 2000 / (5 * 1.00) = 400
        // Limiting: Milk = 63
        $availableQty = $bomResponse->json('data.available_quantity');
        $this->assertEquals(63, $availableQty);
        $this->assertEquals($milk->name, $bomResponse->json('data.bottleneck_material.material_name'));

        // Step 8: Check production capacity
        $capacityResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/production-capacity",
            $this->authenticatedRequest()['headers']
        );

        $capacityResponse->assertOk();
        $this->assertEquals(63, $capacityResponse->json('data.max_producible_quantity'));

        // Step 9: Generate recipe costing report
        $reportResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/recipe-costing",
            $this->authenticatedRequest()['headers']
        );

        $reportResponse->assertOk();
        $recipes = collect($reportResponse->json('data.recipes'));
        $cappuccinoRecipe = $recipes->firstWhere('recipe_id', $recipeId);
        $this->assertNotNull($cappuccinoRecipe);
        $this->assertEqualsWithDelta(2.605, $cappuccinoRecipe['total_cost'], 0.01);
    }

    public function test_recipe_update_and_recalculation(): void
    {
        // Create product and materials
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Latte',
            'inventory_management_type' => 'bom',
        ]);

        $coffee = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Coffee',
            'unit' => 'g',
            'stock_quantity' => 1000,
            'unit_cost' => 0.05,
        ]);

        $milk = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Milk',
            'unit' => 'ml',
            'stock_quantity' => 2000,
            'unit_cost' => 0.01,
        ]);

        // Create initial recipe
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $coffee->id,
            'quantity_required' => 15,
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $milk->id,
            'quantity_required' => 200,
            'waste_percentage' => 0,
            'unit' => 'ml',
        ]);

        // Initial BOM calculation
        $initialBomResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        $initialAvailable = $initialBomResponse->json('data.available_quantity');
        $this->assertEquals(10, $initialAvailable); // 2000ml / 200ml = 10

        // Update component - increase milk requirement
        $component = $recipe->recipeMaterials()->where('material_id', $milk->id)->first();
        $updateResponse = $this->putJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components/{$component->id}",
            [
                'quantity_required' => 250, // Changed from 200 to 250
            ],
            $this->authenticatedRequest()['headers']
        );

        $updateResponse->assertOk();

        // Recalculate BOM - should show lower available quantity
        $updatedBomResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        $updatedAvailable = $updatedBomResponse->json('data.available_quantity');
        $this->assertEquals(8, $updatedAvailable); // 2000ml / 250ml = 8
    }

    public function test_multiple_recipes_for_same_product(): void
    {
        // Create product
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Mocha',
            'inventory_management_type' => 'bom',
        ]);

        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 1000,
            'unit_cost' => 10.00,
        ]);

        // Create Recipe v1
        $recipeV1 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'name' => 'Mocha Recipe v1',
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipeV1->id,
            'material_id' => $material->id,
            'quantity_required' => 50,
            'waste_percentage' => 0,
        ]);

        // Create Recipe v2 (more efficient)
        $recipeV2Response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes",
            [
                'product_id' => $product->id,
                'name' => 'Mocha Recipe v2 - Optimized',
                'yield_quantity' => 1,
                'yield_unit' => 'serving',
            ],
            $this->authenticatedRequest()['headers']
        );

        $recipeV2Id = $recipeV2Response->json('data.id');

        // Add component with less material (more efficient)
        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipeV2Id}/components",
            [
                'material_id' => $material->id,
                'quantity_required' => 40, // Less than v1
                'unit' => 'g',
                'waste_percentage' => 0,
            ],
            $this->authenticatedRequest()['headers']
        );

        // Activate v2 (should deactivate v1)
        $activateResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipeV2Id}/activate",
            [],
            $this->authenticatedRequest()['headers']
        );

        $activateResponse->assertOk();

        // Verify v1 is now inactive
        $recipeListResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes?product_id={$product->id}",
            $this->authenticatedRequest()['headers']
        );

        $recipes = collect($recipeListResponse->json('data'));
        $v1 = $recipes->firstWhere('id', $recipeV1->id);
        $v2 = $recipes->firstWhere('id', $recipeV2Id);

        $this->assertNotNull($v1, 'Recipe V1 not found in list');
        $this->assertNotNull($v2, 'Recipe V2 not found in list');
        $this->assertFalse($v1['is_active']);
        $this->assertTrue($v2['is_active']);

        // BOM calculation should use v2 (active recipe)
        $bomResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        // With v2: 1000 / 40 = 25
        // With v1 would be: 1000 / 50 = 20
        $this->assertEquals(25, $bomResponse->json('data.available_quantity'));
    }

    public function test_recipe_component_removal_and_bom_impact(): void
    {
        // Create product
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Smoothie',
            'inventory_management_type' => 'bom',
        ]);

        $banana = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Banana',
            'stock_quantity' => 100,
            'unit' => 'pcs',
        ]);

        $strawberry = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Strawberry',
            'stock_quantity' => 50,
            'unit' => 'pcs',
        ]);

        $milk = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Milk',
            'stock_quantity' => 5000,
            'unit' => 'ml',
        ]);

        // Create recipe with 3 components
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $bananaComponent = RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $banana->id,
            'quantity_required' => 2,
            'waste_percentage' => 0,
            'unit' => 'pcs',
        ]);

        $strawberryComponent = RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $strawberry->id,
            'quantity_required' => 5,
            'waste_percentage' => 0,
            'unit' => 'pcs',
        ]);

        $milkComponent = RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $milk->id,
            'quantity_required' => 200,
            'waste_percentage' => 0,
            'unit' => 'ml',
        ]);

        // Initial BOM: limited by strawberry (50 / 5 = 10)
        $initialBomResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        $this->assertEquals(10, $initialBomResponse->json('data.available_quantity'));
        $this->assertEquals('Strawberry', $initialBomResponse->json('data.bottleneck_material.material_name'));

        // Remove strawberry component
        $removeResponse = $this->deleteJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components/{$strawberryComponent->id}",
            [],
            $this->authenticatedRequest()['headers']
        );

        $removeResponse->assertOk();

        // Recalculate BOM: now limited by banana (100 / 2 = 50)
        $updatedBomResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        $this->assertEquals(25, $updatedBomResponse->json('data.available_quantity')); // 5000ml / 200ml = 25
        $this->assertEquals('Milk', $updatedBomResponse->json('data.bottleneck_material.material_name'));
    }

    public function test_recipe_with_waste_percentage_impact(): void
    {
        // Create product
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Grilled Sandwich',
            'inventory_management_type' => 'bom',
        ]);

        $bread = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Bread Slices',
            'stock_quantity' => 100,
            'unit' => 'pcs',
            'unit_cost' => 0.50,
        ]);

        // Create recipe WITHOUT waste
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $component = RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $bread->id,
            'quantity_required' => 2,
            'waste_percentage' => 0,
            'unit' => 'pcs',
        ]);

        // BOM without waste: 100 / 2 = 50
        $noWasteResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        $this->assertEquals(50, $noWasteResponse->json('data.available_quantity'));

        // Update component to add 10% waste
        $updateResponse = $this->putJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components/{$component->id}",
            [
                'waste_percentage' => 10, // Trimming crusts, etc.
            ],
            $this->authenticatedRequest()['headers']
        );

        $updateResponse->assertOk();

        // BOM with 10% waste: 100 / (2 * 1.10) = 45.45 = 45
        $withWasteResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        $this->assertEquals(45, $withWasteResponse->json('data.available_quantity'));

        // Check cost impact
        $costResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/cost-breakdown",
            $this->authenticatedRequest()['headers']
        );

        // Cost with waste: 2 * 1.10 * 0.50 = 1.10
        $this->assertEqualsWithDelta(1.10, $costResponse->json('data.total_cost'), 0.01);
    }
}