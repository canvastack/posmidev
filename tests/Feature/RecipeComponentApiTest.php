<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;

class RecipeComponentApiTest extends TestCase
{
    use TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    /** @test */
    public function it_can_add_component_to_recipe(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Flour',
            'unit' => 'kg',
        ]);

        $componentData = [
            'material_id' => $material->id,
            'quantity_required' => 2.5,
            'unit' => 'kg',
            'waste_percentage' => 5,
            'notes' => 'High-quality flour',
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components",
            $componentData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertCreated()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'id',
                    'recipe_id',
                    'material_id',
                    'quantity_required',
                    'waste_percentage',
                ],
            ])
            ->assertJsonPath('success', true);
            
        $this->assertEquals(2.5, (float) $response->json('data.quantity_required'));
        $this->assertEquals(5, $response->json('data.waste_percentage'));

        // Verify in database
        $this->assertDatabaseHas('recipe_materials', [
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 2.5,
        ]);
    }

    /** @test */
    public function it_can_update_recipe_component(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);
        
        $material = Material::factory()->create(['tenant_id' => $this->tenant->id]);
        $component = RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 5,
            'waste_percentage' => 10,
        ]);

        $updateData = [
            'quantity_required' => 7.5,
            'waste_percentage' => 8,
            'notes' => 'Updated notes',
        ];

        // Act
        $response = $this->putJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components/{$component->id}",
            $updateData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true);
            
        $this->assertEquals(7.5, (float) $response->json('data.quantity_required'));
        $this->assertEquals(8, $response->json('data.waste_percentage'));

        // Verify in database
        $this->assertDatabaseHas('recipe_materials', [
            'id' => $component->id,
            'quantity_required' => 7.5,
            'waste_percentage' => 8,
        ]);
    }

    /** @test */
    public function it_can_delete_recipe_component(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);
        
        $material = Material::factory()->create(['tenant_id' => $this->tenant->id]);
        $component = RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
        ]);

        // Act
        $response = $this->deleteJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components/{$component->id}",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true);

        // Verify deleted from database
        $this->assertDatabaseMissing('recipe_materials', [
            'id' => $component->id,
            'deleted_at' => null,
        ]);
    }

    /** @test */
    public function it_validates_required_fields_when_adding_component(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);

        // Act - missing required fields
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['material_id', 'quantity_required']);
    }

    /** @test */
    public function it_validates_waste_percentage_range(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);
        
        $material = Material::factory()->create(['tenant_id' => $this->tenant->id]);

        $componentData = [
            'material_id' => $material->id,
            'quantity_required' => 5,
            'waste_percentage' => 150, // Invalid: > 100
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components",
            $componentData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['waste_percentage']);
    }

    /** @test */
    public function it_validates_material_belongs_to_tenant(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);
        
        $otherTenant = Tenant::factory()->create();
        $otherMaterial = Material::factory()->create(['tenant_id' => $otherTenant->id]);

        $componentData = [
            'material_id' => $otherMaterial->id,
            'quantity_required' => 5,
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components",
            $componentData,
            $this->authenticatedRequest()['headers']
        );

        // Assert - should fail validation
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['material_id']);
    }

    /** @test */
    public function it_prevents_duplicate_material_in_same_recipe(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);
        
        $material = Material::factory()->create(['tenant_id' => $this->tenant->id]);
        
        // First component
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
        ]);

        // Try to add same material again
        $componentData = [
            'material_id' => $material->id,
            'quantity_required' => 5,
            'unit' => 'kg',
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components",
            $componentData,
            $this->authenticatedRequest()['headers']
        );

        // Assert - should fail validation
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['material_id']);
    }

    /** @test */
    public function it_enforces_tenant_isolation_for_components(): void
    {
        // Arrange - create recipe in another tenant
        $otherTenant = Tenant::factory()->create();
        $otherProduct = Product::factory()->create(['tenant_id' => $otherTenant->id]);
        $otherRecipe = Recipe::factory()->create([
            'tenant_id' => $otherTenant->id,
            'product_id' => $otherProduct->id,
        ]);
        
        $material = Material::factory()->create(['tenant_id' => $this->tenant->id]);

        $componentData = [
            'material_id' => $material->id,
            'quantity_required' => 5,
            'unit' => 'kg',
        ];

        // Act - try to add component to another tenant's recipe
        $response = $this->postJson(
            "/api/v1/tenants/{$otherTenant->id}/recipes/{$otherRecipe->id}/components",
            $componentData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertForbidden();
    }

    /** @test */
    public function it_calculates_effective_quantity_with_waste(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'unit_cost' => 1000,
        ]);

        $componentData = [
            'material_id' => $material->id,
            'quantity_required' => 100,
            'unit' => 'kg',
            'waste_percentage' => 10, // 10% waste
        ];

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components",
            $componentData,
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertCreated();
        
        $component = RecipeMaterial::find($response->json('data.id'));
        
        // effective_quantity should be 100 * (1 + 10/100) = 110
        $this->assertEqualsWithDelta(110, $component->effective_quantity, 0.01);
        
        // total_cost should be 110 * 1000 = 110000
        $this->assertEqualsWithDelta(110000, $component->total_cost, 0.01);
    }

    /** @test */
    public function it_requires_authentication_for_component_operations(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
        ]);

        // Act - attempt without authentication
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/recipes/{$recipe->id}/components",
            ['material_id' => 'some-id', 'quantity_required' => 5]
        );

        // Assert
        $response->assertUnauthorized();
    }
}