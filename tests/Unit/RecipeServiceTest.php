<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Src\Pms\Core\Services\RecipeService;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

/**
 * RecipeServiceTest
 * 
 * Unit tests for RecipeService
 * Tests CRUD operations, activation logic, and component management
 *
 * @package Tests\Unit
 */
class RecipeServiceTest extends TestCase
{
    use RefreshDatabase;

    protected RecipeService $service;
    protected Tenant $tenant;
    protected User $user;
    protected Product $product;
    protected Material $material1;
    protected Material $material2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new RecipeService();

        // Create test tenant
        $this->tenant = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Test Tenant',
            'slug' => 'test-tenant',
        ]);

        // Create test user
        $this->user = User::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => bcrypt('password'),
        ]);

        // Create test product
        $this->product = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'sku' => 'PROD-001',
            'price' => 100,
        ]);

        // Create test materials
        $this->material1 = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Flour',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'unit_cost' => 5,
        ]);

        $this->material2 = Material::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Sugar',
            'unit' => 'kg',
            'stock_quantity' => 50,
            'unit_cost' => 3,
        ]);
    }

    // ========================================
    // Test: Create Recipe
    // ========================================

    /** @test */
    public function it_can_create_recipe_with_valid_data()
    {
        $data = [
            'product_id' => $this->product->id,
            'name' => 'Basic Bread Recipe',
            'description' => 'Simple bread recipe',
            'yield_quantity' => 10,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'notes' => 'Test notes',
        ];

        $recipe = $this->service->create($this->tenant->id, $data);

        $this->assertInstanceOf(Recipe::class, $recipe);
        $this->assertEquals('Basic Bread Recipe', $recipe->name);
        $this->assertEquals($this->product->id, $recipe->product_id);
        $this->assertEquals($this->tenant->id, $recipe->tenant_id);
    }

    /** @test */
    public function it_can_create_recipe_with_components()
    {
        $data = [
            'product_id' => $this->product->id,
            'name' => 'Recipe with Components',
            'yield_quantity' => 5,
            'yield_unit' => 'pcs',
            'components' => [
                [
                    'material_id' => $this->material1->id,
                    'quantity_required' => 2.5,
                    'unit' => 'kg',
                    'waste_percentage' => 5,
                ],
                [
                    'material_id' => $this->material2->id,
                    'quantity_required' => 1.0,
                    'unit' => 'kg',
                    'waste_percentage' => 0,
                ],
            ],
        ];

        $recipe = $this->service->create($this->tenant->id, $data);

        $this->assertCount(2, $recipe->recipeMaterials);
        $this->assertEquals(2.5, (float) $recipe->recipeMaterials[0]->quantity_required);
    }

    /** @test */
    public function it_enforces_required_fields_on_create()
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $data = [
            // Missing required fields
            'name' => 'Incomplete Recipe',
        ];

        $this->service->create($this->tenant->id, $data);
    }

    /** @test */
    public function it_validates_product_belongs_to_tenant()
    {
        $otherTenant = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Other Tenant',
            'slug' => 'other-tenant',
        ]);

        $otherProduct = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Product',
            'sku' => 'OTHER-001',
            'price' => 50,
        ]);

        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $data = [
            'product_id' => $otherProduct->id, // Wrong tenant
            'name' => 'Invalid Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
        ];

        $this->service->create($this->tenant->id, $data);
    }

    /** @test */
    public function it_validates_valid_yield_unit()
    {
        $this->expectException(\Illuminate\Validation\ValidationException::class);

        $data = [
            'product_id' => $this->product->id,
            'name' => 'Invalid Unit Recipe',
            'yield_quantity' => 10,
            'yield_unit' => 'invalid_unit',
        ];

        $this->service->create($this->tenant->id, $data);
    }

    // ========================================
    // Test: Read Recipe
    // ========================================

    /** @test */
    public function it_can_get_recipe_by_id_with_relations()
    {
        $created = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 5,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        $recipe = $this->service->getById($created->id, $this->tenant->id);

        $this->assertInstanceOf(Recipe::class, $recipe);
        $this->assertEquals($created->id, $recipe->id);
        $this->assertTrue($recipe->relationLoaded('product'));
        $this->assertTrue($recipe->relationLoaded('recipeMaterials'));
    }

    /** @test */
    public function it_respects_tenant_isolation_on_get_by_id()
    {
        $otherTenant = Tenant::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'name' => 'Other Tenant',
            'slug' => 'other-tenant',
        ]);

        $otherProduct = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Product',
            'sku' => 'OTHER-001',
            'price' => 50,
        ]);

        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $otherTenant->id,
            'product_id' => $otherProduct->id,
            'name' => 'Other Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        $this->expectException(\Illuminate\Database\Eloquent\ModelNotFoundException::class);

        $this->service->getById($recipe->id, $this->tenant->id);
    }

    /** @test */
    public function it_can_get_all_recipes_for_tenant()
    {
        // Create multiple recipes
        for ($i = 1; $i <= 5; $i++) {
            Recipe::create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $this->tenant->id,
                'product_id' => $this->product->id,
                'name' => "Recipe {$i}",
                'yield_quantity' => $i,
                'yield_unit' => 'pcs',
            ]);
        }

        $paginated = $this->service->getAllForTenant($this->tenant->id, [], 10);

        $this->assertEquals(5, $paginated->total());
    }

    /** @test */
    public function it_can_filter_recipes_by_product()
    {
        $product2 = Product::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Product 2',
            'sku' => 'PROD-002',
            'price' => 150,
        ]);

        Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe for Product 1',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $product2->id,
            'name' => 'Recipe for Product 2',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        $results = $this->service->getAllForTenant(
            $this->tenant->id,
            ['product_id' => $product2->id],
            10
        );

        $this->assertEquals(1, $results->total());
        $this->assertEquals('Recipe for Product 2', $results->first()->name);
    }

    /** @test */
    public function it_can_filter_recipes_by_active_status()
    {
        Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Active Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Inactive Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $results = $this->service->getAllForTenant(
            $this->tenant->id,
            ['is_active' => true],
            10
        );

        $this->assertEquals(1, $results->total());
        $this->assertEquals('Active Recipe', $results->first()->name);
    }

    // ========================================
    // Test: Update Recipe
    // ========================================

    /** @test */
    public function it_can_update_recipe_metadata()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Original Name',
            'yield_quantity' => 5,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        $updated = $this->service->update($recipe->id, $this->tenant->id, [
            'name' => 'Updated Name',
            'yield_quantity' => 10,
        'yield_unit' => 'pcs',
        ]);

        $this->assertEquals('Updated Name', $updated->name);
        $this->assertEquals(10, (float) $updated->yield_quantity);
    }

    // ========================================
    // Test: Delete Recipe
    // ========================================

    /** @test */
    public function it_can_delete_inactive_recipe()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Deletable Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $result = $this->service->delete($recipe->id, $this->tenant->id);

        $this->assertTrue($result);
        $this->assertSoftDeleted('recipes', ['id' => $recipe->id]);
    }

    /** @test */
    public function it_prevents_deletion_of_active_recipe()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Active Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Active recipes cannot be deleted');

        $this->service->delete($recipe->id, $this->tenant->id);
    }

    // ========================================
    // Test: Activation Logic
    // ========================================

    /** @test */
    public function it_can_activate_recipe()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe to Activate',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $activated = $this->service->activate($recipe->id, $this->tenant->id);

        $this->assertTrue($activated->is_active);
    }

    /** @test */
    public function it_deactivates_other_recipes_when_activating()
    {
        // Create first recipe (active)
        $recipe1 = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 1',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        // Create second recipe (inactive)
        $recipe2 = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 2',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        // Activate second recipe
        $this->service->activate($recipe2->id, $this->tenant->id);

        // Verify only recipe2 is active
        $recipe1->refresh();
        $recipe2->refresh();

        $this->assertFalse($recipe1->is_active);
        $this->assertTrue($recipe2->is_active);
    }

    /** @test */
    public function it_ensures_only_one_active_recipe_per_product()
    {
        // Create 3 recipes for same product
        $recipe1 = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 1',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        $recipe2 = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 2',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $recipe3 = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 3',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        // Activate recipe 3
        $this->service->activate($recipe3->id, $this->tenant->id);

        // Count active recipes for this product
        $activeCount = Recipe::forTenant($this->tenant->id)
            ->forProduct($this->product->id)
            ->where('is_active', true)
            ->count();

        $this->assertEquals(1, $activeCount);
    }

    // ========================================
    // Test: Component Management
    // ========================================

    /** @test */
    public function it_can_add_component_to_recipe()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        $component = $this->service->addComponent($recipe->id, $this->tenant->id, [
            'material_id' => $this->material1->id,
            'quantity_required' => 2.5,
            'unit' => 'kg',
            'waste_percentage' => 10,
        ]);

        $this->assertInstanceOf(RecipeMaterial::class, $component);
        $this->assertEquals(2.5, (float) $component->quantity_required);
        $this->assertEquals(10, (float) $component->waste_percentage);
    }

    /** @test */
    public function it_prevents_duplicate_materials_in_recipe()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        // Add material first time
        $this->service->addComponent($recipe->id, $this->tenant->id, [
            'material_id' => $this->material1->id,
            'quantity_required' => 1,
            'unit' => 'kg',
        ]);

        // Try to add same material again
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('already added to this recipe');

        $this->service->addComponent($recipe->id, $this->tenant->id, [
            'material_id' => $this->material1->id,
            'quantity_required' => 2,
            'unit' => 'kg',
        ]);
    }

    /** @test */
    public function it_can_update_component()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        $component = RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 1.0,
            'unit' => 'kg',
            'waste_percentage' => 0,
        ]);

        $updated = $this->service->updateComponent($component->id, $this->tenant->id, [
            'material_id' => $this->material1->id,
            'quantity_required' => 2.5,
            'unit' => 'kg',
            'waste_percentage' => 15,
        ]);

        $this->assertEquals(2.5, (float) $updated->quantity_required);
        $this->assertEquals(15, (float) $updated->waste_percentage);
    }

    /** @test */
    public function it_can_remove_component()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        $component = RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 1.0,
            'unit' => 'kg',
        ]);

        $result = $this->service->removeComponent($component->id, $this->tenant->id);

        $this->assertTrue($result);
        $this->assertDatabaseMissing('recipe_materials', ['id' => $component->id]);
    }

    // ========================================
    // Test: Helper Methods
    // ========================================

    /** @test */
    public function it_can_get_recipes_for_product()
    {
        Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 1',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Recipe 2',
            'yield_quantity' => 2,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        $recipes = $this->service->getRecipesForProduct($this->product->id, $this->tenant->id);

        $this->assertCount(2, $recipes);
    }

    /** @test */
    public function it_can_get_active_recipe_for_product()
    {
        Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Inactive Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => false,
        ]);

        $activeRecipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Active Recipe',
            'yield_quantity' => 1,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
            'is_active' => true,
        ]);

        $found = $this->service->getActiveRecipeForProduct($this->product->id, $this->tenant->id);

        $this->assertNotNull($found);
        $this->assertEquals($activeRecipe->id, $found->id);
        $this->assertEquals('Active Recipe', $found->name);
    }

    /** @test */
    public function it_can_calculate_recipe_cost()
    {
        $recipe = Recipe::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'name' => 'Cost Test Recipe',
            'yield_quantity' => 10,
            'yield_unit' => 'pcs',
            'yield_unit' => 'pcs',
        ]);

        // Material 1: 2kg @ $5/kg = $10
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material1->id,
            'quantity_required' => 2,
            'unit' => 'kg',
            'waste_percentage' => 0,
        ]);

        // Material 2: 1kg @ $3/kg = $3
        RecipeMaterial::create([
            'id' => \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $this->material2->id,
            'quantity_required' => 1,
            'unit' => 'kg',
            'waste_percentage' => 0,
        ]);

        $cost = $this->service->calculateCost($recipe->id, $this->tenant->id);

        // Total: $13, Per unit: $1.3
        $this->assertEquals(13.0, $cost['total_cost']);
        $this->assertEquals(1.3, $cost['cost_per_unit']);
    }
}
