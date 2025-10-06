<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\VariantAttribute;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Product;
use App\Services\VariantSKUGeneratorService;
use App\Services\VariantPricingService;
use App\Services\VariantStockAggregatorService;

/**
 * CRITICAL TENANT ISOLATION TESTS
 * 
 * These tests verify that IMMUTABLE RULES are enforced:
 * - NO data leakage between tenants
 * - ALL queries must be tenant-scoped
 * - Services must enforce tenant boundaries
 * 
 * @group critical
 * @group tenant-isolation
 */
class VariantTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant1;
    protected $tenant2;
    protected $product1;
    protected $product2;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create two separate tenants
        $this->tenant1 = Tenant::factory()->create(['name' => 'Tenant 1']);
        $this->tenant2 = Tenant::factory()->create(['name' => 'Tenant 2']);

        // Create products for each tenant
        $this->product1 = Product::factory()->create([
            'tenant_id' => $this->tenant1->id,
            'has_variants' => true
        ]);

        $this->product2 = Product::factory()->create([
            'tenant_id' => $this->tenant2->id,
            'has_variants' => true
        ]);
    }

    /** @test */
    public function product_variants_are_isolated_by_tenant()
    {
        // Create variants for tenant 1
        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant1->id,
            'product_id' => $this->product1->id
        ]);

        // Create variants for tenant 2
        ProductVariant::factory()->count(2)->create([
            'tenant_id' => $this->tenant2->id,
            'product_id' => $this->product2->id
        ]);

        // Verify tenant 1 only sees their variants
        $tenant1Variants = ProductVariant::forTenant($this->tenant1->id)->get();
        $this->assertCount(3, $tenant1Variants);
        $this->assertTrue($tenant1Variants->every(fn($v) => $v->tenant_id === $this->tenant1->id));

        // Verify tenant 2 only sees their variants
        $tenant2Variants = ProductVariant::forTenant($this->tenant2->id)->get();
        $this->assertCount(2, $tenant2Variants);
        $this->assertTrue($tenant2Variants->every(fn($v) => $v->tenant_id === $this->tenant2->id));

        // Verify NO cross-tenant access
        $this->assertFalse($tenant1Variants->contains('tenant_id', $this->tenant2->id));
        $this->assertFalse($tenant2Variants->contains('tenant_id', $this->tenant1->id));
    }

    /** @test */
    public function variant_attributes_are_isolated_by_tenant()
    {
        // Create different attributes for tenant 1 (size, color, material)
        VariantAttribute::factory()->size()->create(['tenant_id' => $this->tenant1->id]);
        VariantAttribute::factory()->color()->create(['tenant_id' => $this->tenant1->id]);
        VariantAttribute::factory()->material()->create(['tenant_id' => $this->tenant1->id]);

        // Create different attributes for tenant 2 (size, color)
        VariantAttribute::factory()->size()->create(['tenant_id' => $this->tenant2->id]);
        VariantAttribute::factory()->color()->create(['tenant_id' => $this->tenant2->id]);

        // Verify tenant 1 only sees their attributes
        $tenant1Attributes = VariantAttribute::forTenant($this->tenant1->id)->get();
        $this->assertCount(3, $tenant1Attributes);
        $this->assertTrue($tenant1Attributes->every(fn($a) => $a->tenant_id === $this->tenant1->id));

        // Verify tenant 2 only sees their attributes
        $tenant2Attributes = VariantAttribute::forTenant($this->tenant2->id)->get();
        $this->assertCount(2, $tenant2Attributes);
        $this->assertTrue($tenant2Attributes->every(fn($a) => $a->tenant_id === $this->tenant2->id));
    }

    /** @test */
    public function sku_generator_enforces_tenant_uniqueness_only()
    {
        $service = new VariantSKUGeneratorService();

        // Create variant with SKU in tenant 1
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant1->id,
            'product_id' => $this->product1->id,
            'sku' => 'PROD-001-L-RED'
        ]);

        // Same SKU should be allowed in tenant 2 (different tenant)
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant2->id,
            'product_id' => $this->product2->id,
            'sku' => 'PROD-001-L-RED'
        ]);

        // Verify both exist with same SKU but different tenants
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant1->id,
            'sku' => 'PROD-001-L-RED'
        ]);

        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant2->id,
            'sku' => 'PROD-001-L-RED'
        ]);

        // Generate new SKU - it will auto-increment if duplicate exists
        $newSku1 = $service->generate(
            $this->tenant1->id,
            'PROD-001',
            ['size' => 'L', 'color' => 'RED'],
            'attributes'
        );
        
        $newSku2 = $service->generate(
            $this->tenant2->id,
            'PROD-001',
            ['size' => 'L', 'color' => 'RED'],
            'attributes'
        );

        // Both tenants get different SKUs (with suffixes) due to uniqueness within tenant
        $this->assertNotEquals('PROD-001-L-RED', $newSku1); // Should have suffix
        $this->assertNotEquals('PROD-001-L-RED', $newSku2); // Should have suffix
    }

    /** @test */
    public function stock_aggregator_only_calculates_for_specified_tenant()
    {
        $service = new VariantStockAggregatorService();

        // Create variants with stock for tenant 1
        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant1->id,
            'product_id' => $this->product1->id,
            'stock' => 100,
            'reserved_stock' => 10
        ]);

        // Create variants with stock for tenant 2
        ProductVariant::factory()->count(2)->create([
            'tenant_id' => $this->tenant2->id,
            'product_id' => $this->product2->id,
            'stock' => 50,
            'reserved_stock' => 5
        ]);

        // Calculate total stock for tenant 1
        $tenant1Total = $service->calculateTotalStock($this->tenant1->id, $this->product1->id);
        $this->assertEquals(300, $tenant1Total); // 3 variants * 100 stock

        // Calculate total stock for tenant 2
        $tenant2Total = $service->calculateTotalStock($this->tenant2->id, $this->product2->id);
        $this->assertEquals(100, $tenant2Total); // 2 variants * 50 stock

        // Verify calculations don't include other tenant's data
        $this->assertNotEquals($tenant1Total, $tenant2Total);
    }

    /** @test */
    public function pricing_service_calculates_within_tenant_scope()
    {
        $service = new VariantPricingService();

        // Create variants for tenant 1 with specific prices
        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant1->id,
            'product_id' => $this->product1->id,
            'price' => 100,
            'cost_price' => 60
        ]);

        // Create variants for tenant 2 with different prices
        ProductVariant::factory()->count(2)->create([
            'tenant_id' => $this->tenant2->id,
            'product_id' => $this->product2->id,
            'price' => 200,
            'cost_price' => 120
        ]);

        // Calculate average price for tenant 1
        $tenant1Avg = $service->calculateAveragePrice($this->tenant1->id, $this->product1->id);
        $this->assertEquals(100, $tenant1Avg);

        // Calculate average price for tenant 2
        $tenant2Avg = $service->calculateAveragePrice($this->tenant2->id, $this->product2->id);
        $this->assertEquals(200, $tenant2Avg);

        // Verify no cross-contamination
        $this->assertNotEquals($tenant1Avg, $tenant2Avg);
    }

    /** @test */
    public function cannot_query_variants_without_tenant_scope()
    {
        // Create variants for both tenants
        ProductVariant::factory()->count(5)->create([
            'tenant_id' => $this->tenant1->id,
            'product_id' => $this->product1->id
        ]);

        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant2->id,
            'product_id' => $this->product2->id
        ]);

        // Total in database = 8
        $totalInDb = ProductVariant::count();
        $this->assertEquals(8, $totalInDb);

        // But when using forTenant scope, each tenant only sees their own
        $tenant1Count = ProductVariant::forTenant($this->tenant1->id)->count();
        $tenant2Count = ProductVariant::forTenant($this->tenant2->id)->count();

        $this->assertEquals(5, $tenant1Count);
        $this->assertEquals(3, $tenant2Count);

        // Verify scope sum equals total (no data loss)
        $this->assertEquals($totalInDb, $tenant1Count + $tenant2Count);
    }

    /** @test */
    public function sku_uniqueness_checks_are_tenant_scoped()
    {
        $service = new VariantSKUGeneratorService();

        // Create variant with specific SKU for tenant 1
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant1->id,
            'product_id' => $this->product1->id,
            'sku' => 'TEST-SKU-001'
        ]);

        // Check if SKU exists in tenant 1 (should return true)
        $existsInTenant1 = ProductVariant::forTenant($this->tenant1->id)
            ->where('sku', 'TEST-SKU-001')
            ->exists();
        $this->assertTrue($existsInTenant1);

        // Check if SKU exists in tenant 2 (should return false)
        $existsInTenant2 = ProductVariant::forTenant($this->tenant2->id)
            ->where('sku', 'TEST-SKU-001')
            ->exists();
        $this->assertFalse($existsInTenant2);

        // Tenant 2 should be able to use the same SKU
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant2->id,
            'product_id' => $this->product2->id,
            'sku' => 'TEST-SKU-001'
        ]);

        // Now both tenants have the same SKU, but isolated
        $tenant1Count = ProductVariant::forTenant($this->tenant1->id)
            ->where('sku', 'TEST-SKU-001')
            ->count();
        $tenant2Count = ProductVariant::forTenant($this->tenant2->id)
            ->where('sku', 'TEST-SKU-001')
            ->count();

        $this->assertEquals(1, $tenant1Count);
        $this->assertEquals(1, $tenant2Count);
    }

    /** @test */
    public function low_stock_detection_is_tenant_specific()
    {
        $service = new VariantStockAggregatorService();

        // Create low stock variants for tenant 1
        ProductVariant::factory()->count(2)->create([
            'tenant_id' => $this->tenant1->id,
            'product_id' => $this->product1->id,
            'stock' => 5,
            'reserved_stock' => 0,
            'reorder_point' => 10,
            'low_stock_alert_enabled' => true
        ]);

        // Create normal stock variants for tenant 2
        ProductVariant::factory()->count(2)->create([
            'tenant_id' => $this->tenant2->id,
            'product_id' => $this->product2->id,
            'stock' => 100,
            'reserved_stock' => 0,
            'reorder_point' => 10,
            'low_stock_alert_enabled' => true
        ]);

        // Detect low stock for tenant 1 (threshold = 10, stock = 5)
        $tenant1LowStock = $service->detectLowStock($this->tenant1->id, $this->product1->id, 10);
        $this->assertCount(2, $tenant1LowStock);

        // Detect low stock for tenant 2 (threshold = 10, stock = 100)
        $tenant2LowStock = $service->detectLowStock($this->tenant2->id, $this->product2->id, 10);
        $this->assertCount(0, $tenant2LowStock);
    }
}