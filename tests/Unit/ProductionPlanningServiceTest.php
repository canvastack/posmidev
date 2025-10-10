<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\ProductionPlanningService;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Tenant;

class ProductionPlanningServiceTest extends TestCase
{
    use RefreshDatabase;

    private ProductionPlanningService $service;
    private string $tenantId;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ProductionPlanningService();
        $tenant = Tenant::factory()->create();
        $this->tenantId = $tenant->id;
    }

    /** @test */
    public function it_creates_feasible_production_plan()
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
            'quantity_required' => 2,
        ]);

        $productRequirements = [
            $product->id => 10,
        ];

        $result = $this->service->createProductionPlan($this->tenantId, $productRequirements);

        $this->assertEquals('feasible', $result['status']);
    }

    /** @test */
    public function it_calculates_overall_capacity()
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
            'quantity_required' => 1,
        ]);

        $result = $this->service->calculateOverallCapacity($this->tenantId);

        $this->assertEquals(1, $result['total_bom_products']);
        $this->assertArrayHasKey('product_capacities', $result);
    }

    /** @test */
    public function it_optimizes_material_usage()
    {
        $sharedMaterial = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 100,
        ]);

        $product1 = Product::factory()->create([
            'tenant_id' => $this->tenantId,
            'inventory_management_type' => 'bom',
        ]);

        $recipe1 = Recipe::factory()->create([
            'tenant_id' => $this->tenantId,
            'product_id' => $product1->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe1->id,
            'material_id' => $sharedMaterial->id,
            'quantity_required' => 5,
        ]);

        $result = $this->service->optimizeMaterialUsage($this->tenantId);

        $this->assertArrayHasKey('optimization_insights', $result);
        $this->assertGreaterThan(0, $result['total_materials_analyzed']);
    }
}
