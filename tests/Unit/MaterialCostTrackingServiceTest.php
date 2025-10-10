<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\MaterialCostTrackingService;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class MaterialCostTrackingServiceTest extends TestCase
{
    use RefreshDatabase;

    private MaterialCostTrackingService $service;
    private string $tenantId;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MaterialCostTrackingService();
        $tenant = Tenant::factory()->create();
        $this->tenantId = $tenant->id;
        $this->user = User::factory()->create(['tenant_id' => $this->tenantId]);
    }

    /** @test */
    public function it_tracks_cost_history()
    {
        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'unit_cost' => 10,
        ]);

        $material->adjustStock('restock', 50, 'purchase', 'Purchase 1', $this->user);

        $result = $this->service->getCostHistory($material->id, $this->tenantId, 90);

        $this->assertEquals($material->id, $result['material_id']);
        $this->assertEquals(10, $result['current_unit_cost']);
        $this->assertArrayHasKey('cost_history', $result);
    }

    /** @test */
    public function it_calculates_total_inventory_value()
    {
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 100,
            'unit_cost' => 10,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 50,
            'unit_cost' => 20,
        ]);

        $result = $this->service->calculateInventoryValue($this->tenantId, true);

        $this->assertEquals(2000, $result['total_inventory_value']); // (100*10 + 50*20)
        $this->assertEquals(2, $result['total_materials']);
        $this->assertArrayHasKey('value_by_category', $result);
    }

    /** @test */
    public function it_performs_cost_variance_analysis()
    {
        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'unit_cost' => 15,
        ]);

        $material->adjustStock('restock', 100, 'purchase', null, $this->user);

        $result = $this->service->getCostVarianceAnalysis($this->tenantId);

        $this->assertGreaterThan(0, $result['materials_analyzed']);
        $this->assertArrayHasKey('variance_data', $result);
    }

    /** @test */
    public function it_gets_cost_efficiency_metrics()
    {
        Material::factory()->count(3)->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 50,
            'unit_cost' => 10,
        ]);

        $result = $this->service->getCostEfficiencyMetrics($this->tenantId);

        $this->assertArrayHasKey('total_inventory_value', $result);
        $this->assertArrayHasKey('inventory_turnover_rate', $result);
        $this->assertArrayHasKey('value_distribution', $result);
    }
}
