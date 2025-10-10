<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\StockAlertService;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class StockAlertServiceTest extends TestCase
{
    use RefreshDatabase;

    private StockAlertService $service;
    private string $tenantId;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new StockAlertService();
        $tenant = Tenant::factory()->create();
        $this->tenantId = $tenant->id;
        $this->user = User::factory()->create(['tenant_id' => $this->tenantId]);
    }

    /** @test */
    public function it_gets_active_alerts_for_low_stock()
    {
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 5,
            'reorder_level' => 20,
        ]);

        $result = $this->service->getActiveAlerts($this->tenantId);

        $this->assertEquals(1, $result['total_alerts']);
        $this->assertGreaterThan(0, $result['severity_summary']['warning']);
    }

    /** @test */
    public function it_gets_predictive_alerts()
    {
        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 30,
        ]);

        // Create usage pattern
        $material->adjustStock('deduction', -2, 'production', null, $this->user);

        $result = $this->service->getPredictiveAlerts($this->tenantId, 7);

        $this->assertArrayHasKey('predictive_alerts', $result);
        $this->assertEquals(7, $result['forecast_period_days']);
    }

    /** @test */
    public function it_generates_reorder_recommendations()
    {
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 5,
            'reorder_level' => 20,
            'unit_cost' => 10,
        ]);

        $result = $this->service->getReorderRecommendations($this->tenantId, 30);

        $this->assertGreaterThan(0, $result['total_materials']);
        $this->assertArrayHasKey('total_estimated_cost', $result);
    }

    /** @test */
    public function it_checks_stock_sufficiency_for_orders()
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
            'stock_quantity' => 50,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenantId,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 10,
        ]);

        $productionPlan = [
            $product->id => 10, // Will need 100 units, but only have 50
        ];

        $result = $this->service->checkStockSufficiencyForOrders($this->tenantId, $productionPlan);

        $this->assertFalse($result['is_sufficient']);
        $this->assertGreaterThan(0, $result['total_shortages']);
    }

    /** @test */
    public function it_generates_alert_dashboard()
    {
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 0,
            'reorder_level' => 10,
        ]);

        $result = $this->service->getAlertDashboard($this->tenantId);

        $this->assertArrayHasKey('summary', $result);
        $this->assertArrayHasKey('active_alerts', $result);
    }
}
