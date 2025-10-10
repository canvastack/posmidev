<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Core\Services\MaterialExportImportService;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;

class MaterialExportImportServiceTest extends TestCase
{
    use RefreshDatabase;

    private MaterialExportImportService $service;
    private string $tenantId;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->service = new MaterialExportImportService();
        
        $tenant = Tenant::factory()->create();
        $this->tenantId = $tenant->id;
        
        $this->user = User::factory()->create([
            'tenant_id' => $this->tenantId,
            'name' => 'Test User',
        ]);
    }

    /** @test */
    public function it_can_export_materials_to_csv()
    {
        Material::factory()->count(5)->create(['tenant_id' => $this->tenantId]);

        $result = $this->service->exportToCSV($this->tenantId);

        $this->assertArrayHasKey('headers', $result);
        $this->assertArrayHasKey('rows', $result);
        $this->assertArrayHasKey('total', $result);
        $this->assertEquals(5, $result['total']);
        $this->assertCount(11, $result['headers']); // 11 columns
    }

    /** @test */
    public function it_can_filter_export_by_category()
    {
        Material::factory()->create(['tenant_id' => $this->tenantId, 'category' => 'Dairy']);
        Material::factory()->create(['tenant_id' => $this->tenantId, 'category' => 'Flour']);
        Material::factory()->create(['tenant_id' => $this->tenantId, 'category' => 'Dairy']);

        $result = $this->service->exportToCSV($this->tenantId, ['category' => 'Dairy']);

        $this->assertEquals(2, $result['total']);
    }

    /** @test */
    public function it_can_export_materials_with_transaction_history()
    {
        $material = Material::factory()->create(['tenant_id' => $this->tenantId]);
        
        $material->adjustStock('restock', 100, 'purchase', 'Test purchase', $this->user);

        $result = $this->service->exportWithTransactions($this->tenantId, [$material->id]);

        $this->assertCount(1, $result);
        $this->assertEquals($material->id, $result[0]['material_id']);
        $this->assertArrayHasKey('transactions', $result[0]);
    }

    /** @test */
    public function it_can_import_materials_from_csv()
    {
        $rows = [
            [
                'sku' => 'FLOUR-001',
                'name' => 'Premium Flour',
                'unit' => 'kg',
                'stock_quantity' => 100,
                'reorder_level' => 20,
                'unit_cost' => 5.50,
            ],
            [
                'sku' => 'CHEESE-001',
                'name' => 'Mozzarella',
                'unit' => 'kg',
                'stock_quantity' => 50,
            ],
        ];

        $result = $this->service->importFromCSV($this->tenantId, $rows, $this->user);

        $this->assertEquals(2, $result['created']);
        $this->assertEquals(0, $result['failed']);
        $this->assertCount(0, $result['errors']);
        
        $this->assertDatabaseHas('materials', [
            'tenant_id' => $this->tenantId,
            'sku' => 'FLOUR-001',
            'name' => 'Premium Flour',
        ]);
    }

    /** @test */
    public function it_validates_required_fields_on_import()
    {
        $rows = [
            [
                'sku' => 'TEST-001',
                // Missing name
                'unit' => 'kg',
            ],
        ];

        $result = $this->service->importFromCSV($this->tenantId, $rows, $this->user);

        $this->assertEquals(0, $result['created']);
        $this->assertEquals(1, $result['failed']);
        $this->assertCount(1, $result['errors']);
    }

    /** @test */
    public function it_can_update_existing_materials_on_import()
    {
        $existing = Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'sku' => 'FLOUR-001',
            'name' => 'Old Name',
            'stock_quantity' => 50,
        ]);

        $rows = [
            [
                'sku' => 'FLOUR-001',
                'name' => 'Updated Flour',
                'unit' => 'kg',
                'stock_quantity' => 100,
            ],
        ];

        $result = $this->service->importFromCSV($this->tenantId, $rows, $this->user, true);

        $this->assertEquals(0, $result['created']);
        $this->assertEquals(1, $result['updated']);
        
        $this->assertDatabaseHas('materials', [
            'id' => $existing->id,
            'name' => 'Updated Flour',
            'stock_quantity' => 100,
        ]);
    }

    /** @test */
    public function it_validates_import_data_before_actual_import()
    {
        $rows = [
            ['name' => 'Valid Material', 'unit' => 'kg', 'stock_quantity' => 100],
            ['name' => 'Invalid Material', 'unit' => 'invalid_unit'], // Invalid unit
        ];

        $result = $this->service->validateImportData($this->tenantId, $rows);

        $this->assertEquals(1, $result['valid']);
        $this->assertEquals(1, $result['invalid']);
        $this->assertFalse($result['can_proceed']);
    }

    /** @test */
    public function it_generates_import_template()
    {
        $result = $this->service->generateImportTemplate();

        $this->assertArrayHasKey('headers', $result);
        $this->assertArrayHasKey('example_rows', $result);
        $this->assertArrayHasKey('instructions', $result);
        $this->assertCount(9, $result['headers']);
    }

    /** @test */
    public function it_exports_low_stock_report()
    {
        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 5,
            'reorder_level' => 20,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenantId,
            'stock_quantity' => 50,
            'reorder_level' => 10,
        ]);

        $result = $this->service->exportLowStockReport($this->tenantId);

        $this->assertEquals('Low Stock Alert', $result['report_type']);
        $this->assertEquals(1, $result['total_materials']);
        $this->assertArrayHasKey('shortfall', $result['materials'][0]);
    }

    /** @test */
    public function it_enforces_tenant_isolation_on_export()
    {
        $tenant1 = Tenant::factory()->create();
        $tenant2 = Tenant::factory()->create();

        Material::factory()->count(3)->create(['tenant_id' => $tenant1->id]);
        Material::factory()->count(2)->create(['tenant_id' => $tenant2->id]);

        $result = $this->service->exportToCSV($tenant1->id);

        $this->assertEquals(3, $result['total']);
    }

    /** @test */
    public function it_handles_empty_export_gracefully()
    {
        $result = $this->service->exportToCSV($this->tenantId);

        $this->assertEquals(0, $result['total']);
        $this->assertCount(0, $result['rows']);
    }
}
