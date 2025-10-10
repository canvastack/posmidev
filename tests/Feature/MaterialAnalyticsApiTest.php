<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\InventoryTransaction;

class MaterialAnalyticsApiTest extends TestCase
{
    use TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    public function test_it_can_get_stock_status_summary(): void
    {
        // Arrange - Create materials with different stock levels
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Normal Stock Material',
            'stock_quantity' => 100,
            'reorder_level' => 10,
            'unit_cost' => 5.00,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Low Stock Material',
            'stock_quantity' => 5,
            'reorder_level' => 10,
            'unit_cost' => 10.00,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Out of Stock Material',
            'stock_quantity' => 0,
            'reorder_level' => 10,
            'unit_cost' => 3.00,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/stock-status",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_materials',
                    'stock_status' => [
                        'normal',
                        'low_stock',
                        'out_of_stock',
                    ],
                    'stock_percentages' => [
                        'normal',
                        'low_stock',
                        'out_of_stock',
                    ],
                    'total_stock_value',
                    'generated_at',
                ],
            ]);

        $data = $response->json('data');
        $this->assertEquals(3, $data['total_materials']);
        $this->assertEquals(1, $data['stock_status']['normal']);
        $this->assertEquals(1, $data['stock_status']['low_stock']);
        $this->assertEquals(1, $data['stock_status']['out_of_stock']);
    }

    public function test_it_can_get_materials_by_category(): void
    {
        // Arrange - Create materials in different categories
        Material::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'category' => 'Beverages',
            'stock_quantity' => 50,
            'unit_cost' => 5.00,
        ]);

        Material::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'category' => 'Food',
            'stock_quantity' => 30,
            'unit_cost' => 10.00,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/categories",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'categories' => [
                        '*' => [
                            'category',
                            'total_materials',
                            'total_stock_value',
                            'low_stock_count',
                            'materials',
                        ],
                    ],
                    'total_categories',
                    'generated_at',
                ],
            ]);

        $data = $response->json('data');
        $this->assertCount(2, $data['categories']);
    }

    public function test_it_can_get_usage_trends(): void
    {
        // Arrange - Create material and transactions
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        InventoryTransaction::factory()->count(5)->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'transaction_type' => 'deduction',
            'reason' => 'sale',
            'quantity_change' => -10,
            'created_at' => now()->subDays(5),
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/usage-trends?days=30",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period',
                    'by_type',
                    'by_reason',
                    'daily_trends',
                    'total_transactions',
                    'generated_at',
                ],
            ]);
    }

    public function test_it_validates_days_parameter(): void
    {
        // Act - Invalid days parameter
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/usage-trends?days=500",
            $this->authenticatedRequest()['headers']
        );

        // Assert - Should fail validation (max 365)
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['days']);
    }

    public function test_it_can_get_cost_analysis(): void
    {
        // Arrange
        Material::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'category' => 'Beverages',
            'stock_quantity' => 100,
            'unit_cost' => 5.00,
        ]);

        Material::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'category' => 'Food',
            'stock_quantity' => 50,
            'unit_cost' => 10.00,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/cost-analysis",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_stock_value',
                    'average_unit_cost',
                    'total_materials',
                    'top_materials_by_value',
                    'cost_by_category',
                    'generated_at',
                ],
            ]);
    }

    public function test_it_can_filter_cost_analysis_by_categories(): void
    {
        // Arrange
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'category' => 'Beverages',
            'stock_quantity' => 100,
            'unit_cost' => 5.00,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'category' => 'Food',
            'stock_quantity' => 50,
            'unit_cost' => 10.00,
        ]);

        // Act - Filter by Beverages only
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/cost-analysis?categories[]=Beverages",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
    }

    public function test_it_can_get_turnover_rate(): void
    {
        // Arrange - Create material with transactions
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
            'unit_cost' => 10.00,
        ]);

        // Create some OUT transactions
        InventoryTransaction::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'transaction_type' => 'deduction',
            'reason' => 'sale',
            'quantity_change' => -20,
            'created_at' => now()->subDays(10),
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/turnover-rate?days=30",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period',
                    'turnover_data',
                    'average_turnover_rate',
                    'generated_at',
                ],
            ]);
    }

    public function test_it_enforces_tenant_isolation_for_analytics(): void
    {
        // Arrange
        $otherTenant = $this->createOtherTenant();
        Material::factory()->count(5)->create(['tenant_id' => $otherTenant->id]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/bom/analytics/stock-status",
            $this->authenticatedRequest()['headers']
        );

        // Assert - Should be forbidden
        $response->assertForbidden();
    }

    public function test_it_requires_authentication_for_analytics(): void
    {
        // Act - Without authentication
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/bom/analytics/stock-status");

        // Assert
        $response->assertUnauthorized();
    }
}