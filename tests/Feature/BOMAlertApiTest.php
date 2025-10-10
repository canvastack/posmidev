<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\InventoryTransaction;

/**
 * BOMAlertApiTest
 * 
 * Tests for BOM (Bill of Materials) Stock Alert API endpoints
 * 
 * IMPORTANT: StockAlertService does NOT use StockAlert model!
 * It dynamically calculates alerts from Material stock levels and InventoryTransaction usage patterns.
 */
class BOMAlertApiTest extends TestCase
{
    use TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    public function test_it_can_get_active_alerts(): void
    {
        // Arrange - Create materials with low stock (alerts are computed from material stock levels)
        $lowStockMaterial = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Low Stock Material',
            'stock_quantity' => 5,
            'reorder_level' => 10,
        ]);

        $outOfStockMaterial = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Out of Stock Material',
            'stock_quantity' => 0,
            'reorder_level' => 10,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/active",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'alerts' => [
                        '*' => [
                            'material_id',
                            'material_name',
                            'sku',
                            'category',
                            'current_stock',
                            'reorder_level',
                            'unit',
                            'alerts',
                            'alert_count',
                            'highest_severity',
                        ],
                    ],
                    'total_alerts',
                    'severity_summary',
                    'generated_at',
                ],
            ]);

        $this->assertGreaterThanOrEqual(2, count($response->json('data.alerts')));
    }

    public function test_it_can_get_predictive_alerts(): void
    {
        // Arrange - Create material with usage history
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 50,
            'reorder_level' => 20,
        ]);

        // Create usage transactions (simulate consistent usage) - need 30 days for avgDailyUsage calculation
        for ($i = 1; $i <= 30; $i++) {
            InventoryTransaction::factory()->create([
                'tenant_id' => $this->tenant->id,
                'material_id' => $material->id,
                'transaction_type' => 'deduction',
                'reason' => 'sale',
                'quantity_change' => -2, // Will deplete in 25 days (50/2)
                'quantity_before' => $material->stock_quantity + ($i * 2),
                'quantity_after' => $material->stock_quantity + ($i * 2) - 2,
                'created_at' => now()->subDays($i),
            ]);
        }

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/predictive?forecast_days=7",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'predictive_alerts',
                    'total_alerts',
                    'forecast_period_days',
                    'based_on_usage_days',
                    'generated_at',
                ],
            ]);
    }

    public function test_it_can_get_reorder_recommendations(): void
    {
        // Arrange - Create material below reorder level
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Material Needing Reorder',
            'stock_quantity' => 5,
            'reorder_level' => 20,
            'unit_cost' => 10.00,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/reorder-recommendations?target_days_of_stock=30",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'recommendations',
                    'total_materials',
                    'total_estimated_cost',
                    'target_days_of_stock',
                    'priority_summary',
                    'generated_at',
                ],
            ]);

        $data = $response->json('data');
        $this->assertGreaterThanOrEqual(1, $data['total_materials']);
    }

    public function test_it_can_get_alert_dashboard(): void
    {
        // Arrange - Create various alert scenarios (alerts are computed from material stock levels)
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 5,
            'reorder_level' => 20,
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 0,
            'reorder_level' => 10,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/dashboard",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'summary',
                    'active_alerts',
                    'predictive_alerts',
                    'reorder_recommendations',
                    'total_reorder_cost',
                    'generated_at',
                ],
            ]);
    }

    public function test_it_validates_forecast_days_parameter(): void
    {
        // Act - Invalid forecast_days (too high)
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/predictive?forecast_days=100",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['forecast_days']);
    }

    public function test_it_validates_target_days_of_stock_parameter(): void
    {
        // Act - Invalid target_days_of_stock
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/reorder-recommendations?target_days_of_stock=500",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['target_days_of_stock']);
    }

    public function test_it_enforces_tenant_isolation_for_alerts(): void
    {
        // Arrange - Create material in another tenant (alerts are computed dynamically)
        $otherTenant = $this->createOtherTenant();
        Material::factory()->create([
            'tenant_id' => $otherTenant->id,
            'stock_quantity' => 0,
            'reorder_level' => 10,
        ]);

        // Act - Try to access other tenant's alerts
        $response = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/bom/alerts/active",
            $this->authenticatedRequest()['headers']
        );

        // Assert - Should be forbidden
        $response->assertForbidden();
    }

    public function test_it_requires_authentication_for_alerts(): void
    {
        // Act - Without authentication
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/bom/alerts/active");

        // Assert
        $response->assertUnauthorized();
    }
}