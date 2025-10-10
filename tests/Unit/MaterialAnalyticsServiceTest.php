<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\MaterialAnalyticsService;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Carbon\Carbon;

class MaterialAnalyticsServiceTest extends TestCase
{
    use RefreshDatabase;

    private MaterialAnalyticsService $service;
    private string $tenantId;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new MaterialAnalyticsService();
        
        $tenant = Tenant::factory()->create();
        $this->tenantId = $tenant->id;
        
        $this->user = User::factory()->create(['tenant_id' => $this->tenantId]);
    }

    /** @test */
    public function it_generates_stock_status_summary()
    {
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 50,
            'reorder_level' => 10,
        ]); // Normal

        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 5,
            'reorder_level' => 20,
        ]); // Low stock

        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 0,
            'reorder_level' => 10,
        ]); // Out of stock

        $result = $this->service->getStockStatusSummary($this->tenantId);

        $this->assertEquals(3, $result['total_materials']);
        $this->assertEquals(1, $result['stock_status']['normal']);
        $this->assertEquals(1, $result['stock_status']['low_stock']);
        $this->assertEquals(1, $result['stock_status']['out_of_stock']);
        $this->assertArrayHasKey('total_stock_value', $result);
    }

    /** @test */
    public function it_groups_materials_by_category()
    {
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'category' => 'Dairy',
            'stock_quantity' => 50,
            'unit_cost' => 10,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'category' => 'Dairy',
            'stock_quantity' => 30,
            'unit_cost' => 15,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'category' => 'Flour',
            'stock_quantity' => 100,
            'unit_cost' => 5,
        ]);

        $result = $this->service->getMaterialsByCategory($this->tenantId);

        $this->assertEquals(2, $result['total_categories']);
        
        $dairyCategory = collect($result['categories'])->firstWhere('category', 'Dairy');
        $this->assertEquals(2, $dairyCategory['total_materials']);
        $this->assertEquals(950, $dairyCategory['total_stock_value']); // (50*10 + 30*15)
    }

    /** @test */
    public function it_analyzes_material_usage_over_time()
    {
        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 100,
        ]);

        // Create usage transactions
        $material->adjustStock('restock', 50, 'purchase', null, $this->user);
        $material->adjustStock('deduction', -30, 'production', null, $this->user);

        $result = $this->service->getMaterialUsageAnalysis($this->tenantId, $material->id, 30);

        $this->assertEquals(1, $result['total_materials_analyzed']);
        $this->assertArrayHasKey('materials', $result);
        
        $materialData = $result['materials'][0];
        $this->assertEquals($material->id, $materialData['material_id']);
        $this->assertEquals(50, $materialData['total_increase']);
        $this->assertEquals(30, $materialData['total_decrease']);
    }

    /** @test */
    public function it_gets_transaction_trends()
    {
        $material = Material::factory()->create(['tenant_id' => $this->tenantId]);

        $material->adjustStock('restock', 100, 'purchase', null, $this->user);
        $material->adjustStock('deduction', -20, 'production', null, $this->user);
        $material->adjustStock('deduction', -10, 'waste', null, $this->user);

        $result = $this->service->getTransactionTrends($this->tenantId, 30);

        $this->assertEquals(3, $result['total_transactions']);
        $this->assertArrayHasKey('by_type', $result);
        $this->assertArrayHasKey('by_reason', $result);
        $this->assertArrayHasKey('daily_trends', $result);
    }

    /** @test */
    public function it_performs_cost_analysis()
    {
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'category' => 'Dairy',
            'stock_quantity' => 100,
            'unit_cost' => 50, // High value
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'category' => 'Spices',
            'stock_quantity' => 10,
            'unit_cost' => 5,
        ]);

        $result = $this->service->getCostAnalysis($this->tenantId);

        $this->assertEquals(5050, $result['total_stock_value']);
        $this->assertArrayHasKey('top_materials_by_value', $result);
        $this->assertArrayHasKey('cost_by_category', $result);
    }

    /** @test */
    public function it_identifies_materials_requiring_attention()
    {
        // Low stock material
        $lowStock = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 5,
            'reorder_level' => 20,
        ]);

        // Out of stock material
        $outOfStock = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 0,
            'reorder_level' => 10,
        ]);

        // Normal material
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 100,
            'reorder_level' => 10,
        ]);

        $result = $this->service->getMaterialsRequiringAttention($this->tenantId, 30);

        $this->assertGreaterThanOrEqual(2, $result['total_count']);
        $this->assertArrayHasKey('materials_requiring_attention', $result);
        
        // Check that out of stock has higher priority than low stock
        $priorities = collect($result['materials_requiring_attention'])->pluck('priority')->toArray();
        $this->assertContains(5, $priorities); // Out of stock priority
    }

    /** @test */
    public function it_calculates_inventory_turnover_rate()
    {
        $material = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 50,
        ]);

        // Simulate usage
        $material->adjustStock('deduction', -30, 'production', null, $this->user);

        $result = $this->service->getInventoryTurnoverRate($this->tenantId, 30);

        $this->assertArrayHasKey('turnover_data', $result);
        $this->assertArrayHasKey('average_turnover_rate', $result);
        
        $materialTurnover = collect($result['turnover_data'])->firstWhere('material_id', $material->id);
        $this->assertNotNull($materialTurnover);
        $this->assertArrayHasKey('turnover_category', $materialTurnover);
    }

    /** @test */
    public function it_enforces_tenant_isolation()
    {
        $tenant1 = Tenant::factory()->create();
        $tenant2 = Tenant::factory()->create();

        Material::factory()->count(3)->create(['tenant_id' => $tenant1->id]);
        Material::factory()->count(2)->create(['tenant_id' => $tenant2->id]);

        $result = $this->service->getStockStatusSummary($tenant1->id);

        $this->assertEquals(3, $result['total_materials']);
    }

    /** @test */
    public function it_handles_empty_data_gracefully()
    {
        $result = $this->service->getStockStatusSummary($this->tenantId);

        $this->assertEquals(0, $result['total_materials']);
        $this->assertEquals(0, $result['total_stock_value']);
    }
}
