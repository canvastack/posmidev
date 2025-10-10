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

class BatchProductionApiTest extends TestCase
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
    public function it_can_calculate_batch_requirements(): void
    {
        // Arrange
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Chocolate Cake',
            'inventory_management_type' => 'bom',
        ]);
        
        $flour = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Flour',
            'unit' => 'kg',
            'stock_quantity' => 1000,
        ]);
        
        $sugar = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sugar',
            'unit' => 'kg',
            'stock_quantity' => 500,
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
            'material_id' => $flour->id,
            'quantity_required' => 2,
            'waste_percentage' => 0,
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $sugar->id,
            'quantity_required' => 1,
            'waste_percentage' => 0,
        ]);

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/batch-requirements",
            [
                'product_id' => $product->id,
                'quantity' => 10,
            ],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.product_id', $product->id)
            ->assertJsonPath('data.requested_quantity', 10)
            ->assertJsonPath('data.can_produce', true);
            
        $materials = $response->json('data.material_requirements');
        $this->assertCount(2, $materials);
        
        // Check flour requirement (2 kg per unit * 10 units = 20 kg)
        $flourReq = collect($materials)->firstWhere('material_id', $flour->id);
        $this->assertEquals(20, $flourReq['total_required']);
        $this->assertTrue($flourReq['is_sufficient']);
        
        // Check sugar requirement (1 kg per unit * 10 units = 10 kg)
        $sugarReq = collect($materials)->firstWhere('material_id', $sugar->id);
        $this->assertEquals(10, $sugarReq['total_required']);
        $this->assertTrue($sugarReq['is_sufficient']);
    }

    /** @test */
    public function it_validates_batch_requirements_request(): void
    {
        // Act - Missing required fields
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/batch-requirements",
            [],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['product_id', 'quantity']);
    }

    /** @test */
    public function it_can_calculate_optimal_batch_size(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
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
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/optimal-batch-size",
            [
                'product_id' => $product->id,
            ],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.product_id', $product->id);
            
        $this->assertArrayHasKey('maximum_producible', $response->json('data'));
        $this->assertArrayHasKey('suggested_batches', $response->json('data'));
        $this->assertArrayHasKey('bottleneck_material', $response->json('data'));
    }

    /** @test */
    public function it_respects_min_and_max_quantity_constraints(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 1000,
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
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/optimal-batch-size",
            [
                'product_id' => $product->id,
                'min_quantity' => 10,
                'max_quantity' => 50,
            ],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.product_id', $product->id);
        
        // Service returns maximum_producible and suggested_batches
        $maxProducible = $response->json('data.maximum_producible');
        $this->assertGreaterThan(0, $maxProducible);
        
        // Check that suggested batches are provided
        $suggestedBatches = $response->json('data.suggested_batches');
        $this->assertIsArray($suggestedBatches);
        $this->assertNotEmpty($suggestedBatches);
    }

    /** @test */
    public function it_can_plan_multi_product_batch(): void
    {
        // Arrange
        $product1 = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);
        $product2 = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);
        
        $sharedMaterial = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);
        
        // Product 1 recipe
        $recipe1 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product1->id,
            'is_active' => true,
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe1->id,
            'material_id' => $sharedMaterial->id,
            'quantity_required' => 2,
        ]);
        
        // Product 2 recipe
        $recipe2 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product2->id,
            'is_active' => true,
        ]);
        
        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe2->id,
            'material_id' => $sharedMaterial->id,
            'quantity_required' => 3,
        ]);

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/multi-product-plan",
            [
                'products' => [
                    ['product_id' => $product1->id, 'quantity' => 10],
                    ['product_id' => $product2->id, 'quantity' => 15],
                ],
            ],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonPath('success', true);
            
        $this->assertArrayHasKey('production_plan', $response->json('data'));
        $this->assertArrayHasKey('aggregated_material_requirements', $response->json('data'));
        $this->assertArrayHasKey('is_feasible', $response->json('data'));
        $this->assertArrayHasKey('total_production_cost', $response->json('data'));
        
        // Verify both products are in plan
        $plan = $response->json('data.production_plan');
        $this->assertCount(2, $plan);
    }

    /** @test */
    public function it_validates_multi_product_plan_request(): void
    {
        // Act - Empty products array
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/multi-product-plan",
            ['products' => []],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['products']);
    }

    /** @test */
    public function it_detects_insufficient_materials_in_batch_plan(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 10, // Only 10 units available
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
            'waste_percentage' => 0, // Set to 0 for deterministic calculations
        ]);

        // Act - Request 100 units (needs 200 units of material)
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/batch-requirements",
            [
                'product_id' => $product->id,
                'quantity' => 100,
            ],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
        
        $materialRequirements = $response->json('data.material_requirements');
        $materialData = $materialRequirements[0];
        
        $this->assertFalse($materialData['is_sufficient']);
        $this->assertEquals(200, $materialData['total_required']);
        $this->assertEquals(10, $materialData['current_stock']);
    }

    /** @test */
    public function it_requires_authentication_for_batch_operations(): void
    {
        // Arrange
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id, 'inventory_management_type' => 'bom']);

        // Act - No authentication
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/batch-requirements",
            [
                'product_id' => $product->id,
                'quantity' => 10,
            ]
        );

        // Assert
        $response->assertUnauthorized();
    }
}