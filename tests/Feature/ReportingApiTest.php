<?php

namespace Tests\Feature;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Src\Pms\Infrastructure\Models\Product;

class ReportingApiTest extends TestCase
{
    use TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    public function test_it_can_get_executive_dashboard(): void
    {
        // Arrange - Create test data
        Material::factory()->count(5)->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
            'unit_cost' => 10.00,
        ]);

        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'inventory_management_type' => 'bom',
        ]);
        
        Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/executive-dashboard",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'report_type',
                    'tenant_id',
                    'generated_at',
                    'key_metrics',
                    'stock_status',
                    'inventory_value_by_category',
                    'top_alerts',
                    'production_capacity',
                ],
            ]);
    }

    public function test_it_can_get_material_usage_report(): void
    {
        // Arrange - Create material with transactions
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
            'created_at' => now()->subDays(10),
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/material-usage?days=30",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period',
                    'summary',
                    'material_details',
                    'generated_at',
                ],
            ]);
    }

    public function test_it_can_get_recipe_costing_report(): void
    {
        // Arrange - Create recipe with materials
        $product = Product::factory()->create(['tenant_id' => $this->tenant->id]);
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
            'yield_quantity' => 10,
        ]);

        $material1 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'unit_cost' => 5.00,
        ]);

        $material2 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'unit_cost' => 10.00,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material1->id,
            'quantity_required' => 2,
            'waste_percentage' => 0,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material2->id,
            'quantity_required' => 1,
            'waste_percentage' => 0,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/recipe-costing",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'report_type',
                    'summary',
                    'recipes',
                    'generated_at',
                ],
            ]);

        $recipes = $response->json('data.recipes');
        $this->assertCount(1, $recipes);
        $this->assertEquals(20.00, $recipes[0]['total_cost']); // (2 * 5) + (1 * 10)
    }

    public function test_it_can_get_stock_movement_report(): void
    {
        // Arrange - Create material with various transactions
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
        ]);

        // IN transactions
        InventoryTransaction::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'transaction_type' => 'restock',
            'reason' => 'purchase',
            'quantity_change' => 50,
            'created_at' => now()->subDays(15),
        ]);

        // OUT transactions
        InventoryTransaction::factory()->count(5)->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'transaction_type' => 'deduction',
            'reason' => 'sale',
            'quantity_change' => -20,
            'created_at' => now()->subDays(10),
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/stock-movement?days=30",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'report_type',
                    'period',
                    'summary',
                    'by_transaction_type',
                    'by_reason',
                    'daily_movement',
                    'recent_transactions',
                    'generated_at',
                ],
            ]);

        $summary = $response->json('data.summary');
        $this->assertArrayHasKey('total_transactions', $summary);
        $this->assertArrayHasKey('total_materials_affected', $summary);
        $this->assertArrayHasKey('net_stock_change', $summary);
    }

    public function test_it_can_get_production_efficiency_report(): void
    {
        // Arrange - Create recipes and materials
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'inventory_management_type' => 'bom',
        ]);
        
        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 100,
            'unit_cost' => 10.00,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $material->id,
            'quantity_required' => 5,
            'waste_percentage' => 10,
        ]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/production-efficiency",
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'report_type',
                    'summary',
                    'efficiency_data',
                    'top_efficient_products',
                    'least_efficient_products',
                    'generated_at',
                ],
            ]);
    }

    public function test_it_can_export_report(): void
    {
        // Arrange - Create test data
        Material::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 50,
            'unit_cost' => 10.00,
        ]);

        // Act - Export executive dashboard
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/export",
            ['report_type' => 'executive_dashboard', 'format' => 'json'],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'report_type',
                    'format',
                    'generated_at',
                    'report_data',
                ],
            ]);

        $this->assertEquals('executive_dashboard', $response->json('data.report_type'));
    }

    public function test_it_validates_report_export_request(): void
    {
        // Act - Missing required report_type
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/export",
            ['format' => 'json'],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['report_type']);
    }

    public function test_it_validates_report_type_enum(): void
    {
        // Act - Invalid report_type
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/export",
            ['report_type' => 'invalid_report', 'format' => 'json'],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['report_type']);
    }

    public function test_it_can_export_material_usage_report_with_days(): void
    {
        // Arrange
        $material = Material::factory()->create(['tenant_id' => $this->tenant->id]);
        InventoryTransaction::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'transaction_type' => 'deduction',
            'reason' => 'sale',
            'quantity_change' => -10,
            'created_at' => now()->subDays(5),
        ]);

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/export",
            ['report_type' => 'material_usage', 'format' => 'json', 'days' => 7],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertOk();
        $this->assertEquals('material_usage', $response->json('data.report_type'));
    }

    public function test_it_enforces_tenant_isolation_for_reports(): void
    {
        // Arrange
        $otherTenant = $this->createOtherTenant();
        Material::factory()->count(5)->create(['tenant_id' => $otherTenant->id]);

        // Act
        $response = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/bom/reports/executive-dashboard",
            $this->authenticatedRequest()['headers']
        );

        // Assert - Should be forbidden
        $response->assertForbidden();
    }

    public function test_it_requires_authentication_for_reports(): void
    {
        // Act - Without authentication
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/bom/reports/executive-dashboard");

        // Assert
        $response->assertUnauthorized();
    }

    public function test_it_requires_export_permission_for_export_endpoint(): void
    {
        // Arrange - Remove export permission
        $this->user->revokePermissionTo('bom.reports.export');

        // Act
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/export",
            ['report_type' => 'executive_dashboard', 'format' => 'json'],
            $this->authenticatedRequest()['headers']
        );

        // Assert
        $response->assertForbidden();
    }
}