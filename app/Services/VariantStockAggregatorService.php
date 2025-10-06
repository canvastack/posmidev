<?php

namespace App\Services;

use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Product;
use Illuminate\Support\Facades\DB;

/**
 * Service for aggregating stock data across product variants
 * 
 * Features:
 * - Calculate total stock across all variants
 * - Detect low stock variants
 * - Calculate stock distribution
 * - Stock heatmap generation
 * 
 * @package App\Services
 */
class VariantStockAggregatorService
{
    /**
     * Calculate total stock for a product (sum of all variant stocks)
     *
     * @param string $tenantId
     * @param string $productId
     * @return int
     */
    public function calculateTotalStock(string $tenantId, string $productId): int
    {
        return ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->sum('stock') ?? 0;
    }

    /**
     * Calculate total available stock (stock - reserved_stock)
     *
     * @param string $tenantId
     * @param string $productId
     * @return int
     */
    public function calculateAvailableStock(string $tenantId, string $productId): int
    {
        return ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->sum(DB::raw('stock - reserved_stock')) ?? 0;
    }

    /**
     * Calculate total reserved stock
     *
     * @param string $tenantId
     * @param string $productId
     * @return int
     */
    public function calculateReservedStock(string $tenantId, string $productId): int
    {
        return ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->sum('reserved_stock') ?? 0;
    }

    /**
     * Detect low stock variants
     *
     * @param string $tenantId
     * @param string|null $productId Optional: Filter by product
     * @param int $threshold Optional: Custom threshold (default: 10)
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function detectLowStock(
        string $tenantId,
        ?string $productId = null,
        int $threshold = 10
    ) {
        $query = ProductVariant::forTenant($tenantId)
            ->with('product')
            ->where('is_active', true)
            ->whereRaw('(stock - reserved_stock) <= ?', [$threshold])
            ->whereRaw('(stock - reserved_stock) > 0');

        if ($productId) {
            $query->where('product_id', $productId);
        }

        return $query->get();
    }

    /**
     * Detect out of stock variants
     *
     * @param string $tenantId
     * @param string|null $productId
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function detectOutOfStock(string $tenantId, ?string $productId = null)
    {
        $query = ProductVariant::forTenant($tenantId)
            ->with('product')
            ->where('is_active', true)
            ->whereRaw('(stock - reserved_stock) <= 0');

        if ($productId) {
            $query->where('product_id', $productId);
        }

        return $query->get();
    }

    /**
     * Calculate stock distribution by attribute
     *
     * Example: Stock by size (S: 100, M: 150, L: 200)
     *
     * @param string $tenantId
     * @param string $productId
     * @param string $attribute Attribute key (e.g., 'size', 'color')
     * @return array
     */
    public function calculateStockByAttribute(
        string $tenantId,
        string $productId,
        string $attribute
    ): array {
        $variants = ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->get();

        $distribution = [];

        foreach ($variants as $variant) {
            $value = $variant->attributes[$attribute] ?? 'Unknown';
            
            if (!isset($distribution[$value])) {
                $distribution[$value] = [
                    'total_stock' => 0,
                    'available_stock' => 0,
                    'reserved_stock' => 0,
                    'variant_count' => 0
                ];
            }

            $distribution[$value]['total_stock'] += $variant->stock;
            $distribution[$value]['available_stock'] += $variant->available_stock;
            $distribution[$value]['reserved_stock'] += $variant->reserved_stock;
            $distribution[$value]['variant_count']++;
        }

        return $distribution;
    }

    /**
     * Generate stock heatmap (2D matrix)
     *
     * Example: Size vs Color stock matrix
     *
     * @param string $tenantId
     * @param string $productId
     * @param string $attributeX First attribute (e.g., 'size')
     * @param string $attributeY Second attribute (e.g., 'color')
     * @return array
     */
    public function generateStockHeatmap(
        string $tenantId,
        string $productId,
        string $attributeX,
        string $attributeY
    ): array {
        $variants = ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->get();

        $heatmap = [
            'labels_x' => [],
            'labels_y' => [],
            'data' => []
        ];

        foreach ($variants as $variant) {
            $valueX = $variant->attributes[$attributeX] ?? 'Unknown';
            $valueY = $variant->attributes[$attributeY] ?? 'Unknown';

            // Collect unique labels
            if (!in_array($valueX, $heatmap['labels_x'])) {
                $heatmap['labels_x'][] = $valueX;
            }
            if (!in_array($valueY, $heatmap['labels_y'])) {
                $heatmap['labels_y'][] = $valueY;
            }

            // Build data matrix
            if (!isset($heatmap['data'][$valueY])) {
                $heatmap['data'][$valueY] = [];
            }
            
            $heatmap['data'][$valueY][$valueX] = $variant->available_stock;
        }

        return $heatmap;
    }

    /**
     * Calculate stock statistics for a product
     *
     * @param string $tenantId
     * @param string $productId
     * @return array
     */
    public function calculateStockStatistics(string $tenantId, string $productId): array
    {
        $variants = ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->get();

        if ($variants->isEmpty()) {
            return [
                'total_variants' => 0,
                'total_stock' => 0,
                'available_stock' => 0,
                'reserved_stock' => 0,
                'average_stock' => 0,
                'low_stock_count' => 0,
                'out_of_stock_count' => 0,
                'stock_value' => 0
            ];
        }

        $totalStock = $variants->sum('stock');
        $availableStock = $variants->sum(fn($v) => $v->available_stock);
        $reservedStock = $variants->sum('reserved_stock');
        $lowStockCount = $variants->filter(fn($v) => $v->available_stock <= 10)->count();
        $outOfStockCount = $variants->filter(fn($v) => $v->available_stock <= 0)->count();
        $stockValue = $variants->sum(fn($v) => $v->stock * $v->cost);

        return [
            'total_variants' => $variants->count(),
            'total_stock' => $totalStock,
            'available_stock' => $availableStock,
            'reserved_stock' => $reservedStock,
            'average_stock' => round($totalStock / $variants->count(), 2),
            'low_stock_count' => $lowStockCount,
            'out_of_stock_count' => $outOfStockCount,
            'stock_value' => round($stockValue, 2)
        ];
    }

    /**
     * Get variants with highest stock
     *
     * @param string $tenantId
     * @param string $productId
     * @param int $limit
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public function getTopStockVariants(
        string $tenantId,
        string $productId,
        int $limit = 5
    ) {
        return ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->orderByDesc('stock')
            ->limit($limit)
            ->get();
    }

    /**
     * Update parent product stock summary
     *
     * @param string $tenantId
     * @param string $productId
     * @return void
     */
    public function updateProductStockSummary(string $tenantId, string $productId): void
    {
        $stats = $this->calculateStockStatistics($tenantId, $productId);

        Product::where('tenant_id', $tenantId)
            ->where('id', $productId)
            ->update([
                'stock' => $stats['total_stock'],
                'low_stock_alert' => $stats['low_stock_count'] > 0,
                'updated_at' => now()
            ]);
    }

    /**
     * Calculate stock turnover rate
     *
     * @param string $tenantId
     * @param string $productId
     * @param int $days Period in days
     * @return float
     */
    public function calculateStockTurnover(
        string $tenantId,
        string $productId,
        int $days = 30
    ): float {
        // Get average stock
        $avgStock = ProductVariant::forTenant($tenantId)
            ->where('product_id', $productId)
            ->avg('stock') ?? 0;

        if ($avgStock == 0) {
            return 0;
        }

        // Get total sales quantity (would need sales data)
        // For now, return 0 as placeholder
        // In production, this would query sales/order_items table
        $totalSales = 0;

        return round($totalSales / $avgStock, 2);
    }
}