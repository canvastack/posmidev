<?php

namespace App\Services;

use Src\Pms\Infrastructure\Models\ProductVariant;
use Illuminate\Support\Str;

/**
 * Service for generating unique SKUs for product variants
 * 
 * Supports multiple pattern strategies:
 * - Base + Attributes: PROD-001-L-RED
 * - Sequential: PROD-001-VAR-001
 * - Incremental: PROD-001-A, PROD-001-B
 * 
 * @package App\Services
 */
class VariantSKUGeneratorService
{
    /**
     * Generate SKU from pattern and attributes
     *
     * @param string $tenantId
     * @param string $baseSku Base product SKU
     * @param array $attributes Variant attributes (e.g., ['size' => 'L', 'color' => 'Red'])
     * @param string $pattern Pattern type: 'attributes', 'sequential', 'incremental'
     * @return string Generated SKU
     */
    public function generate(
        string $tenantId,
        string $baseSku,
        array $attributes = [],
        string $pattern = 'attributes'
    ): string {
        $sku = match ($pattern) {
            'attributes' => $this->generateFromAttributes($baseSku, $attributes),
            'sequential' => $this->generateSequential($tenantId, $baseSku),
            'incremental' => $this->generateIncremental($tenantId, $baseSku),
            default => $this->generateFromAttributes($baseSku, $attributes)
        };

        // Sanitize and ensure uniqueness
        $sku = $this->sanitize($sku);
        $sku = $this->ensureUnique($tenantId, $sku);

        return $sku;
    }

    /**
     * Generate SKU from attributes (e.g., PROD-001-L-RED)
     *
     * @param string $baseSku
     * @param array $attributes
     * @return string
     */
    protected function generateFromAttributes(string $baseSku, array $attributes): string
    {
        $parts = [$baseSku];

        foreach ($attributes as $key => $value) {
            // Take first 4 chars of value, uppercase
            $parts[] = strtoupper(substr($value, 0, 4));
        }

        return implode('-', $parts);
    }

    /**
     * Generate sequential SKU (e.g., PROD-001-VAR-001)
     *
     * @param string $tenantId
     * @param string $baseSku
     * @return string
     */
    protected function generateSequential(string $tenantId, string $baseSku): string
    {
        $count = ProductVariant::forTenant($tenantId)
            ->where('sku', 'like', $baseSku . '-VAR-%')
            ->count();

        $sequence = str_pad($count + 1, 3, '0', STR_PAD_LEFT);

        return "{$baseSku}-VAR-{$sequence}";
    }

    /**
     * Generate incremental SKU (e.g., PROD-001-A, PROD-001-B)
     *
     * @param string $tenantId
     * @param string $baseSku
     * @return string
     */
    protected function generateIncremental(string $tenantId, string $baseSku): string
    {
        $count = ProductVariant::forTenant($tenantId)
            ->where('sku', 'like', $baseSku . '-%')
            ->count();

        $letter = chr(65 + ($count % 26)); // A-Z
        $cycle = floor($count / 26);

        return $cycle > 0 
            ? "{$baseSku}-{$letter}{$cycle}"
            : "{$baseSku}-{$letter}";
    }

    /**
     * Sanitize SKU (remove invalid characters, uppercase)
     *
     * @param string $sku
     * @return string
     */
    public function sanitize(string $sku): string
    {
        // Remove invalid characters
        $sku = preg_replace('/[^A-Z0-9\-_]/', '', strtoupper($sku));
        
        // Limit length to 50 chars
        $sku = substr($sku, 0, 50);

        return $sku;
    }

    /**
     * Ensure SKU is unique within tenant
     *
     * @param string $tenantId
     * @param string $sku
     * @return string
     */
    public function ensureUnique(string $tenantId, string $sku): string
    {
        $originalSku = $sku;
        $counter = 1;

        while ($this->skuExists($tenantId, $sku)) {
            $sku = "{$originalSku}-" . str_pad($counter, 2, '0', STR_PAD_LEFT);
            $counter++;

            // Prevent infinite loop
            if ($counter > 999) {
                $sku = "{$originalSku}-" . Str::random(4);
                break;
            }
        }

        return $sku;
    }

    /**
     * Check if SKU exists in tenant
     *
     * @param string $tenantId
     * @param string $sku
     * @return bool
     */
    protected function skuExists(string $tenantId, string $sku): bool
    {
        return ProductVariant::forTenant($tenantId)
            ->where('sku', $sku)
            ->exists();
    }

    /**
     * Validate SKU format
     *
     * @param string $sku
     * @return bool
     */
    public function validate(string $sku): bool
    {
        // Must be 3-50 chars, alphanumeric with dashes/underscores
        return preg_match('/^[A-Z0-9\-_]{3,50}$/', $sku) === 1;
    }

    /**
     * Generate bulk SKUs for multiple variants
     *
     * @param string $tenantId
     * @param string $baseSku
     * @param array $variantAttributes Array of attribute sets
     * @param string $pattern
     * @return array
     */
    public function generateBulk(
        string $tenantId,
        string $baseSku,
        array $variantAttributes,
        string $pattern = 'attributes'
    ): array {
        $skus = [];

        foreach ($variantAttributes as $attributes) {
            $skus[] = $this->generate($tenantId, $baseSku, $attributes, $pattern);
        }

        return $skus;
    }
}