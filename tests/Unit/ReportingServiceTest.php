<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\ReportingService;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class ReportingServiceTest extends TestCase
{
    use RefreshDatabase;

    private ReportingService $service;
    private string $tenantId;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ReportingService();
        $tenant = Tenant::factory()->create();
        $this->tenantId = $tenant->id;
        $this->user = User::factory()->create(['tenant_id' => $this->tenantId]);
    }

    /** @test */
    public function it_generates_executive_dashboard()
    {
        Material::factory()->count(5)->create(['tenant_id' => $this->tenantId]);

        $result = $this->service->generateExecutiveDashboard($this->tenantId);

        $this->assertEquals('Executive Dashboard', $result['report_type']);
        $this->assertArrayHasKey('key_metrics', $result);
        $this->assertArrayHasKey('stock_status', $result);
        $this->assertEquals(5, $result['key_metrics']['total_materials']);
    }

    /** @test */
    public function it_generates_material_usage_report()
    {
        $material = Material::factory()->create(['tenant_id' => $this->tenantId]);
        
        $material->adjustStock('restock', 100, 'purchase', null, $this->user);
        $material->adjustStock('deduction', -30, 'production', null, $this->user);

        $result = $this->service->generateMaterialUsageReport($this->tenantId, 30);

        $this->assertEquals('Material Usage Report', $result['report_type']);
        $this->assertArrayHasKey('material_details', $result);
        $this->assertEquals(2, $result['summary']['total_transactions']);
    }

    /** @test */
    public function it_generates_recipe_costing_report()
    {
        $product = Product::factory()->create(['tenant_id' => $this->tenantId]);
        
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenantId,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'unit_cost' => 10,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 5,
        ]);

        $result = $this->service->generateRecipeCostingReport($this->tenantId);

        $this->assertEquals('Recipe Costing Report', $result['report_type']);
        $this->assertEquals(1, $result['summary']['total_active_recipes']);
        $this->assertArrayHasKey('recipes', $result);
    }

    /** @test */
    public function it_generates_stock_movement_report()
    {
        $material = Material::factory()->create(['tenant_id' => $this->tenantId]);
        
        $material->adjustStock('restock', 50, 'purchase', null, $this->user);

        $result = $this->service->generateStockMovementReport($this->tenantId, 30);

        $this->assertEquals('Stock Movement Report', $result['report_type']);
        $this->assertArrayHasKey('by_transaction_type', $result);
        $this->assertArrayHasKey('by_reason', $result);
    }

    /** @test */
    public function it_generates_production_efficiency_report()
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

        $result = $this->service->generateProductionEfficiencyReport($this->tenantId);

        $this->assertEquals('Production Efficiency Report', $result['report_type']);
        $this->assertArrayHasKey('efficiency_data', $result);
    }

    /** @test */
    public function it_generates_comprehensive_inventory_report()
    {
        Material::factory()->count(3)->create(['tenant_id' => $this->tenantId]);

        $result = $this->service->generateComprehensiveInventoryReport($this->tenantId);

        $this->assertEquals('Comprehensive Inventory Report', $result['report_type']);
        $this->assertArrayHasKey('executive_summary', $result);
        $this->assertArrayHasKey('stock_status', $result);
        $this->assertArrayHasKey('cost_analysis', $result);
    }

    /** @test */
    public function it_exports_report_to_array_format()
    {
        $reportData = [
            'key_metrics' => [
                'total_materials' => 10,
                'total_inventory_value' => 5000,
                'active_alerts' => 2,
                'critical_alerts' => 1,
                'production_ready_products' => 5,
            ],
        ];

        $result = $this->service->exportReportToArray('executive_dashboard', $reportData);

        $this->assertArrayHasKey('headers', $result);
        $this->assertArrayHasKey('rows', $result);
        $this->assertCount(2, $result['headers']);
    }
}
