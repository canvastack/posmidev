<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;

class RecipeApiTest extends TestCase
{
    use TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    /** @test */
    public function it_can_list_recipes_for_tenant(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        Recipe::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    '*' => [
                        'id',
                        'tenant_id',
                        'product_id',
                        'name',
                        'yield_quantity',
                        'yield_unit',
                        'is_active',
                    ]
                ],
                'meta',
            ])
            ->assertJsonPath('success', true);
    }

    /** @test */
    public function it_can_create_a_recipe(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        
        $recipeData = [
            'product_id' => $product->id,
            'name' => 'Chocolate Cake Recipe',
            'description' => 'Delicious chocolate cake',
            'yield_quantity' => 10,
            'yield_unit' => 'pcs',
            'instructions' => 'Mix ingredients and bake',
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes",
            $recipeData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertCreated()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'name',
                    'product_id',
                    'yield_quantity',
                ],
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Chocolate Cake Recipe');

        // Verify in database
        $this->assertDatabaseHas('recipes', [
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'name' => 'Chocolate Cake Recipe',
        ]);
    }

    /** @test */
    public function it_can_show_a_recipe(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'name' => 'Test Recipe',
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'id',
                    'name',
                    'product_id',
                    'tenant_id',
                ],
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $recipe->id)
            ->assertJsonPath('data.name', 'Test Recipe');
    }

    /** @test */
    public function it_can_update_a_recipe(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'name' => 'Original Name',
        ]);

        $updateData = [
            'name' => 'Updated Recipe Name',
            'yield_quantity' => 20,
            'instructions' => 'Updated instructions',
        ];

        // Act
        $response = $this->putJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}",
            $updateData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Updated Recipe Name');
        
        // yield_quantity is cast as decimal, so it may be '20.000'
        $this->assertEquals(20, (float) $response->json('data.yield_quantity'));

        // Verify in database
        $this->assertDatabaseHas('recipes', [
            'id' => $recipe->id,
            'name' => 'Updated Recipe Name',
            'yield_quantity' => 20,
        ]);
    }

    /** @test */
    public function it_can_delete_a_recipe(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => false, // Must be inactive to delete
        ]);

        // Act
        $response = $this->deleteJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true);

        // Verify soft deleted
        $this->assertSoftDeleted('recipes', [
            'id' => $recipe->id,
        ]);
    }

    /** @test */
    public function it_can_activate_a_recipe(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => false,
        ]);

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/activate",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.is_active', true);

        // Verify in database
        $this->assertDatabaseHas('recipes', [
            'id' => $recipe->id,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function activating_recipe_deactivates_other_recipes_for_same_product(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        
        $recipe1 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $recipe2 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => false,
        ]);

        // Act - activate recipe2
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe2->id}/activate",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();

        // recipe1 should now be inactive
        $this->assertDatabaseHas('recipes', [
            'id' => $recipe1->id,
            'is_active' => false,
        ]);

        // recipe2 should be active
        $this->assertDatabaseHas('recipes', [
            'id' => $recipe2->id,
            'is_active' => true,
        ]);
    }

    /** @test */
    public function it_can_get_recipe_cost_breakdown(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'yield_quantity' => 10,
        ]);

        // Add materials to recipe
        $material1 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'unit_cost' => 1000,
        ]);
        $material2 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'unit_cost' => 2000,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material1->id,
            'quantity_required' => 5,
            'waste_percentage' => 10,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material2->id,
            'quantity_required' => 3,
            'waste_percentage' => 5,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/cost-breakdown",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'recipe_id',
                    'total_cost',
                    'cost_per_unit',
                    'components' => [
                        '*' => [
                            'material_id',
                            'material_name',
                            'quantity_required',
                            'waste_percentage',
                            'effective_quantity',
                            'unit_cost',
                            'total_cost',
                        ]
                    ],
                ],
            ])
            ->assertJsonPath('success', true);
    }

    /** @test */
    public function it_filters_recipes_by_product_id(): void
    {
        // Arrange
        $product1 = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $product2 = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        
        Recipe::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product1->id,
        ]);

        Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product2->id,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes?product_id={$product1->id}",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
        $data = $response->json('data');
        
        $this->assertCount(2, $data);
        foreach ($data as $recipe) {
            $this->assertEquals($product1->id, $recipe['product_id']);
        }
    }

    /** @test */
    public function it_filters_recipes_by_active_status(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        
        Recipe::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => false,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes?is_active=1",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
        $data = $response->json('data');
        
        $this->assertCount(2, $data);
        foreach ($data as $recipe) {
            $this->assertTrue($recipe['is_active']);
        }
    }

    /** @test */
    public function it_enforces_tenant_isolation(): void
    {
        // Arrange - create recipe for another tenant
        $otherTenant = Tenant::factory()->create();
        $otherProduct = Product::factory()->create(['tenant_id' => $otherTenant->id]);
        $otherRecipe = Recipe::factory()->create([
            'tenant_id' => $otherTenant->id,
            'product_id' => $otherProduct->id,
        ]);

        // Act - try to access other tenant's recipe
        $response = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/recipes",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertForbidden();
    }

    /** @test */
    public function it_validates_required_fields_when_creating_recipe(): void
    {
        // Act - attempt to create without required fields
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_id', 'yield_quantity', 'yield_unit']);
    }

    /** @test */
    public function it_validates_product_belongs_to_tenant(): void
    {
        // Arrange - create product in another tenant
        $otherTenant = Tenant::factory()->create();
        $otherProduct = Product::factory()->create(['tenant_id' => $otherTenant->id]);

        $recipeData = [
            'product_id' => $otherProduct->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 10,
            'yield_unit' => 'pcs',
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes",
            $recipeData,
            $this->authenticatedRequest()['headers']
        );

        // Assert - should fail validation
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_id']);
    }

    /** @test */
    public function it_validates_yield_unit_enum(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        
        $recipeData = [
            'product_id' => $product->id,
            'name' => 'Test Recipe',
            'yield_quantity' => 10,
            'yield_unit' => 'invalid_unit', // Invalid
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes",
            $recipeData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['yield_unit']);
    }

    /** @test */
    public function it_requires_authentication(): void
    {
        // Act - attempt without authentication
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/recipes");

        // Assert
        $response->assertUnauthorized();
    }
}