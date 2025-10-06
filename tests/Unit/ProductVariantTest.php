<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;

/**
 * Unit tests for ProductVariant model
 * 
 * Tests: Relationships, scopes, business methods, attributes
 */
class ProductVariantTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;
    protected $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create();
        $this->product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'has_variants' => true
        ]);
    }

    /** @test */
    public function it_has_correct_fillable_fields()
    {
        $fillable = (new ProductVariant())->getFillable();

        $expectedFields = [
            'tenant_id',
            'product_id',
            'sku',
            'barcode',
            'name',
            'attributes',
            'price',
            'cost_price', // Changed from 'cost' to 'cost_price'
            'price_modifier',
            'stock',
            'reserved_stock',
            'reorder_point',
            'reorder_quantity',
            'image_path',
            'thumbnail_path',
            'is_active',
            'is_default',
            'sort_order',
            'notes',
            'metadata'
        ];

        foreach ($expectedFields as $field) {
            $this->assertContains($field, $fillable, "Field {$field} should be fillable");
        }
    }

    /** @test */
    public function it_casts_attributes_correctly()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'attributes' => ['size' => 'L', 'color' => 'Red'],
            'metadata' => ['weight' => 1.5, 'dimensions' => ['length' => 10, 'width' => 5]],
            'is_active' => true,
            'stock' => 100,
            'reserved_stock' => 10
        ]);

        $this->assertIsArray($variant->attributes);
        $this->assertIsArray($variant->metadata);
        $this->assertIsBool($variant->is_active);
        $this->assertIsInt($variant->stock);
        $this->assertIsInt($variant->reserved_stock);
        // Laravel casts decimal:2 as string for precision
        $this->assertIsNumeric($variant->price);
        $this->assertIsNumeric($variant->cost_price);
    }

    /** @test */
    public function it_belongs_to_a_product()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id
        ]);

        $this->assertInstanceOf(Product::class, $variant->product);
        $this->assertEquals($this->product->id, $variant->product->id);
    }

    /** @test */
    public function it_filters_by_tenant_scope()
    {
        $tenant2 = Tenant::factory()->create();
        $product2 = Product::factory()->create([
            'tenant_id' => $tenant2->id,
            'has_variants' => true
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $tenant2->id,
            'product_id' => $product2->id
        ]);

        $variants = ProductVariant::forTenant($this->tenant->id)->get();

        $this->assertCount(1, $variants);
        $this->assertEquals($this->tenant->id, $variants->first()->tenant_id);
    }

    /** @test */
    public function it_filters_active_variants()
    {
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'is_active' => true
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'is_active' => false
        ]);

        $activeVariants = ProductVariant::forTenant($this->tenant->id)->active()->get();

        $this->assertCount(1, $activeVariants);
        $this->assertTrue($activeVariants->first()->is_active);
    }

    /** @test */
    public function it_calculates_available_stock_accessor()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 30
        ]);

        $this->assertEquals(70, $variant->available_stock);
    }

    /** @test */
    public function it_calculates_profit_margin_accessor()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'price' => 100,
            'cost_price' => 60
        ]);

        // Profit margin = ((price - cost_price) / price) * 100 = 40%
        $this->assertEquals(40.0, $variant->profit_margin);
    }

    /** @test */
    public function it_reserves_stock_correctly()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 10
        ]);

        $result = $variant->reserveStock(20);

        $this->assertTrue($result);
        $this->assertEquals(30, $variant->fresh()->reserved_stock);
    }

    /** @test */
    public function it_prevents_over_reservation_of_stock()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 90
        ]);

        // Only 10 available, trying to reserve 20
        $result = $variant->reserveStock(20);

        $this->assertFalse($result);
        $this->assertEquals(90, $variant->fresh()->reserved_stock);
    }

    /** @test */
    public function it_releases_stock_correctly()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 50
        ]);

        $result = $variant->releaseStock(20);

        $this->assertTrue($result);
        $this->assertEquals(30, $variant->fresh()->reserved_stock);
    }

}