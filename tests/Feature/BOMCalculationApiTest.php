<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BOMCalculationApiTest extends TestCase
{
    use TenantTestTrait;

    protected Tenant $otherTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
        $this->otherTenant = Tenant::factory()->create();
    }

    /** @test */
    public function it_can_get_available_quantity_for_product(): void
    {
        // Arrange
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'inventory_management_type' => 'bom',
        ]);
        
        $material1 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100, // Can make 50 units (100 / 2)
        ]);
        
        $material2 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 200, // Can make 40 units (200 / 5)
        ]);
        
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
            'yield_quantity' => 1,
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material1->id,
            'quantity_required' => 2,
            'waste_percentage' => 0,
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material2->id,
            'quantity_required' => 5,
            'waste_percentage' => 0,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.product_id', $product->id);
            
        // Should be limited by material2 (can only make 40 units)
        $this->assertEquals(40, $response->json('data.available_quantity'));
    }

    /** @test */
    public function it_can_get_bulk_availability_for_multiple_products(): void
    {
        // Arrange
        $product1 = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);
        $product2 = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);
        
        // Recipe for product1 - needs 2 units of material (can make 50)
        $recipe1 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product1->id,
            'is_active' => true,
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe1->id,
            'material_id' => $material->id,
            'quantity_required' => 2,
            'waste_percentage' => 0,
        ]);
        
        // Recipe for product2 - needs 5 units of material (can make 20)
        $recipe2 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product2->id,
            'is_active' => true,
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe2->id,
            'material_id' => $material->id,
            'quantity_required' => 5,
            'waste_percentage' => 0,
        ]);

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/bulk-availability",
            [
                'product_ids' => [$product1->id, $product2->id],
            ],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true);
            
        $data = $response->json('data');
        $this->assertArrayHasKey($product1->id, $data);
        $this->assertArrayHasKey($product2->id, $data);
        $this->assertEquals(50, $data[$product1->id]['available_quantity']);
        $this->assertEquals(20, $data[$product2->id]['available_quantity']);
    }

    /** @test */
    public function it_validates_bulk_availability_request(): void
    {
        // Act - Empty array
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/bulk-availability",
            ['product_ids' => []],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_ids']);
    }

    /** @test */
    public function it_can_get_production_capacity_for_product(): void
    {
        // Arrange
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Cake',
            'inventory_management_type' => 'bom',
        ]);
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);
        
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
            'yield_unit' => 'pcs',
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 2,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/production-capacity",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.product_id', $product->id)
            ->assertJsonPath('data.product_name', 'Test Cake')
            ->assertJsonPath('data.recipe_id', $recipe->id)
            ->assertJsonPath('data.unit', 'pcs')
            ->assertJsonPath('data.can_produce', true);
            
        $this->assertGreaterThan(0, $response->json('data.available_quantity'));
        $this->assertArrayHasKey('stock_status', $response->json('data'));
        $this->assertArrayHasKey('components_status', $response->json('data'));
    }

    /** @test */
    public function it_returns_out_of_stock_when_no_materials_available(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 0, // No stock
        ]);
        
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 2,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/production-capacity",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('data.available_quantity', 0)
            ->assertJsonPath('data.can_produce', false)
            ->assertJsonPath('data.stock_status', 'out_of_stock');
    }

    /** @test */
    public function it_enforces_tenant_isolation_for_bom_calculations(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->otherTenant->id, 'inventory_management_type' => 'bom']);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity",
            $this->authenticatedRequest()['headers']
        );

        // Assert - Should fail because product belongs to another tenant
        $response->assertStatus(404);
    }

    /** @test */
    public function it_requires_authentication_for_bom_calculations(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);

        // Act - No authentication
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/available-quantity"
        );

        // Assert
        $response->assertUnauthorized();
    }
}