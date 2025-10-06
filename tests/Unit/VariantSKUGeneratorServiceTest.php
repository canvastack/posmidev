<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\VariantSKUGeneratorService;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;

/**
 * Unit tests for VariantSKUGeneratorService
 * 
 * Tests: SKU generation patterns, uniqueness, sanitization, validation
 */
class VariantSKUGeneratorServiceTest extends TestCase
{
    use RefreshDatabase;

    protected $service;
    protected $tenant;
    protected $product;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new VariantSKUGeneratorService();
        $this->tenant = Tenant::factory()->create();
        $this->product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'sku' => 'PROD-001',
            'has_variants' => true
        ]);
    }

    /** @test */
    public function it_generates_sku_from_attributes()
    {
        $sku = $this->service->generate(
            $this->tenant->id,
            'PROD-001',
            ['size' => 'Large', 'color' => 'Red'],
            'attributes'
        );

        $this->assertEquals('PROD-001-LARG-RED', $sku);
    }

    /** @test */
    public function it_generates_sequential_sku()
    {
        $sku = $this->service->generate(
            $this->tenant->id,
            'PROD-001',
            [],
            'sequential'
        );

        $this->assertEquals('PROD-001-VAR-001', $sku);
    }

    /** @test */
    public function it_generates_incremental_sku()
    {
        $sku = $this->service->generate(
            $this->tenant->id,
            'PROD-001',
            [],
            'incremental'
        );

        $this->assertEquals('PROD-001-A', $sku);
    }

    /** @test */
    public function it_sanitizes_sku_correctly()
    {
        $sku = $this->service->sanitize('prod-001-@#$%large-red');

        // Sanitize removes invalid chars but keeps valid dashes
        $this->assertEquals('PROD-001-LARGE-RED', $sku);
    }

    /** @test */
    public function it_ensures_sku_uniqueness()
    {
        // Create existing variant
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'PROD-001-L-RED'
        ]);

        // Generate new SKU with same base
        $sku = $this->service->generate(
            $this->tenant->id,
            'PROD-001',
            ['size' => 'L', 'color' => 'Red'],
            'attributes'
        );

        // Should append counter to make unique
        $this->assertStringContainsString('PROD-001', $sku);
        $this->assertNotEquals('PROD-001-L-RED', $sku);
    }

    /** @test */
    public function it_validates_sku_format()
    {
        $validSku = 'PROD-001-L-RED';
        $invalidSku = 'pr'; // Too short

        $this->assertTrue($this->service->validate($validSku));
        $this->assertFalse($this->service->validate($invalidSku));
    }

    /** @test */
    public function it_generates_bulk_skus()
    {
        $variants = [
            ['size' => 'S', 'color' => 'Red'],
            ['size' => 'M', 'color' => 'Blue'],
            ['size' => 'L', 'color' => 'Green']
        ];

        $skus = $this->service->generateBulk(
            $this->tenant->id,
            'PROD-001',
            $variants,
            'attributes'
        );

        $this->assertCount(3, $skus);
        $this->assertStringContainsString('PROD-001', $skus[0]);
        $this->assertStringContainsString('PROD-001', $skus[1]);
        $this->assertStringContainsString('PROD-001', $skus[2]);
    }
}