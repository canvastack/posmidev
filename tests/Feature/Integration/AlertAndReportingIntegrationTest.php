<?php

namespace Tests\Feature\Integration;

use Tests\TestCase;
use Tests\Traits\TenantTestTrait;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\InventoryTransaction;
use Carbon\Carbon;

/**
 * Alert and Reporting Integration Test
 * 
 * Tests complete alert and reporting workflows:
 * 1. Stock alerts triggered by low inventory
 * 2. Predictive alerts based on usage patterns
 * 3. Reorder recommendations generation
 * 4. Executive dashboard data aggregation
 * 5. Material analytics and cost tracking
 * 6. Alert-driven workflow (alert → action → verification)
 * 
 * Validates that alerting and reporting systems work together correctly.
 */
class AlertAndReportingIntegrationTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    public function test_complete_alert_workflow_from_low_stock_to_reorder(): void
    {
        // Scenario: Material goes low → Alert fires → Check recommendation → Reorder
        
        // Step 1: Create material with stock below reorder level
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Critical Material',
            'stock_quantity' => 50,
            'reorder_level' => 100,
            'unit' => 'g',
            'unit_cost' => 5.00,
        ]);

        // Step 2: Check active alerts - should show low stock alert
        $alertResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/active",
            $this->authenticatedRequest()['headers']
        );

        $alertResponse->assertOk();
        
        $alerts = collect($alertResponse->json('data.alerts'));
        $criticalAlert = $alerts->firstWhere('material_name', 'Critical Material');
        
        $this->assertNotNull($criticalAlert);
        $this->assertEquals('low', $criticalAlert['severity']);
        $this->assertEquals(50, $criticalAlert['current_stock']);
        $this->assertEquals(100, $criticalAlert['reorder_level']);

        // Step 3: Get reorder recommendations
        $reorderResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/reorder-recommendations",
            $this->authenticatedRequest()['headers']
        );

        $reorderResponse->assertOk();

        $recommendations = collect($reorderResponse->json('data.recommendations'));
        $materialReco = $recommendations->firstWhere('material_name', 'Critical Material');
        
        $this->assertNotNull($materialReco);
        $this->assertGreaterThan(0, $materialReco['recommended_order_quantity']);
        $this->assertGreaterThan(0, $materialReco['estimated_cost']);

        // Step 4: Simulate restock (adjust stock)
        $adjustResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/adjust-stock",
            [
                'quantity' => $materialReco['recommended_order_quantity'],
                'type' => 'restock',
                'reason' => 'purchase',
                'notes' => 'Reorder based on system recommendation',
            ],
            $this->authenticatedRequest()['headers']
        );

        $adjustResponse->assertOk();

        // Step 5: Verify alerts cleared
        $verifyResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/active",
            $this->authenticatedRequest()['headers']
        );

        $verifyResponse->assertOk();
        
        $remainingAlerts = collect($verifyResponse->json('data.alerts'));
        $shouldBeNull = $remainingAlerts->firstWhere('material_name', 'Critical Material');
        
        // Alert should be gone after restock
        $this->assertNull($shouldBeNull, 'Alert should be cleared after restocking above reorder level');
    }

    public function test_predictive_alerts_based_on_usage_patterns(): void
    {
        // Scenario: Material with consistent usage triggers predictive alert before actual stockout
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Fast Moving Material',
            'stock_quantity' => 500,
            'reorder_level' => 200,
            'unit' => 'kg',
            'unit_cost' => 10.00,
        ]);

        // Create usage pattern: 20kg consumed daily for last 30 days
        $baseDate = Carbon::now()->subDays(30);
        $currentStock = 500;
        
        for ($i = 0; $i < 30; $i++) {
            InventoryTransaction::factory()->deduction()->create([
                'tenant_id' => $this->tenant->id,
                'material_id' => $material->id,
                'quantity_before' => $currentStock,
                'quantity_change' => -20,
                'quantity_after' => $currentStock - 20,
                'reason' => 'production',
                'created_at' => $baseDate->copy()->addDays($i),
            ]);
            $currentStock -= 20;
        }
        
        // Update material's current stock to reflect transactions
        $material->update(['stock_quantity' => $currentStock]);

        // Get predictive alerts (forecast 15 days ahead)
        $predictiveResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/predictive?forecast_days=15",
            $this->authenticatedRequest()['headers']
        );

        $predictiveResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'predictive_alerts',
                    'total_alerts',
                    'forecast_period_days',
                    'based_on_usage_days',
                ],
            ]);

        $alerts = collect($predictiveResponse->json('data.predictive_alerts'));
        $materialAlert = $alerts->firstWhere('material_name', 'Fast Moving Material');
        
        $this->assertNotNull($materialAlert);
        
        // Current: 500kg, Usage: 20kg/day, In 15 days: 500 - (20*15) = 200kg (at reorder level)
        // Should show predictive alert
        $this->assertEquals(15, $predictiveResponse->json('data.forecast_period_days'));
        $this->assertGreaterThan(0, $materialAlert['average_daily_usage']);
    }

    public function test_executive_dashboard_aggregates_all_metrics(): void
    {
        // Scenario: Dashboard shows comprehensive view of BOM system health
        
        // Create diverse material portfolio
        $criticalMaterial = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Critical Stock',
            'stock_quantity' => 10,
            'reorder_level' => 100,
            'unit_cost' => 50.00,
            'unit' => 'pcs',
        ]);

        $normalMaterial = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Normal Stock',
            'stock_quantity' => 500,
            'reorder_level' => 100,
            'unit_cost' => 5.00,
            'unit' => 'kg',
        ]);

        $excessMaterial = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Excess Stock',
            'stock_quantity' => 10000,
            'reorder_level' => 100,
            'unit_cost' => 2.00,
            'unit' => 'g',
        ]);

        // Create products with recipes
        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dashboard Product',
            'inventory_management_type' => 'bom',
        ]);

        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe->id,
            'material_id' => $normalMaterial->id,
            'quantity_required' => 10,
            'waste_percentage' => 0,
            'unit' => 'kg',
        ]);

        // Get executive dashboard
        $dashboardResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/executive-dashboard",
            $this->authenticatedRequest()['headers']
        );

        $dashboardResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'key_metrics' => [
                        'total_materials',
                        'total_products_with_bom',
                        'total_active_recipes',
                        'total_inventory_value',
                        'critical_alerts_count',
                    ],
                    'stock_status' => [
                        'critical',
                        'low',
                        'normal',
                        'excess',
                    ],
                    'top_alerts',
                    'production_capacity',
                ],
            ]);

        // Verify metrics
        $metrics = $dashboardResponse->json('data.key_metrics');
        $this->assertEquals(3, $metrics['total_materials']);
        $this->assertEquals(1, $metrics['total_products_with_bom']);
        
        // Verify stock status shows critical material
        $stockStatus = $dashboardResponse->json('data.stock_status');
        $this->assertGreaterThan(0, $stockStatus['critical']); // Critical material should be counted

        // Verify alerts are present
        $this->assertNotEmpty($dashboardResponse->json('data.top_alerts'));
    }

    public function test_material_usage_report_with_cost_tracking(): void
    {
        // Scenario: Track material usage and costs over time period
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Tracked Material',
            'stock_quantity' => 1000,
            'unit_cost' => 15.50,
            'unit' => 'L',
        ]);

        // Create transactions over 7 days
        $startDate = Carbon::now()->subDays(7);
        
        // Day 1: Purchase 500L
        InventoryTransaction::factory()->restock()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_before' => 1000,
            'quantity_change' => 500,
            'quantity_after' => 1500,
            'reason' => 'purchase',
            'created_at' => $startDate->copy()->addDays(1),
        ]);

        // Day 2-6: Daily production usage 80L
        for ($i = 2; $i <= 6; $i++) {
            $before = 1500 - (($i - 2) * 80);
            InventoryTransaction::factory()->deduction()->create([
                'tenant_id' => $this->tenant->id,
                'material_id' => $material->id,
                'quantity_before' => $before,
                'quantity_change' => -80,
                'quantity_after' => $before - 80,
                'reason' => 'production',
                'created_at' => $startDate->copy()->addDays($i),
            ]);
        }

        // Day 7: Waste adjustment
        InventoryTransaction::factory()->deduction()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_before' => 1100,
            'quantity_change' => -20,
            'quantity_after' => 1080,
            'reason' => 'waste',
            'created_at' => $startDate->copy()->addDays(7),
        ]);

        // Get material usage report
        $reportResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/material-usage?days=7",
            $this->authenticatedRequest()['headers']
        );

        $reportResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period_days',
                    'summary' => [
                        'total_materials_used',
                        'total_value_consumed',
                        'total_waste_value',
                    ],
                    'by_material',
                    'by_reason',
                ],
            ]);

        $summary = $reportResponse->json('data.summary');
        
        // Total out: (5 days * 80L) + 20L waste = 420L
        // Value consumed: 420L * 15.50 = 6,510
        $this->assertEqualsWithDelta(6510, $summary['total_value_consumed'], 0.1);
        
        // Waste: 20L * 15.50 = 310
        $this->assertEqualsWithDelta(310, $summary['total_waste_value'], 0.1);
    }

    public function test_recipe_costing_report_accuracy(): void
    {
        // Scenario: Verify recipe cost calculations across multiple recipes
        
        // Create materials with known costs
        $material1 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Material A',
            'stock_quantity' => 1000,
            'unit_cost' => 10.00,
            'unit' => 'g',
        ]);

        $material2 = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Material B',
            'stock_quantity' => 1000,
            'unit_cost' => 20.00,
            'unit' => 'ml',
        ]);

        // Recipe 1: Low cost product
        $product1 = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Low Cost Product',
            'inventory_management_type' => 'bom',
        ]);

        $recipe1 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product1->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe1->id,
            'material_id' => $material1->id,
            'quantity_required' => 10, // 10g
            'waste_percentage' => 0,
            'unit' => 'g',
        ]);
        // Cost: 10g * 10.00 = 100.00

        // Recipe 2: High cost product
        $product2 = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'High Cost Product',
            'inventory_management_type' => 'bom',
        ]);

        $recipe2 = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product2->id,
            'is_active' => true,
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe2->id,
            'material_id' => $material1->id,
            'quantity_required' => 50,
            'waste_percentage' => 10,
            'unit' => 'g',
        ]);

        RecipeMaterial::factory()->create([
            'tenant_id' => $this->tenant->id,
            'recipe_id' => $recipe2->id,
            'material_id' => $material2->id,
            'quantity_required' => 30,
            'waste_percentage' => 5,
            'unit' => 'ml',
        ]);
        // Cost: (50g * 1.10 * 10.00) + (30ml * 1.05 * 20.00) = 550 + 630 = 1,180.00

        // Get recipe costing report
        $reportResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/recipe-costing",
            $this->authenticatedRequest()['headers']
        );

        $reportResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'recipes',
                    'summary' => [
                        'total_recipes',
                        'total_active_recipes',
                        'average_recipe_cost',
                    ],
                ],
            ]);

        $recipes = collect($reportResponse->json('data.recipes'));
        
        $lowCostRecipe = $recipes->firstWhere('product_name', 'Low Cost Product');
        $this->assertNotNull($lowCostRecipe);
        $this->assertEqualsWithDelta(100.00, $lowCostRecipe['total_cost'], 0.01);

        $highCostRecipe = $recipes->firstWhere('product_name', 'High Cost Product');
        $this->assertNotNull($highCostRecipe);
        $this->assertEqualsWithDelta(1180.00, $highCostRecipe['total_cost'], 0.01);
    }

    public function test_alert_dashboard_comprehensive_view(): void
    {
        // Scenario: Alert dashboard shows all alert types in one view
        
        // Critical material (below reorder)
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Critical Material',
            'stock_quantity' => 5,
            'reorder_level' => 100,
            'unit' => 'pcs',
        ]);

        // Low stock material
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Low Stock Material',
            'stock_quantity' => 50,
            'reorder_level' => 100,
            'unit' => 'kg',
        ]);

        // Normal material
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Normal Material',
            'stock_quantity' => 500,
            'reorder_level' => 100,
            'unit' => 'L',
        ]);

        // Get alert dashboard
        $dashboardResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/dashboard",
            $this->authenticatedRequest()['headers']
        );

        $dashboardResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'summary' => [
                        'total_alerts',
                        'by_severity' => [
                            'critical',
                            'low',
                            'medium',
                        ],
                    ],
                    'active_alerts',
                    'recent_transactions',
                    'top_materials_by_value',
                ],
            ]);

        $summary = $dashboardResponse->json('data.summary');
        
        // Should have at least 2 alerts (critical + low)
        $this->assertGreaterThanOrEqual(2, $summary['total_alerts']);
        $this->assertGreaterThan(0, $summary['by_severity']['critical']);
        $this->assertGreaterThan(0, $summary['by_severity']['low']);

        // Verify active alerts are detailed
        $alerts = collect($dashboardResponse->json('data.active_alerts'));
        $this->assertNotEmpty($alerts);
        
        $criticalAlert = $alerts->firstWhere('material_name', 'Critical Material');
        $this->assertEquals('critical', $criticalAlert['severity']);
    }

    public function test_stock_movement_report_comprehensive(): void
    {
        // Scenario: Complete stock movement tracking with all transaction types
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Tracked Material',
            'stock_quantity' => 1000,
            'unit' => 'kg',
        ]);

        $now = Carbon::now();

        // Various transaction types
        $currentStock = 1000;
        
        // Restock 500
        InventoryTransaction::factory()->restock()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_before' => $currentStock,
            'quantity_change' => 500,
            'quantity_after' => $currentStock + 500,
            'reason' => 'purchase',
            'created_at' => $now->copy()->subDays(5),
        ]);
        $currentStock += 500;

        // Deduction 100 for production
        InventoryTransaction::factory()->deduction()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_before' => $currentStock,
            'quantity_change' => -100,
            'quantity_after' => $currentStock - 100,
            'reason' => 'production',
            'created_at' => $now->copy()->subDays(4),
        ]);
        $currentStock -= 100;

        // Deduction 50 for waste
        InventoryTransaction::factory()->deduction()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_before' => $currentStock,
            'quantity_change' => -50,
            'quantity_after' => $currentStock - 50,
            'reason' => 'waste',
            'created_at' => $now->copy()->subDays(3),
        ]);
        $currentStock -= 50;

        // Restock 200
        InventoryTransaction::factory()->restock()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_before' => $currentStock,
            'quantity_change' => 200,
            'quantity_after' => $currentStock + 200,
            'reason' => 'purchase',
            'created_at' => $now->copy()->subDays(2),
        ]);
        $currentStock += 200;

        // Deduction 150 for production
        InventoryTransaction::factory()->deduction()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_before' => $currentStock,
            'quantity_change' => -150,
            'quantity_after' => $currentStock - 150,
            'reason' => 'production',
            'created_at' => $now->copy()->subDays(1),
        ]);
        $currentStock -= 150;

        // Deduction 20 for damage
        InventoryTransaction::factory()->deduction()->create([
            'tenant_id' => $this->tenant->id,
            'material_id' => $material->id,
            'quantity_before' => $currentStock,
            'quantity_change' => -20,
            'quantity_after' => $currentStock - 20,
            'reason' => 'damage',
            'created_at' => $now->copy(),
        ]);

        // Get stock movement report
        $reportResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/stock-movement?days=7",
            $this->authenticatedRequest()['headers']
        );

        $reportResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'period_days',
                    'summary' => [
                        'total_in',
                        'total_out',
                        'net_movement',
                    ],
                    'by_transaction_type',
                    'by_reason',
                    'daily_movement',
                    'recent_transactions',
                ],
            ]);

        $summary = $reportResponse->json('data.summary');
        
        // Total in (restock): 500 + 200 = 700
        $this->assertEquals(700, $summary['total_in']);
        
        // Total out (deduction): 100 + 50 + 150 + 20 = 320
        $this->assertEquals(320, $summary['total_out']);
        
        // Net: 700 - 320 = 380
        $this->assertEquals(380, $summary['net_movement']);

        // Verify breakdown by reason
        $byReason = collect($reportResponse->json('data.by_reason'));
        
        $production = $byReason->firstWhere('reason', 'production');
        $this->assertEquals(250, abs($production['quantity'])); // 100 + 150

        $waste = $byReason->firstWhere('reason', 'waste');
        $this->assertEquals(50, abs($waste['quantity']));
    }

    public function test_cost_analysis_with_category_breakdown(): void
    {
        // Scenario: Analyze inventory costs by category
        
        // Category 1: High value materials
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Premium Material 1',
            'category' => 'Premium',
            'stock_quantity' => 100,
            'unit_cost' => 50.00,
            'unit' => 'pcs',
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Premium Material 2',
            'category' => 'Premium',
            'stock_quantity' => 50,
            'unit_cost' => 100.00,
            'unit' => 'pcs',
        ]);

        // Category 2: Standard materials
        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Standard Material 1',
            'category' => 'Standard',
            'stock_quantity' => 1000,
            'unit_cost' => 5.00,
            'unit' => 'kg',
        ]);

        Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Standard Material 2',
            'category' => 'Standard',
            'stock_quantity' => 500,
            'unit_cost' => 2.00,
            'unit' => 'L',
        ]);

        // Get cost analysis
        $analysisResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/cost-analysis",
            $this->authenticatedRequest()['headers']
        );

        $analysisResponse->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_stock_value',
                    'average_unit_cost',
                    'total_materials',
                    'top_materials_by_value',
                    'cost_by_category',
                ],
            ]);

        // Premium value: (100 * 50) + (50 * 100) = 5,000 + 5,000 = 10,000
        // Standard value: (1000 * 5) + (500 * 2) = 5,000 + 1,000 = 6,000
        // Total: 16,000
        
        $totalValue = $analysisResponse->json('data.total_stock_value');
        $this->assertEqualsWithDelta(16000, $totalValue, 0.1);

        // Verify category breakdown
        $byCategory = collect($analysisResponse->json('data.cost_by_category'));
        
        $premiumCategory = $byCategory->firstWhere('category', 'Premium');
        $this->assertEqualsWithDelta(10000, $premiumCategory['total_value'], 0.1);

        $standardCategory = $byCategory->firstWhere('category', 'Standard');
        $this->assertEqualsWithDelta(6000, $standardCategory['total_value'], 0.1);
    }
}