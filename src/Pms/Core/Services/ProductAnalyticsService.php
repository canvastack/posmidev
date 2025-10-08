<?php

namespace Src\Pms\Core\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductVariant;

/**
 * Product Analytics Service
 * 
 * Aggregates and calculates product-level analytics including:
 * - Sales metrics (revenue, quantity sold, orders)
 * - Stock metrics (current stock, value, movements)
 * - Profit analysis (cost, revenue, margin)
 * - Variant performance comparison
 * 
 * All queries are tenant-scoped via model relationships
 */
class ProductAnalyticsService
{
    /**
     * Get sales metrics for a product
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getSalesMetrics(string $productId, string $tenantId, ?string $periodStart = null, ?string $periodEnd = null): array
    {
        $product = Product::forTenant($tenantId)->findOrFail($productId);
        
        // Default to last 30 days if no period specified
        $start = $periodStart ? Carbon::parse($periodStart) : Carbon::now()->subDays(30);
        $end = $periodEnd ? Carbon::parse($periodEnd) : Carbon::now();
        
        // Get order items for this product (order_items only has product_id, not variant_id)
        // Query order_items table
        $salesData = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('order_items.product_id', $productId)
            ->whereBetween('orders.created_at', [$start, $end])
            ->whereNotIn('orders.status', ['cancelled', 'failed'])
            ->select(
                DB::raw('SUM(order_items.quantity) as total_quantity_sold'),
                DB::raw('SUM(order_items.subtotal) as total_revenue'),
                DB::raw('COUNT(DISTINCT orders.id) as total_orders'),
                DB::raw('AVG(order_items.subtotal) as average_order_value')
            )
            ->first();
        
        // Get sales trend (daily aggregation)
        $salesTrend = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('order_items.product_id', $productId)
            ->whereBetween('orders.created_at', [$start, $end])
            ->whereNotIn('orders.status', ['cancelled', 'failed'])
            ->select(
                DB::raw('DATE(orders.created_at) as date'),
                DB::raw('SUM(order_items.quantity) as quantity'),
                DB::raw('SUM(order_items.subtotal) as revenue')
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get()
            ->toArray();
        
        return [
            'total_revenue' => (float) ($salesData->total_revenue ?? 0),
            'total_quantity_sold' => (int) ($salesData->total_quantity_sold ?? 0),
            'total_orders' => (int) ($salesData->total_orders ?? 0),
            'average_order_value' => (float) ($salesData->average_order_value ?? 0),
            'sales_trend' => $salesTrend,
            'period' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
        ];
    }
    
    /**
     * Get stock metrics for a product
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getStockMetrics(string $productId, string $tenantId, ?string $periodStart = null, ?string $periodEnd = null): array
    {
        $product = Product::forTenant($tenantId)->with('variants')->findOrFail($productId);
        
        // Calculate current stock (aggregate from variants if they exist)
        $currentStock = $product->variants->isNotEmpty()
            ? $product->variants->sum('stock_quantity')
            : $product->stock_quantity;
        
        // Calculate stock value (stock * price)
        $stockValue = 0;
        if ($product->variants->isNotEmpty()) {
            $stockValue = $product->variants->sum(function ($variant) {
                return $variant->stock_quantity * ($variant->price ?? $variant->product->price);
            });
        } else {
            $stockValue = $product->stock_quantity * $product->price;
        }
        
        // Get stock movements from stock_adjustments table (only has product_id)
        $start = $periodStart ? Carbon::parse($periodStart) : Carbon::now()->subDays(30);
        $end = $periodEnd ? Carbon::parse($periodEnd) : Carbon::now();
        
        $stockMovements = DB::table('stock_adjustments')
            ->where('tenant_id', $tenantId)
            ->where('product_id', $productId)
            ->whereBetween('created_at', [$start, $end])
            ->select(
                DB::raw('DATE(created_at) as date'),
                'reason as adjustment_type',
                DB::raw('SUM(quantity) as total_change')
            )
            ->groupBy('date', 'reason')
            ->orderBy('date', 'asc')
            ->get()
            ->toArray();
        
        // Get low stock alerts count
        $lowStockAlerts = 0;
        if ($product->variants->isNotEmpty()) {
            $lowStockAlerts = $product->variants->filter(function ($variant) {
                return $variant->stock_quantity <= ($variant->low_stock_threshold ?? 10);
            })->count();
        } else {
            $lowStockAlerts = $product->stock_quantity <= ($product->low_stock_threshold ?? 10) ? 1 : 0;
        }
        
        return [
            'current_stock' => (int) $currentStock,
            'stock_value' => (float) $stockValue,
            'stock_movements' => $stockMovements,
            'low_stock_alerts' => (int) $lowStockAlerts,
            'period' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
        ];
    }
    
    /**
     * Get profit metrics for a product
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getProfitMetrics(string $productId, string $tenantId, ?string $periodStart = null, ?string $periodEnd = null): array
    {
        $product = Product::forTenant($tenantId)->with('variants')->findOrFail($productId);
        
        $start = $periodStart ? Carbon::parse($periodStart) : Carbon::now()->subDays(30);
        $end = $periodEnd ? Carbon::parse($periodEnd) : Carbon::now();
        
        // Get revenue from sales (order_items only has product_id)
        $salesData = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('order_items.product_id', $productId)
            ->whereBetween('orders.created_at', [$start, $end])
            ->whereNotIn('orders.status', ['cancelled', 'failed'])
            ->select(
                DB::raw('SUM(order_items.quantity) as total_quantity'),
                DB::raw('SUM(order_items.subtotal) as total_revenue')
            )
            ->first();
        
        $totalRevenue = (float) ($salesData->total_revenue ?? 0);
        $totalQuantity = (int) ($salesData->total_quantity ?? 0);
        
        // Calculate cost (assuming cost_price field exists)
        $totalCost = 0;
        if ($product->variants->isNotEmpty()) {
            // Use weighted average cost from variants
            $totalCost = $totalQuantity * $product->variants->avg('cost_price');
        } else {
            $totalCost = $totalQuantity * ($product->cost_price ?? 0);
        }
        
        $grossProfit = $totalRevenue - $totalCost;
        $profitMargin = $totalRevenue > 0 ? ($grossProfit / $totalRevenue) * 100 : 0;
        
        // Get profit trend (daily)
        $profitTrend = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('order_items.product_id', $productId)
            ->whereBetween('orders.created_at', [$start, $end])
            ->whereNotIn('orders.status', ['cancelled', 'failed'])
            ->select(
                DB::raw('DATE(orders.created_at) as date'),
                DB::raw('SUM(order_items.subtotal) as revenue'),
                DB::raw('SUM(order_items.quantity) as quantity')
            )
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($item) use ($product) {
                $avgCost = $product->variants->isNotEmpty() 
                    ? $product->variants->avg('cost_price') 
                    : ($product->cost_price ?? 0);
                $cost = $item->quantity * $avgCost;
                $profit = $item->revenue - $cost;
                
                return [
                    'date' => $item->date,
                    'revenue' => (float) $item->revenue,
                    'cost' => (float) $cost,
                    'profit' => (float) $profit,
                ];
            })
            ->toArray();
        
        return [
            'total_cost' => (float) $totalCost,
            'total_revenue' => (float) $totalRevenue,
            'gross_profit' => (float) $grossProfit,
            'profit_margin' => (float) round($profitMargin, 2),
            'profit_trend' => $profitTrend,
            'period' => [
                'start' => $start->toIso8601String(),
                'end' => $end->toIso8601String(),
            ],
        ];
    }
    
    /**
     * Get variant performance comparison
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @param int $limit
     * @return array
     */
    public function getVariantPerformance(string $productId, string $tenantId, ?string $periodStart = null, ?string $periodEnd = null, int $limit = 10): array
    {
        $product = Product::forTenant($tenantId)->with('variants')->findOrFail($productId);
        
        if ($product->variants->isEmpty()) {
            return [];
        }
        
        // Note: order_items table does not have product_variant_id column
        // So we cannot track individual variant sales from orders
        // Return variants with current stock info only
        return $product->variants->take($limit)->map(function ($variant) {
            return [
                'variant_id' => $variant->id,
                'variant_name' => $this->getVariantDisplayName($variant),
                'variant_sku' => $variant->sku,
                'total_sold' => 0, // Cannot track without variant_id in order_items
                'revenue' => 0.0,
                'stock_remaining' => (int) $variant->stock_quantity,
            ];
        })->toArray();
    }
    
    /**
     * Get combined analytics overview
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getOverview(string $productId, string $tenantId, ?string $periodStart = null, ?string $periodEnd = null): array
    {
        return [
            'sales' => $this->getSalesMetrics($productId, $tenantId, $periodStart, $periodEnd),
            'stock' => $this->getStockMetrics($productId, $tenantId, $periodStart, $periodEnd),
            'profit' => $this->getProfitMetrics($productId, $tenantId, $periodStart, $periodEnd),
            'variants' => $this->getVariantPerformance($productId, $tenantId, $periodStart, $periodEnd),
        ];
    }
    
    /**
     * Helper: Get display name for variant from attributes
     * 
     * @param ProductVariant $variant
     * @return string
     */
    private function getVariantDisplayName(ProductVariant $variant): string
    {
        $attributes = $variant->attributes ?? [];
        
        if (empty($attributes)) {
            return $variant->sku;
        }
        
        $names = [];
        foreach ($attributes as $attr) {
            if (isset($attr['value'])) {
                $names[] = $attr['value'];
            }
        }
        
        return implode(' / ', $names) ?: $variant->sku;
    }
}