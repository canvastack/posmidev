<?php

namespace Tests\Unit;

use Tests\TestCase;
use App\Services\VariantPricingService;

/**
 * Unit tests for VariantPricingService
 * 
 * Tests: Price calculations, modifiers, profit margins, markup
 */
class VariantPricingServiceTest extends TestCase
{
    protected $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new VariantPricingService();
    }

    /** @test */
    public function it_calculates_price_with_fixed_modifier()
    {
        $price = $this->service->calculatePrice(100, [
            ['type' => 'fixed', 'value' => 10]
        ]);

        $this->assertEquals(110, $price);
    }

    /** @test */
    public function it_calculates_price_with_percentage_modifier()
    {
        $price = $this->service->calculatePrice(100, [
            ['type' => 'percentage', 'value' => 15]
        ]);

        $this->assertEquals(115, $price);
    }

    /** @test */
    public function it_calculates_price_from_attributes()
    {
        $rules = [
            'size' => ['L' => 5, 'XL' => 10],
            'color' => ['Red' => 2, 'Blue' => 0]
        ];

        $price = $this->service->calculatePriceFromAttributes(
            100,
            ['size' => 'L', 'color' => 'Red'],
            $rules
        );

        $this->assertEquals(107, $price); // 100 + 5 + 2
    }

    /** @test */
    public function it_calculates_profit_margin()
    {
        $margin = $this->service->calculateProfitMargin(100, 60);

        $this->assertEquals(40.0, $margin); // (100-60)/100 * 100 = 40%
    }

    /** @test */
    public function it_calculates_markup()
    {
        $markup = $this->service->calculateMarkup(100, 60);

        $this->assertEquals(66.67, $markup); // (100-60)/60 * 100 = 66.67%
    }

    /** @test */
    public function it_calculates_price_from_desired_margin()
    {
        $price = $this->service->calculatePriceFromMargin(60, 40);

        $this->assertEquals(100, $price); // cost / (1 - margin/100)
    }

    /** @test */
    public function it_validates_pricing()
    {
        $result = $this->service->validatePricing(100, 60);

        $this->assertTrue($result['valid']);
        $this->assertEmpty($result['errors']);
    }

    /** @test */
    public function it_detects_negative_margin()
    {
        $result = $this->service->validatePricing(80, 100);

        $this->assertFalse($result['valid']);
        $this->assertContains('Price is less than cost (negative margin)', $result['errors']);
    }
}