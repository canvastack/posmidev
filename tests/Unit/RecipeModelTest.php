<?php

namespace Tests\Unit;

use Tests\TestCase;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;

/**
 * Recipe Model Unit Tests
 * 
 * Tests model methods, relationships, business logic, and BOM explosion algorithm.
 * Part of BOM Engine Phase 1 - Day 5: Model Tests
 */
class RecipeModelTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected Tenant $otherTenant;
    protected Product $product;
    protected Material $material1;
    protected Material $material2;
    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        // Create test tenants
        $this->tenant = Tenant::create([
            'id' => Str::uuid(),
            'name' => 'Test Tenant',
            'code' => 'TEST',
            'status' => 'active',
        ]);

        $this->otherTenant = Tenant::create([
            'id' => Str::uuid(),
            'name' => 'Other Tenant',
            'code' => 'OTHER',
            'status' => 'active',
        ]);

        // Create test product
        $this->product = Product::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'code' => 'PROD-001',
            'sku' => 'SKU-001',
            'price' => 100,
            'stock' => 10,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        // Create test materials
        $this->material1 = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-001',
            'name' => 'Material 1',
            'unit' => 'kg',
            'unit_cost' => 10.0,
            'stock_quantity' => 100.0,
        ]);

        $this->material2 = Material::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'sku' => 'MAT-002',
            'name' => 'Material 2',
            'unit' => 'L',
            'unit_cost' => 5.0,
            'stock_quantity' => 200.0,
        ]);

        // Create test user
        $this->user = User::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test User',
            'email' => 'test@recipe.com',
            'password' => bcrypt('password'),
        ]);
    }

    /** @test */
    public function it_uses_uuid_as_primary_key()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $this->assertIsString($recipe->id);
        $this->assertEquals(36, strlen($recipe->id));
    }

    /** @test */
    public function it_requires_tenant_id()
    {
        $this->expectException(\Illuminate\Database\QueryException::class);

        Recipe::create([
            'id' => Str::uuid(),
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);
    }

    /** @test */
    public function it_has_tenant_relationship()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        $this->assertInstanceOf(Tenant::class, $recipe->tenant);
        $this->assertEquals($this->tenant->id, $recipe->tenant->id);
    }

    /** @test */
    public function it_has_product_relationship()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        $this->assertInstanceOf(Product::class, $recipe->product);
        $this->assertEquals($this->product->id, $recipe->product->id);
    }

    /** @test */
    public function it_has_recipe_materials_relationship()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 5.0,
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material2->id,
            'quantity_required' => 3.0,
        ]);

        $this->assertCount(2, $recipe->recipeMaterials);
    }

    /** @test */
    public function it_soft_deletes_correctly()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        $recipeId = $recipe->id;
        $recipe->delete();

        $this->assertNull(Recipe::find($recipeId));
        $this->assertNotNull(Recipe::withTrashed()->find($recipeId));

        Recipe::withTrashed()->find($recipeId)->restore();
        $this->assertNotNull(Recipe::find($recipeId));
    }

    /** @test */
    public function it_activates_recipe_and_deactivates_others()
    {
        $recipe1 = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 1',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        $recipe2 = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 2',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        // Activate recipe2
        $recipe2->activate();

        // Refresh both recipes
        $recipe1->refresh();
        $recipe2->refresh();

        // Only recipe2 should be active
        $this->assertFalse($recipe1->is_active);
        $this->assertTrue($recipe2->is_active);
    }

    /** @test */
    public function it_enforces_one_active_recipe_per_product()
    {
        $recipe1 = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 1',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        $recipe2 = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 2',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        // After creation, both might be active, but activate() should enforce single active
        $recipe2->activate();

        $activeRecipes = Recipe::where('product_id', $this->product->id)
            ->where('is_active', true)
            ->count();

        $this->assertEquals(1, $activeRecipes);
    }

    /** @test */
    public function it_calculates_total_cost_correctly()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        // Add materials to recipe
        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 5.0, // 5 kg * 10.0 = 50.0
            'waste_percentage' => 10.0, // 5 * 1.1 = 5.5 kg effective
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material2->id,
            'quantity_required' => 3.0, // 3 liter * 5.0 = 15.0
            'waste_percentage' => 0.0,
        ]);

        $totalCost = $recipe->calculateTotalCost();

        // Material1: 5.5 kg * 10.0 = 55.0
        // Material2: 3.0 liter * 5.0 = 15.0
        // Total: 70.0
        $this->assertEquals(70.0, $totalCost);
    }

    /** @test */
    public function it_calculates_cost_per_unit_correctly()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 10.0, 'yield_unit' => 'pcs', // Recipe produces 10 units
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 5.0,
            'waste_percentage' => 0.0,
        ]);

        // Total cost: 5 * 10 = 50.0
        // Yield: 10 units
        // Cost per unit: 50.0 / 10 = 5.0
        $costPerUnit = $recipe->cost_per_unit;
        $this->assertEquals(5.0, $costPerUnit);
    }

    /** @test */
    public function it_checks_material_sufficiency()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 50.0, // Material has 100 in stock
        ]);

        // Sufficient for 1 batch
        $sufficiency = $recipe->checkSufficiency(1);
        $this->assertTrue($sufficiency['sufficient']);

        // Sufficient for 2 batches (2 * 50 = 100)
        $sufficiency = $recipe->checkSufficiency(2);
        $this->assertTrue($sufficiency['sufficient']);

        // Insufficient for 3 batches (3 * 50 = 150 > 100)
        $sufficiency = $recipe->checkSufficiency(3);
        $this->assertFalse($sufficiency['sufficient']);
    }

    /** @test */
    public function it_calculates_max_producible_quantity()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        // Material1: 100 kg available, 10 kg required per batch = 10 batches max
        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 10.0,
            'waste_percentage' => 0.0,
        ]);

        // Material2: 200 liter available, 25 liter required per batch = 8 batches max
        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material2->id,
            'quantity_required' => 25.0,
            'waste_percentage' => 0.0,
        ]);

        $result = $recipe->calculateMaxProducibleQuantity();

        // Bottleneck is Material2 with 8 batches
        $this->assertEquals(8, $result['max_quantity']);
        $this->assertEquals($this->material2->id, $result['limiting_material']['material_id']);
    }

    /** @test */
    public function it_deducts_materials_for_production()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 10.0,
        ]);

        $initialStock = $this->material1->stock_quantity;

        $recipe->deductMaterialsForProduction(
            2,
            $this->user,
            'order',
            Str::uuid(),
            'Production for order #123'
        );

        $this->material1->refresh();
        $expectedStock = $initialStock - (10.0 * 2);
        $this->assertEquals($expectedStock, $this->material1->stock_quantity);
    }

    /** @test */
    public function it_prevents_production_with_insufficient_materials()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        RecipeMaterial::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 60.0, // Material has 100 in stock
        ]);

        $this->expectException(\RuntimeException::class);

        // Try to produce 3 batches (3 * 60 = 180 > 100)
        $recipe->deductMaterialsForProduction(
            3,
            $this->user
        );
    }

    /** @test */
    public function it_can_check_if_deletable()
    {
        $inactiveRecipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Inactive Recipe',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $this->assertTrue($inactiveRecipe->canBeDeleted());

        $activeRecipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Active Recipe',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        $this->assertFalse($activeRecipe->canBeDeleted());
    }

    /** @test */
    public function it_scopes_to_tenant_correctly()
    {
        $recipe1 = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Tenant 1 Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        $otherProduct = Product::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->otherTenant->id,
            'name' => 'Other Product',
            'code' => 'PROD-002',
            'sku' => 'SKU-002',
            'price' => 100,
            'stock' => 10,
            'unit' => 'pcs',
            'status' => 'active',
        ]);

        $recipe2 = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->otherTenant->id,
            'product_id' => $otherProduct->id,
            'name' => 'Tenant 2 Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        $tenantRecipes = Recipe::forTenant($this->tenant->id)->get();
        $this->assertCount(1, $tenantRecipes);
        $this->assertEquals($recipe1->id, $tenantRecipes->first()->id);
    }

    /** @test */
    public function it_scopes_to_active_recipes()
    {
        Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Active Recipe',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Inactive Recipe',
            'yield_quantity' => 1.0,
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $activeRecipes = Recipe::active()->get();
        $this->assertCount(1, $activeRecipes);
        $this->assertTrue($activeRecipes->first()->is_active);
    }

    /** @test */
    public function it_casts_attributes_correctly()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 10.567,
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $this->assertIsString($recipe->yield_quantity);
        $this->assertEquals('10.567', $recipe->yield_quantity);
        $this->assertFalse($recipe->is_active);
    }

    /** @test */
    public function it_formats_dates_correctly()
    {
        $recipe = Recipe::create([
            'id' => Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 1.0,
        'yield_unit' => 'pcs',
        ]);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $recipe->created_at);
        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $recipe->updated_at);
    }
}

