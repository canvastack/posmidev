<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\BatchProductionService;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Tenant;

class BatchProductionServiceTest extends TestCase
{
    use RefreshDatabase;

    private BatchProductionService $service;
    private string $tenantId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new BatchProductionService();
        $tenant = Tenant::factory()->create();
        $this->tenantId = $tenant->id;
    }

    /** @test */
    public function it_calculates_batch_requirements()
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenantId,
            'inventory_management_type' => 'bom',
        ]);

        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenantId,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 100,
            'unit_cost' => 5,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 2,
        ]);

        $result = $this->service->calculateBatchRequirements($product->id, $this->tenantId, 10);

        $this->assertEquals(10, $result['requested_quantity']);
        $this->assertTrue($result['can_produce']);
        $this->assertArrayHasKey('material_requirements', $result);
        $this->assertArrayHasKey('cost_analysis', $result);
    }

    /** @test */
    public function it_detects_material_shortages()
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenantId,
            'inventory_management_type' => 'bom',
        ]);

        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenantId,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 10, // Only 10 units available
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 5, // Needs 5 per unit
        ]);

        $result = $this->service->calculateBatchRequirements($product->id, $this->tenantId, 10); // Try to make 10 units

        $this->assertFalse($result['can_produce']);
        $this->assertNotEmpty($result['shortages']);
    }

    /** @test */
    public function it_calculates_optimal_batch_size()
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenantId,
            'inventory_management_type' => 'bom',
        ]);

        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenantId,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 200,
        ]);

        $recipeMaterial = RecipeMaterial::factory()->withoutWaste()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 1,
        ]);

        // Debug logging untuk memvalidasi asumsi
        \Log::info('🔍 BatchProductionServiceTest Debug', [
            'product_id' => $product->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'material_stock' => $material->stock_quantity,
            'recipe_material_quantity_required' => $recipeMaterial->quantity_required,
            'recipe_material_waste_percentage' => $recipeMaterial->waste_percentage,
            'recipe_material_effective_quantity' => $recipeMaterial->effective_quantity,
            'expected_max_producible' => floor(200 / 1),
            'timestamp' => now()->toISOString()
        ]);

        $result = $this->service->calculateOptimalBatchSize($product->id, $this->tenantId);

        \Log::info('🔍 BatchProductionServiceTest Result', [
            'result' => $result,
            'timestamp' => now()->toISOString()
        ]);

        $this->assertEquals(200, $result['maximum_producible']);
        $this->assertArrayHasKey('suggested_batches', $result);
        $this->assertArrayHasKey('recommendation', $result);
    }

    /** @test */
    public function it_calculates_multi_product_batch()
    {
        $product1 = Product::factory()->create([
            'tenant_id' => $this->tenantId,
            'inventory_management_type' => 'bom',
        ]);

        $product2 = Product::factory()->create([
            'tenant_id' => $this->tenantId,
            'inventory_management_type' => 'bom',
        ]);

        $recipe1 = Recipe::factory()->create([
            'tenant_id' => $this->tenantId,
            'product_id' => $product1->id,
            'is_active' => true,
        ]);

        $recipe2 = Recipe::factory()->create([
            'tenant_id' => $this->tenantId,
            'product_id' => $product2->id,
            'is_active' => true,
        ]);

        $sharedMaterial = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 100,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe1->id,
            'material_id' => $sharedMaterial->id,
            'quantity_required' => 2,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe2->id,
            'material_id' => $sharedMaterial->id,
            'quantity_required' => 3,
        ]);

        $productionPlan = [
            $product1->id => 10,
            $product2->id => 10,
        ];

        $result = $this->service->calculateMultiProductBatch($productionPlan, $this->tenantId);

        $this->assertEquals(2, $result['total_products']);
        $this->assertArrayHasKey('aggregated_material_requirements', $result);
    }

    /** @test */
    public function it_simulates_production()
    {
        $product = Product::factory()->create([
            'tenant_id' => $this->tenantId,
            'inventory_management_type' => 'bom',
        ]);

        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenantId,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 100,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 5,
        ]);

        $result = $this->service->simulateProduction($product->id, $this->tenantId, 10);

        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('material_changes', $result);
        $this->assertArrayHasKey('production_cost', $result);
    }
}
