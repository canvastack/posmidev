<?php
namespace Tests\Feature\Integration;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\InventoryTransaction;

/**
 * End-to-End Material Workflow Integration Test
 * 
 * Tests the complete material lifecycle:
 * 1. Create material
 * 2. Adjust stock (increase/decrease)
 * 3. Trigger low stock alerts
 * 4. View analytics
 * 5. Export reports
 * 
 * Validates that all BOM material management features work together seamlessly.
 */
class EndToEndMaterialWorkflowTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    public function test_complete_material_lifecycle_from_creation_to_alert(): void
    {
        // Step 1: Create a new material
        $materialData = [
            'name' => 'Premium Coffee Beans',
            'sku' => 'MAT-COFFEE-001',
            'category' => 'Beverages',
            'unit' => 'kg',
            'stock_quantity' => 100,
            'reorder_level' => 20,
            'unit_cost' => 50.00,
            'supplier' => 'Coffee Supplier Co.',
        ];

        $createResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials",
            $materialData,
            $this->authenticatedRequest()['headers']
        );

        $createResponse->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Premium Coffee Beans');
        
        // stock_quantity is decimal, compare as float
        $this->assertEquals(100.0, (float)$createResponse->json('data.stock_quantity'));

        $materialId = $createResponse->json('data.id');

        // Step 2: Adjust stock - Add stock (receiving shipment)
        $addStockResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$materialId}/adjust-stock",
            [
                'type' => 'restock',
                'quantity' => 50,
                'reason' => 'purchase',
                'reference_type' => 'purchase_order',
                'reference_id' => (string) Str::uuid(),
                'notes' => 'New shipment received',
            ],
            $this->authenticatedRequest()['headers']
        );

        $addStockResponse->assertOk();
        $this->assertEquals(150.0, (float)$addStockResponse->json('data.stock_quantity'));

        // Verify transaction was recorded
        $this->assertDatabaseHas('inventory_transactions', [
            'tenant_id' => $this->tenant->id,
            'material_id' => $materialId,
            'transaction_type' => 'restock',
            'reason' => 'purchase',
            'quantity_change' => 50,
        ]);

        // Step 3: Adjust stock - Deduct stock (using materials)
        $deductStockResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$materialId}/adjust-stock",
            [
                'type' => 'deduction',
                'quantity' => 135,
                'reason' => 'production',
                'notes' => 'Used in batch production',
            ],
            $this->authenticatedRequest()['headers']
        );

        $deductStockResponse->assertOk();
        $this->assertEquals(15.0, (float)$deductStockResponse->json('data.stock_quantity'));

        // Step 4: Verify material is now in low stock
        $lowStockResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/low-stock",
            $this->authenticatedRequest()['headers']
        );

        $lowStockResponse->assertOk();
        $lowStockMaterials = collect($lowStockResponse->json('data'));
        $this->assertTrue($lowStockMaterials->contains('id', $materialId));

        // Step 5: Check active alerts
        $alertsResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/active",
            $this->authenticatedRequest()['headers']
        );

        $alertsResponse->assertOk();
        $alerts = collect($alertsResponse->json('data.alerts'));
        $materialAlert = $alerts->firstWhere('material_id', $materialId);
        
        $this->assertNotNull($materialAlert, 'Low stock material should trigger an alert');

        // Step 6: Check analytics - Stock status summary
        $analyticsResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/stock-status",
            $this->authenticatedRequest()['headers']
        );

        $analyticsResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_materials',
                    'stock_status',
                    'stock_percentages',
                    'total_stock_value',
                ],
            ]);

        $this->assertEquals(1, $analyticsResponse->json('data.total_materials'));
        $this->assertEquals(1, $analyticsResponse->json('data.stock_status.low_stock'));

        // Step 7: View material details with transaction history
        $detailsResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$materialId}",
            $this->authenticatedRequest()['headers']
        );

        $detailsResponse->assertOk()
            ->assertJsonPath('data.is_low_stock', true);
        
        $this->assertEquals(15.0, (float)$detailsResponse->json('data.stock_quantity'));

        // Step 8: Export low stock report
        $exportResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/low-stock-report",
            $this->authenticatedRequest()['headers']
        );

        // Verify report endpoint is accessible
        $exportResponse->assertOk();
    }

    public function test_bulk_material_creation_and_analytics(): void
    {
        // Step 1: Bulk create materials in different categories
        $bulkData = [
            'materials' => [
                [
                    'name' => 'Arabica Coffee Beans',
                    'category' => 'Beverages',
                    'unit' => 'kg',
                    'stock_quantity' => 50,
                    'reorder_level' => 10,
                    'unit_cost' => 45.00,
                ],
                [
                    'name' => 'Robusta Coffee Beans',
                    'category' => 'Beverages',
                    'unit' => 'kg',
                    'stock_quantity' => 30,
                    'reorder_level' => 10,
                    'unit_cost' => 35.00,
                ],
                [
                    'name' => 'Whole Milk',
                    'category' => 'Dairy',
                    'unit' => 'L',
                    'stock_quantity' => 100,
                    'reorder_level' => 20,
                    'unit_cost' => 5.00,
                ],
                [
                    'name' => 'Sugar',
                    'category' => 'Sweeteners',
                    'unit' => 'kg',
                    'stock_quantity' => 75,
                    'reorder_level' => 15,
                    'unit_cost' => 3.00,
                ],
            ],
        ];

        $bulkResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/bulk",
            $bulkData,
            $this->authenticatedRequest()['headers']
        );

        $bulkResponse->assertCreated()
            ->assertJsonPath('success', true);

        $created = $bulkResponse->json('data.created');
        $this->assertCount(4, $created);

        // Step 2: Check materials by category
        $categoriesResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/categories",
            $this->authenticatedRequest()['headers']
        );

        $categoriesResponse->assertOk();
        $categories = $categoriesResponse->json('data.categories');
        $this->assertEquals(3, count($categories)); // Beverages, Dairy, Sweeteners

        // Find Beverages category
        $beverages = collect($categories)->firstWhere('category', 'Beverages');
        $this->assertNotNull($beverages);
        $this->assertEquals(2, $beverages['total_materials']);
        $this->assertEquals(3300.00, $beverages['total_stock_value']); // (50*45) + (30*35) = 2250 + 1050

        // Step 3: Check cost analysis
        $costAnalysisResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/cost-analysis",
            $this->authenticatedRequest()['headers']
        );

        $costAnalysisResponse->assertOk();
        $this->assertEquals(4, $costAnalysisResponse->json('data.total_materials'));
        
        $totalValue = (50 * 45) + (30 * 35) + (100 * 5) + (75 * 3);
        $this->assertEquals($totalValue, $costAnalysisResponse->json('data.total_stock_value'));

        // Step 4: Filter cost analysis by categories
        $filteredCostResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/cost-analysis?categories[]=Beverages&categories[]=Dairy",
            $this->authenticatedRequest()['headers']
        );

        $filteredCostResponse->assertOk();
        // Should only include Beverages and Dairy, not Sweeteners
        $this->assertEquals(3, $filteredCostResponse->json('data.total_materials'));
    }

    public function test_material_usage_tracking_and_turnover_rate(): void
    {
        // Step 1: Create material
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Material',
            'stock_quantity' => 100,
            'unit_cost' => 10.00,
        ]);

        // Step 2: Create usage transactions over 30 days
        $dates = [];
        for ($i = 29; $i >= 0; $i--) {
            $dates[] = now()->subDays($i);
        }

        // Create varied usage pattern
        $currentStock = 100;
        foreach ($dates as $index => $date) {
            if ($index % 3 === 0) { // Every 3rd day
                InventoryTransaction::factory()->deduction()->create([
                    'tenant_id' => $this->tenant->id,
                    'material_id' => $material->id,
                    'quantity_before' => $currentStock,
                    'quantity_change' => -5,
                    'quantity_after' => $currentStock - 5,
                    'reason' => 'production',
                    'created_at' => $date,
                ]);
                $currentStock -= 5;
            }
        }

        // Step 3: Check usage trends
        $trendsResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/usage-trends?days=30",
            $this->authenticatedRequest()['headers']
        );

        $trendsResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period',
                    'by_type',
                    'by_reason',
                    'daily_trends',
                    'total_transactions',
                ],
            ]);

        $this->assertGreaterThan(0, $trendsResponse->json('data.total_transactions'));

        // Step 4: Check turnover rate
        $turnoverResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/turnover-rate?days=30",
            $this->authenticatedRequest()['headers']
        );

        $turnoverResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period',
                    'turnover_data',
                    'average_turnover_rate',
                ],
            ]);

        $turnoverData = collect($turnoverResponse->json('data.turnover_data'));
        $materialTurnover = $turnoverData->firstWhere('material_id', $material->id);
        $this->assertNotNull($materialTurnover);
        $this->assertArrayHasKey('turnover_rate', $materialTurnover);
    }

    public function test_tenant_isolation_in_material_workflow(): void
    {
        // Create material for current tenant
        $ownMaterial = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Own Material',
        ]);

        // Create material for another tenant
        $otherTenant = $this->createOtherTenant();
        $otherMaterial = Material::factory()->create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other Tenant Material',
        ]);

        // Try to access other tenant's material - should fail
        $accessResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$otherMaterial->id}",
            $this->authenticatedRequest()['headers']
        );
        $accessResponse->assertNotFound();

        // Try to adjust other tenant's material stock - should fail
        $adjustResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$otherMaterial->id}/adjust-stock",
            [
                'type' => 'adjustment',
                'quantity' => 10,
                'reason' => 'count_adjustment',
            ],
            $this->authenticatedRequest()['headers']
        );
        $adjustResponse->assertNotFound();

        // Verify analytics only show current tenant's materials
        $analyticsResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/stock-status",
            $this->authenticatedRequest()['headers']
        );

        $analyticsResponse->assertOk();
        $this->assertEquals(1, $analyticsResponse->json('data.total_materials'));

        // Try to access other tenant's context - should fail (403 or 404)
        $crossTenantResponse = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/materials",
            $this->authenticatedRequest()['headers']
        );
        
        // Middleware should block access to different tenant context
        // Could be 403 Forbidden or return empty results depending on implementation
        if ($crossTenantResponse->status() === 200) {
            // If returns 200, should show empty results (tenant isolation at query level)
            $data = $crossTenantResponse->json('data.data') ?? $crossTenantResponse->json('data');
            $this->assertEmpty($data, 'Should not see other tenant materials');
        } else {
            // Or should be blocked entirely (403/404)
            $this->assertContains($crossTenantResponse->status(), [403, 404], 'Should block cross-tenant access');
        }
    }
}