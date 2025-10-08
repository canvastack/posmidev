<?php

namespace Src\Pms\Core\Services;

use Src\Pms\Infrastructure\Models\SkuSequence;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Category;
use Illuminate\Support\Str;

class SkuGenerationService
{
    /**
     * Generate SKU based on pattern
     * 
     * Supported patterns:
     * - {category}: Category code or first 3 letters of name
     * - {sequence}: Auto-incrementing number per tenant
     * - {date}: Current date in YYYYMMDD format
     * - {year}: Current year (YYYY)
     * - {month}: Current month (MM)
     * - {random}: 6 random alphanumeric characters
     * - {tenant}: First 3 letters of tenant name
     * 
     * Examples:
     * - "{category}-{sequence}" → "ELEC-001"
     * - "{date}-{random}" → "20250122-A3F9K2"
     * - "{tenant}-{category}-{sequence}" → "ACM-ELEC-001"
     * 
     * @param string $tenantId
     * @param string $pattern
     * @param string|null $categoryId
     * @return string
     */
    public function generate(string $tenantId, string $pattern, ?string $categoryId = null): string
    {
        $sku = $pattern;

        // Replace {category}
        if (str_contains($sku, '{category}') && $categoryId) {
            $category = Category::find($categoryId);
            $categoryCode = $category 
                ? ($category->code ?? Str::upper(Str::substr($category->name, 0, 3)))
                : 'GEN';
            $sku = str_replace('{category}', $categoryCode, $sku);
        } elseif (str_contains($sku, '{category}')) {
            $sku = str_replace('{category}', 'GEN', $sku);
        }

        // Replace {sequence}
        if (str_contains($sku, '{sequence}')) {
            $sequence = $this->getNextSequence($tenantId, $pattern);
            $sku = str_replace('{sequence}', str_pad($sequence, 4, '0', STR_PAD_LEFT), $sku);
        }

        // Replace {date}
        if (str_contains($sku, '{date}')) {
            $sku = str_replace('{date}', date('Ymd'), $sku);
        }

        // Replace {year}
        if (str_contains($sku, '{year}')) {
            $sku = str_replace('{year}', date('Y'), $sku);
        }

        // Replace {month}
        if (str_contains($sku, '{month}')) {
            $sku = str_replace('{month}', date('m'), $sku);
        }

        // Replace {random}
        if (str_contains($sku, '{random}')) {
            $random = Str::upper(Str::random(6));
            $sku = str_replace('{random}', $random, $sku);
        }

        // Replace {tenant} (first 3 letters of tenant name)
        if (str_contains($sku, '{tenant}')) {
            $tenant = \Src\Pms\Infrastructure\Models\Tenant::find($tenantId);
            $tenantCode = $tenant 
                ? Str::upper(Str::substr($tenant->name, 0, 3))
                : 'TNT';
            $sku = str_replace('{tenant}', $tenantCode, $sku);
        }

        // Ensure uniqueness
        $sku = $this->ensureUniqueness($tenantId, $sku);

        return $sku;
    }

    /**
     * Get the next sequence number for a given pattern
     * 
     * @param string $tenantId
     * @param string $pattern
     * @return int
     */
    protected function getNextSequence(string $tenantId, string $pattern): int
    {
        $sequence = SkuSequence::firstOrCreate(
            [
                'tenant_id' => $tenantId,
                'pattern' => $pattern,
            ],
            [
                'last_sequence' => 0,
            ]
        );

        return $sequence->getNextSequence();
    }

    /**
     * Ensure SKU is unique within tenant
     * If duplicate, append number suffix
     * 
     * @param string $tenantId
     * @param string $sku
     * @return string
     */
    protected function ensureUniqueness(string $tenantId, string $sku): string
    {
        $originalSku = $sku;
        $suffix = 1;

        while (Product::where('tenant_id', $tenantId)->where('sku', $sku)->exists()) {
            $sku = $originalSku . '-' . $suffix;
            $suffix++;
        }

        return $sku;
    }

    /**
     * Validate if a SKU is available for use
     * 
     * @param string $tenantId
     * @param string $sku
     * @param string|null $excludeProductId
     * @return bool
     */
    public function isSkuAvailable(string $tenantId, string $sku, ?string $excludeProductId = null): bool
    {
        $query = Product::where('tenant_id', $tenantId)->where('sku', $sku);

        if ($excludeProductId) {
            $query->where('id', '!=', $excludeProductId);
        }

        return !$query->exists();
    }

    /**
     * Get list of predefined SKU patterns
     * 
     * @return array
     */
    public function getPredefinedPatterns(): array
    {
        return [
            [
                'id' => 'category-sequence',
                'pattern' => '{category}-{sequence}',
                'name' => 'Category + Sequence',
                'example' => 'ELEC-0001',
                'description' => 'Category code followed by auto-incrementing number',
            ],
            [
                'id' => 'date-sequence',
                'pattern' => '{date}-{sequence}',
                'name' => 'Date + Sequence',
                'example' => '20250122-0001',
                'description' => 'Current date (YYYYMMDD) followed by sequence',
            ],
            [
                'id' => 'tenant-category-sequence',
                'pattern' => '{tenant}-{category}-{sequence}',
                'name' => 'Tenant + Category + Sequence',
                'example' => 'ACM-ELEC-0001',
                'description' => 'Tenant code, category code, and sequence',
            ],
            [
                'id' => 'date-random',
                'pattern' => '{date}-{random}',
                'name' => 'Date + Random',
                'example' => '20250122-A3F9K2',
                'description' => 'Current date with random 6-character code',
            ],
            [
                'id' => 'year-month-sequence',
                'pattern' => '{year}{month}-{sequence}',
                'name' => 'Year-Month + Sequence',
                'example' => '202501-0001',
                'description' => 'Year and month followed by sequence',
            ],
            [
                'id' => 'category-year-sequence',
                'pattern' => '{category}-{year}-{sequence}',
                'name' => 'Category + Year + Sequence',
                'example' => 'ELEC-2025-0001',
                'description' => 'Category code, year, and sequence',
            ],
        ];
    }

    /**
     * Preview generated SKU without saving
     * 
     * @param string $tenantId
     * @param string $pattern
     * @param string|null $categoryId
     * @return string
     */
    public function preview(string $tenantId, string $pattern, ?string $categoryId = null): string
    {
        // Create a temporary preview without incrementing actual sequences
        $sku = $pattern;

        // Replace placeholders with sample values
        if (str_contains($sku, '{category}') && $categoryId) {
            $category = Category::find($categoryId);
            $categoryCode = $category 
                ? ($category->code ?? Str::upper(Str::substr($category->name, 0, 3)))
                : 'GEN';
            $sku = str_replace('{category}', $categoryCode, $sku);
        } elseif (str_contains($sku, '{category}')) {
            $sku = str_replace('{category}', 'GEN', $sku);
        }

        // Get current sequence without incrementing
        if (str_contains($sku, '{sequence}')) {
            $sequence = SkuSequence::where('tenant_id', $tenantId)
                ->where('pattern', $pattern)
                ->value('last_sequence') ?? 0;
            $nextSequence = $sequence + 1;
            $sku = str_replace('{sequence}', str_pad($nextSequence, 4, '0', STR_PAD_LEFT), $sku);
        }

        if (str_contains($sku, '{date}')) {
            $sku = str_replace('{date}', date('Ymd'), $sku);
        }

        if (str_contains($sku, '{year}')) {
            $sku = str_replace('{year}', date('Y'), $sku);
        }

        if (str_contains($sku, '{month}')) {
            $sku = str_replace('{month}', date('m'), $sku);
        }

        if (str_contains($sku, '{random}')) {
            $sku = str_replace('{random}', 'XXXXXX', $sku);
        }

        if (str_contains($sku, '{tenant}')) {
            $tenant = \Src\Pms\Infrastructure\Models\Tenant::find($tenantId);
            $tenantCode = $tenant 
                ? Str::upper(Str::substr($tenant->name, 0, 3))
                : 'TNT';
            $sku = str_replace('{tenant}', $tenantCode, $sku);
        }

        return $sku;
    }
}