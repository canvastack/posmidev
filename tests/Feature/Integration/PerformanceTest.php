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
 * Performance Test for BOM Engine
 * 
 * Tests system performance under realistic load:
 * 1. Large material catalog (1000+ materials)
 * 2. Complex recipe calculations (100+ products)
 * 3. Bulk availability checks
 * 4. Transaction history queries (10,000+ records)
 * 5. Report generation with large datasets
 * 6. Concurrent operation scenarios
 * 
 * Validates that the system can handle production-scale data volumes.
 */
class PerformanceTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    public function test_material_list_pagination_with_large_catalog(): void
    {
        // Scenario: Handle 500 materials with pagination
        
        // Create 500 materials
        Material::factory()->count(500)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $startTime = microtime(true);

        // Get first page (15 per page)
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials?per_page=15&page=1",
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'data',
                    'meta' => [
                        'current_page',
                        'total',
                        'per_page',
                    ],
                ],
            ]);

        $this->assertEquals(15, count($response->json('data.data')));
        $this->assertEquals(500, $response->json('data.meta.total'));
        
        // Should complete in under 2 seconds
        $this->assertLessThan(2.0, $duration, 'Material listing should complete in under 2 seconds');
    }

    public function test_bulk_availability_check_for_100_products(): void
    {
        // Scenario: Calculate availability for 100 products simultaneously
        
        // Create 50 materials
        $materials = Material::factory()->count(50)->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 1000,
            'unit_cost' => 10.00,
        ]);

        // Create 100 products with recipes
        $productIds = [];
        
        for ($i = 0; $i < 100; $i++) {
            $product = Product::factory()->create([
                'tenant_id' => $this->tenant->id,
                'name' => "Product {$i}",
                'inventory_management_type' => 'bom',
            ]);

            $recipe = Recipe::factory()->create([
                'tenant_id' => $this->tenant->id,
                'product_id' => $product->id,
                'is_active' => true,
            ]);

            // Each recipe uses 3-5 random materials
            $recipeMaterials = $materials->random(rand(3, 5));
            
            foreach ($recipeMaterials as $material) {
                RecipeMaterial::factory()->create([
                    'tenant_id' => $this->tenant->id,
                    'recipe_id' => $recipe->id,
                    'material_id' => $material->id,
                    'quantity_required' => rand(10, 50),
                    'waste_percentage' => 0,
                    'unit' => $material->unit,
                ]);
            }

            $productIds[] = $product->id;
        }

        $startTime = microtime(true);

        // Calculate bulk availability
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/bulk-availability",
            ['product_ids' => $productIds],
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk();
        
        $this->assertCount(100, $response->json('data'));
        
        // Should complete in under 5 seconds
        $this->assertLessThan(5.0, $duration, 'Bulk availability for 100 products should complete in under 5 seconds');
    }

    public function test_analytics_with_large_transaction_history(): void
    {
        // Scenario: Generate analytics from 5000 transactions
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'High Volume Material',
            'stock_quantity' => 100000,
            'unit_cost' => 5.00,
            'unit' => 'kg',
        ]);

        // Create 5000 transactions over 90 days
        $startDate = Carbon::now()->subDays(90);
        $currentStock = 100000;
        
        for ($i = 0; $i < 5000; $i++) {
            $isRestock = ($i % 4 == 0); // 25% restock, 75% deduction
            $quantity = rand(10, 100);
            
            if ($isRestock) {
                InventoryTransaction::factory()->restock()->create([
                    'tenant_id' => $this->tenant->id,
                    'material_id' => $material->id,
                    'quantity_before' => $currentStock,
                    'quantity_change' => $quantity,
                    'quantity_after' => $currentStock + $quantity,
                    'reason' => 'purchase',
                    'created_at' => $startDate->copy()->addMinutes($i * 25),
                ]);
                $currentStock += $quantity;
            } else {
                InventoryTransaction::factory()->deduction()->create([
                    'tenant_id' => $this->tenant->id,
                    'material_id' => $material->id,
                    'quantity_before' => $currentStock,
                    'quantity_change' => -$quantity,
                    'quantity_after' => max(0, $currentStock - $quantity),
                    'reason' => ['production', 'waste'][rand(0, 1)],
                    'created_at' => $startDate->copy()->addMinutes($i * 25),
                ]);
                $currentStock = max(0, $currentStock - $quantity);
            }
        }

        $startTime = microtime(true);

        // Get usage trends (should aggregate 5000 records)
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/analytics/usage-trends?days=90",
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk()
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

        $this->assertEquals(5000, $response->json('data.total_transactions'));
        
        // Should complete in under 3 seconds
        $this->assertLessThan(3.0, $duration, 'Analytics on 5000 transactions should complete in under 3 seconds');
    }

    public function test_executive_dashboard_with_full_data_load(): void
    {
        // Scenario: Dashboard generation with 200 materials, 50 products, 1000 transactions
        
        // Create 200 materials
        $materials = Material::factory()->count(200)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        // Create 50 products with recipes
        for ($i = 0; $i < 50; $i++) {
            $product = Product::factory()->create([
                'tenant_id' => $this->tenant->id,
                'name' => "Dashboard Product {$i}",
                'inventory_management_type' => 'bom',
            ]);

            $recipe = Recipe::factory()->create([
                'tenant_id' => $this->tenant->id,
                'product_id' => $product->id,
                'is_active' => true,
            ]);

            // 3 materials per recipe
            $recipeMaterials = $materials->random(3);
            
            foreach ($recipeMaterials as $material) {
                RecipeMaterial::factory()->create([
                    'tenant_id' => $this->tenant->id,
                    'recipe_id' => $recipe->id,
                    'material_id' => $material->id,
                    'quantity_required' => rand(10, 100),
                    'waste_percentage' => rand(0, 10),
                    'unit' => $material->unit,
                ]);
            }
        }

        // Create 1000 recent transactions
        $recentMaterials = $materials->random(50);
        foreach ($recentMaterials as $material) {
            InventoryTransaction::factory()->count(20)->create([
                'tenant_id' => $this->tenant->id,
                'material_id' => $material->id,
            ]);
        }

        $startTime = microtime(true);

        // Generate executive dashboard
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/executive-dashboard",
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'key_metrics',
                    'stock_status',
                    'inventory_value_by_category',
                    'top_alerts',
                    'production_capacity',
                ],
            ]);

        $this->assertEquals(200, $response->json('data.key_metrics.total_materials'));
        $this->assertEquals(50, $response->json('data.key_metrics.total_products_with_bom'));
        
        // Should complete in under 4 seconds
        $this->assertLessThan(4.0, $duration, 'Executive dashboard should complete in under 4 seconds');
    }

    public function test_multi_product_batch_planning_performance(): void
    {
        // Scenario: Plan batch for 50 products sharing 30 materials
        
        // Create 30 shared materials
        $materials = Material::factory()->count(30)->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 10000,
        ]);

        // Create 50 products
        $productBatches = [];
        
        for ($i = 0; $i < 50; $i++) {
            $product = Product::factory()->create([
                'tenant_id' => $this->tenant->id,
                'name' => "Batch Product {$i}",
                'inventory_management_type' => 'bom',
            ]);

            $recipe = Recipe::factory()->create([
                'tenant_id' => $this->tenant->id,
                'product_id' => $product->id,
                'is_active' => true,
            ]);

            // Each product uses 5-10 materials
            $recipeMaterials = $materials->random(rand(5, 10));
            
            foreach ($recipeMaterials as $material) {
                RecipeMaterial::factory()->create([
                    'tenant_id' => $this->tenant->id,
                    'recipe_id' => $recipe->id,
                    'material_id' => $material->id,
                    'quantity_required' => rand(50, 200),
                    'waste_percentage' => rand(0, 5),
                    'unit' => $material->unit,
                ]);
            }

            $productBatches[] = [
                'product_id' => $product->id,
                'quantity' => rand(5, 20),
            ];
        }

        $startTime = microtime(true);

        // Calculate multi-product plan
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/multi-product-plan",
            ['products' => $productBatches],
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'is_feasible',
                    'total_products',
                    'material_requirements',
                ],
            ]);

        $this->assertEquals(50, $response->json('data.total_products'));
        
        // Should complete in under 5 seconds
        $this->assertLessThan(5.0, $duration, 'Multi-product planning for 50 products should complete in under 5 seconds');
    }

    public function test_recipe_costing_report_with_100_recipes(): void
    {
        // Scenario: Generate costing report for 100 recipes
        
        // Create 40 materials
        $materials = Material::factory()->count(40)->create([
            'tenant_id' => $this->tenant->id,
            'unit_cost' => rand(5, 50) / 10, // $0.50 to $5.00
        ]);

        // Create 100 products with recipes
        for ($i = 0; $i < 100; $i++) {
            $product = Product::factory()->create([
                'tenant_id' => $this->tenant->id,
                'name' => "Costing Product {$i}",
                'inventory_management_type' => 'bom',
            ]);

            $recipe = Recipe::factory()->create([
                'tenant_id' => $this->tenant->id,
                'product_id' => $product->id,
                'is_active' => true,
            ]);

            // 4-8 materials per recipe
            $recipeMaterials = $materials->random(rand(4, 8));
            
            foreach ($recipeMaterials as $material) {
                RecipeMaterial::factory()->create([
                    'tenant_id' => $this->tenant->id,
                    'recipe_id' => $recipe->id,
                    'material_id' => $material->id,
                    'quantity_required' => rand(10, 100),
                    'waste_percentage' => rand(0, 15),
                    'unit' => $material->unit,
                ]);
            }
        }

        $startTime = microtime(true);

        // Generate recipe costing report
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/reports/recipe-costing",
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'recipes',
                    'summary' => [
                        'total_recipes',
                        'total_active_recipes',
                    ],
                ],
            ]);

        $this->assertEquals(100, $response->json('data.summary.total_recipes'));
        
        // Should complete in under 6 seconds
        $this->assertLessThan(6.0, $duration, 'Recipe costing for 100 recipes should complete in under 6 seconds');
    }

    public function test_material_search_and_filter_performance(): void
    {
        // Scenario: Search within 1000 materials
        
        // Create 1000 materials with various attributes
        for ($i = 0; $i < 1000; $i++) {
            Material::factory()->create([
                'tenant_id' => $this->tenant->id,
                'name' => "Material " . str_pad($i, 4, '0', STR_PAD_LEFT),
                'sku' => "SKU-" . str_pad($i, 4, '0', STR_PAD_LEFT),
                'category' => ['Raw', 'Packaging', 'Ingredients', 'Supplies'][rand(0, 3)],
                'stock_quantity' => rand(0, 10000),
                'reorder_level' => 100,
            ]);
        }

        $startTime = microtime(true);

        // Search with filters
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/materials?search=Material&category=Raw&per_page=20",
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk();
        
        // Should complete in under 1 second
        $this->assertLessThan(1.0, $duration, 'Material search should complete in under 1 second');
    }

    public function test_low_stock_alert_detection_at_scale(): void
    {
        // Scenario: Detect low stock alerts across 500 materials
        
        // Create 500 materials with varying stock levels
        for ($i = 0; $i < 500; $i++) {
            $stockLevel = rand(1, 4); // Different stock scenarios
            
            switch ($stockLevel) {
                case 1: // Critical (10%)
                    $stock = 5;
                    $reorder = 50;
                    break;
                case 2: // Low (20%)
                    $stock = 30;
                    $reorder = 50;
                    break;
                case 3: // Normal (50%)
                    $stock = 200;
                    $reorder = 100;
                    break;
                case 4: // Excess (20%)
                    $stock = 5000;
                    $reorder = 100;
                    break;
            }

            Material::factory()->create([
                'tenant_id' => $this->tenant->id,
                'name' => "Alert Material {$i}",
                'stock_quantity' => $stock,
                'reorder_level' => $reorder,
            ]);
        }

        $startTime = microtime(true);

        // Get active alerts
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/alerts/active",
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'alerts',
                    'total_alerts',
                    'severity_summary',
                ],
            ]);

        // Should detect around 150 alerts (30% of 500)
        $totalAlerts = $response->json('data.total_alerts');
        $this->assertGreaterThan(100, $totalAlerts);
        
        // Should complete in under 2 seconds
        $this->assertLessThan(2.0, $duration, 'Alert detection across 500 materials should complete in under 2 seconds');
    }

    public function test_production_capacity_forecast_with_complex_recipes(): void
    {
        // Scenario: Calculate production capacity for product with 20 material components
        
        // Create 20 materials
        $materials = Material::factory()->count(20)->create([
            'tenant_id' => $this->tenant->id,
            'stock_quantity' => 1000,
        ]);

        $product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Complex Product',
            'inventory_management_type' => 'bom',
        ]);

        $recipe = Recipe::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product->id,
            'is_active' => true,
        ]);

        // Add all 20 materials to recipe
        foreach ($materials as $material) {
            RecipeMaterial::factory()->create([
                'tenant_id' => $this->tenant->id,
                'recipe_id' => $recipe->id,
                'material_id' => $material->id,
                'quantity_required' => rand(5, 50),
                'waste_percentage' => rand(0, 10),
                'unit' => $material->unit,
            ]);
        }

        $startTime = microtime(true);

        // Calculate production capacity
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/bom/products/{$product->id}/production-capacity",
            $this->authenticatedRequest()['headers']
        );

        $duration = microtime(true) - $startTime;

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'data' => [
                    'product_id',
                    'available_quantity',
                    'limiting_material',
                    'material_availability',
                ],
            ]);

        $this->assertCount(20, $response->json('data.material_availability'));
        
        // Should complete in under 1 second
        $this->assertLessThan(1.0, $duration, 'Capacity calculation for 20-component recipe should complete in under 1 second');
    }

    public function test_concurrent_stock_adjustments_integrity(): void
    {
        // Scenario: Multiple simultaneous stock adjustments maintain data integrity
        
        $material = Material::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Concurrent Test Material',
            'stock_quantity' => 1000,
            'unit' => 'pcs',
        ]);

        $initialStock = $material->stock_quantity;

        // Simulate 10 concurrent adjustments
        $adjustments = [
            ['type' => 'out', 'quantity' => 50],
            ['type' => 'in', 'quantity' => 100],
            ['type' => 'out', 'quantity' => 30],
            ['type' => 'in', 'quantity' => 75],
            ['type' => 'out', 'quantity' => 20],
            ['type' => 'in', 'quantity' => 60],
            ['type' => 'out', 'quantity' => 40],
            ['type' => 'in', 'quantity' => 85],
            ['type' => 'out', 'quantity' => 25],
            ['type' => 'in', 'quantity' => 45],
        ];

        $expectedNet = $initialStock;
        foreach ($adjustments as $adj) {
            $expectedNet += $adj['type'] === 'in' ? $adj['quantity'] : -$adj['quantity'];
        }

        // Execute adjustments sequentially (simulating concurrent in test)
        foreach ($adjustments as $adjustment) {
            $response = $this->postJson(
                "/api/v1/tenants/{$this->tenant->id}/materials/{$material->id}/adjust-stock",
                [
                    'quantity' => $adjustment['quantity'],
                    'type' => $adjustment['type'],
                    'reason' => 'test',
                ],
                $this->authenticatedRequest()['headers']
            );

            $response->assertOk();
        }

        // Verify final stock matches expected
        $material->refresh();
        $this->assertEquals($expectedNet, $material->stock_quantity, 'Stock integrity maintained after multiple adjustments');

        // Verify transaction count
        $transactionCount = InventoryTransaction::where('material_id', $material->id)->count();
        $this->assertEquals(10, $transactionCount);
    }
}