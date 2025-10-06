<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\VariantStockAggregatorService;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;

/**
 * Unit tests for VariantStockAggregatorService
 * 
 * Tests: Stock calculations, aggregations, low stock detection
 */
class VariantStockAggregatorServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $service;
    protected $tenant;
    protected $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new VariantStockAggregatorService();
        $this->tenant = Tenant::factory()->create();
        $this->product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'has_variants' => true
        ]);
    }

    /** @test */
    public function it_calculates_total_stock()
    {
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 50
        ]);

        $total = $this->service->calculateTotalStock($this->tenant->id, $this->product->id);

        $this->assertEquals(150, $total);
    }

    /** @test */
    public function it_calculates_available_stock()
    {
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 30
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 50,
            'reserved_stock' => 10
        ]);

        $available = $this->service->calculateAvailableStock($this->tenant->id, $this->product->id);

        $this->assertEquals(110, $available); // (100-30) + (50-10)
    }

    /** @test */
    public function it_detects_low_stock_variants()
    {
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 5,
            'reserved_stock' => 0,
            'is_active' => true
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 0,
            'is_active' => true
        ]);

        $lowStock = $this->service->detectLowStock($this->tenant->id, $this->product->id, 10);

        $this->assertCount(1, $lowStock);
    }

    /** @test */
    public function it_detects_out_of_stock_variants()
    {
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 0,
            'reserved_stock' => 0,
            'is_active' => true
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 0,
            'is_active' => true
        ]);

        $outOfStock = $this->service->detectOutOfStock($this->tenant->id, $this->product->id);

        $this->assertCount(1, $outOfStock);
    }

    /** @test */
    public function it_calculates_stock_statistics()
    {
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 30,
            'cost_price' => 50
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 50,
            'reserved_stock' => 10,
            'cost_price' => 40
        ]);

        $stats = $this->service->calculateStockStatistics($this->tenant->id, $this->product->id);

        $this->assertEquals(2, $stats['total_variants']);
        $this->assertEquals(150, $stats['total_stock']);
        $this->assertEquals(110, $stats['available_stock']);
        $this->assertEquals(40, $stats['reserved_stock']);
        $this->assertEquals(75, $stats['average_stock']);
    }
}