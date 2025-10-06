<?php

namespace App\Services;

use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Product;

/**
 * Service for calculating variant pricing with modifiers
 * 
 * Supports:
 * - Fixed price modifiers (+$10)
 * - Percentage modifiers (+15%)
 * - Attribute-based pricing rules
 * - Profit margin calculations
 * 
 * @package App\Services
 */
class VariantPricingService
{
    /**
     * Calculate variant price based on base price and modifiers
     *
     * @param float $basePrice
     * @param array $modifiers ['type' => 'fixed|percentage', 'value' => 10]
     * @return float
     */
    public function calculatePrice(float $basePrice, array $modifiers = []): float
    {
        $price = $basePrice;

        foreach ($modifiers as $modifier) {
            $type = $modifier['type'] ?? 'fixed';
            $value = $modifier['value'] ?? 0;

            $price = match ($type) {
                'fixed' => $price + $value,
                'percentage' => $price * (1 + ($value / 100)),
                default => $price
            };
        }

        // Ensure minimum price of 0
        return max(0, round($price, 2));
    }

    /**
     * Calculate price based on attribute rules
     *
     * Example rules:
     * [
     *   'size' => ['L' => 5, 'XL' => 10, 'XXL' => 15],
     *   'color' => ['Red' => 2, 'Blue' => 0]
     * ]
     *
     * @param float $basePrice
     * @param array $attributes Variant attributes
     * @param array $rules Pricing rules
     * @return float
     */
    public function calculatePriceFromAttributes(
        float $basePrice,
        array $attributes,
        array $rules = []
    ): float {
        $price = $basePrice;

        foreach ($attributes as $key => $value) {
            if (isset($rules[$key][$value])) {
                $price += $rules[$key][$value];
            }
        }

        return max(0, round($price, 2));
    }

    /**
     * Calculate profit margin
     *
     * @param float $price
     * @param float $cost
     * @return float Percentage (0-100)
     */
    public function calculateProfitMargin(float $price, float $cost): float
    {
        if ($price <= 0) {
            return 0;
        }

        $margin = (($price - $cost) / $price) * 100;

        return round($margin, 2);
    }

    /**
     * Calculate markup percentage
     *
     * @param float $price
     * @param float $cost
     * @return float Percentage (0+)
     */
    public function calculateMarkup(float $price, float $cost): float
    {
        if ($cost <= 0) {
            return 0;
        }

        $markup = (($price - $cost) / $cost) * 100;

        return round($markup, 2);
    }

    /**
     * Calculate price based on desired profit margin
     *
     * @param float $cost
     * @param float $desiredMargin Percentage (0-100)
     * @return float
     */
    public function calculatePriceFromMargin(float $cost, float $desiredMargin): float
    {
        if ($desiredMargin >= 100) {
            throw new \InvalidArgumentException('Margin cannot be 100% or more');
        }

        $price = $cost / (1 - ($desiredMargin / 100));

        return round($price, 2);
    }

    /**
     * Calculate bulk pricing for variant creation
     *
     * @param float $basePrice
     * @param float $baseCost
     * @param array $variants Array of variant data with attributes
     * @param array $pricingRules
     * @return array Array of prices and margins
     */
    public function calculateBulkPricing(
        float $basePrice,
        float $baseCost,
        array $variants,
        array $pricingRules = []
    ): array {
        $results = [];

        foreach ($variants as $variant) {
            $attributes = $variant['attributes'] ?? [];
            
            // Calculate variant-specific price
            $price = $this->calculatePriceFromAttributes(
                $basePrice,
                $attributes,
                $pricingRules
            );

            // Calculate cost (could also have cost rules)
            $cost = $baseCost;

            // Calculate margins
            $margin = $this->calculateProfitMargin($price, $cost);

            $results[] = [
                'price' => $price,
                'cost' => $cost,
                'profit_margin' => $margin,
                'markup' => $this->calculateMarkup($price, $cost)
            ];
        }

        return $results;
    }

    /**
     * Apply price modifiers from template pricing rules
     *
     * @param float $basePrice
     * @param array $pricingRules Template pricing rules
     * @param array $attributes Variant attributes
     * @return float
     */
    public function applyTemplatePricing(
        float $basePrice,
        array $pricingRules,
        array $attributes
    ): float {
        // Extract pricing type and rules
        $type = $pricingRules['type'] ?? 'fixed';
        $rules = $pricingRules['rules'] ?? [];

        if ($type === 'attribute_based') {
            return $this->calculatePriceFromAttributes($basePrice, $attributes, $rules);
        }

        if ($type === 'percentage') {
            $percentage = $pricingRules['percentage'] ?? 0;
            return $this->calculatePrice($basePrice, [
                ['type' => 'percentage', 'value' => $percentage]
            ]);
        }

        if ($type === 'fixed') {
            $amount = $pricingRules['amount'] ?? 0;
            return $this->calculatePrice($basePrice, [
                ['type' => 'fixed', 'value' => $amount]
            ]);
        }

        return $basePrice;
    }

    /**
     * Calculate average price across variants
     *
     * @param string $tenantId
     * @param string $productId
     * @return float
     */
    public function calculateAveragePrice(string $tenantId, string $productId): float
    {
        $average = ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->avg('price');

        return round($average ?? 0, 2);
    }

    /**
     * Calculate price range (min/max) across variants
     *
     * @param string $tenantId
     * @param string $productId
     * @return array ['min' => float, 'max' => float]
     */
    public function calculatePriceRange(string $tenantId, string $productId): array
    {
        $variants = ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->selectRaw('MIN(price) as min_price, MAX(price) as max_price')
            ->first();

        return [
            'min' => round($variants->min_price ?? 0, 2),
            'max' => round($variants->max_price ?? 0, 2)
        ];
    }

    /**
     * Validate pricing data
     *
     * @param float $price
     * @param float $cost
     * @return array ['valid' => bool, 'errors' => array]
     */
    public function validatePricing(float $price, float $cost): array
    {
        $errors = [];

        if ($price < 0) {
            $errors[] = 'Price cannot be negative';
        }

        if ($cost < 0) {
            $errors[] = 'Cost cannot be negative';
        }

        if ($price < $cost) {
            $errors[] = 'Price is less than cost (negative margin)';
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors
        ];
    }
}