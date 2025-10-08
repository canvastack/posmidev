<?php

namespace Src\Pms\Core\Services;

use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductView;
use Src\Pms\Infrastructure\Models\ProductSearchTerm;
use Carbon\Carbon;

/**
 * Tenant Analytics Service
 * 
 * Provides tenant-wide analytics aggregation and reporting.
 * Powers the main analytics dashboard with insights across all products.
 * 
 * @package Src\Pms\Core\Services
 */
class TenantAnalyticsService
{
    /**
     * Get comprehensive analytics overview for tenant
     * 
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getOverview(string $tenantId, ?string $periodStart = null, ?string $periodEnd = null): array
    {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        return [
            'summary' => $this->getSummaryMetrics($tenantId, $period['start'], $period['end']),
            'top_products' => $this->getTopProducts($tenantId, 'revenue', 5, $period['start'], $period['end']),
            'recent_views' => $this->getRecentViewCount($tenantId, $period['start'], $period['end']),
            'recent_searches' => $this->getRecentSearchCount($tenantId, $period['start'], $period['end']),
            'period' => $period,
        ];
    }

    /**
     * Get top performing products by metric
     * 
     * @param string $tenantId
     * @param string $metric ('revenue', 'quantity', 'profit', 'views')
     * @param int $limit
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getTopProducts(
        string $tenantId,
        string $metric = 'revenue',
        int $limit = 10,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        // Build base query from order_items (sales data)
        $query = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('products as p', 'oi.product_id', '=', 'p.id')
            ->where('o.tenant_id', $tenantId)
            ->where('o.status', '!=', 'cancelled')
            ->whereBetween('o.created_at', [$period['start'], $period['end']])
            ->select([
                'p.id as product_id',
                'p.name as product_name',
                'p.sku as product_sku',
                'p.image_path',
                DB::raw('SUM(oi.quantity) as total_quantity_sold'),
                DB::raw('SUM(oi.quantity * oi.price) as total_revenue'),
                DB::raw('SUM(oi.quantity * (oi.price - COALESCE(p.cost_price, 0))) as total_profit'),
            ])
            ->groupBy('p.id', 'p.name', 'p.sku', 'p.image_path');
        
        // Apply ordering based on metric
        switch ($metric) {
            case 'quantity':
                $query->orderByDesc('total_quantity_sold');
                break;
            case 'profit':
                $query->orderByDesc('total_profit');
                break;
            case 'views':
                // For views, we need a different approach
                return $this->getTopViewedProducts($tenantId, $limit, $period['start'], $period['end']);
            case 'revenue':
            default:
                $query->orderByDesc('total_revenue');
                break;
        }
        
        $results = $query->limit($limit)->get();
        
        // Calculate profit margins
        return $results->map(function ($item) {
            $profitMargin = $item->total_revenue > 0 
                ? ($item->total_profit / $item->total_revenue) * 100 
                : 0;
                
            return [
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'product_sku' => $item->product_sku,
                'image_path' => $item->image_path,
                'total_quantity_sold' => (int) $item->total_quantity_sold,
                'total_revenue' => (float) $item->total_revenue,
                'total_profit' => (float) $item->total_profit,
                'profit_margin' => round($profitMargin, 2),
            ];
        })->toArray();
    }

    /**
     * Get revenue breakdown by product (for pie/donut charts)
     * 
     * @param string $tenantId
     * @param int $limit
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getRevenueBreakdown(
        string $tenantId,
        int $limit = 10,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $topProducts = $this->getTopProducts($tenantId, 'revenue', $limit, $periodStart, $periodEnd);
        
        $totalRevenue = array_sum(array_column($topProducts, 'total_revenue'));
        
        return [
            'products' => array_map(function ($product) use ($totalRevenue) {
                $percentage = $totalRevenue > 0 
                    ? ($product['total_revenue'] / $totalRevenue) * 100 
                    : 0;
                    
                return [
                    'product_id' => $product['product_id'],
                    'product_name' => $product['product_name'],
                    'revenue' => $product['total_revenue'],
                    'percentage' => round($percentage, 2),
                ];
            }, $topProducts),
            'total_revenue' => $totalRevenue,
        ];
    }

    /**
     * Get profit analysis across products
     * 
     * @param string $tenantId
     * @param int $limit
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getProfitAnalysis(
        string $tenantId,
        int $limit = 10,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        return [
            'top_profit_products' => $this->getTopProducts($tenantId, 'profit', $limit, $periodStart, $periodEnd),
            'average_profit_margin' => $this->getAverageProfitMargin($tenantId, $periodStart, $periodEnd),
        ];
    }

    /**
     * Get category performance breakdown
     * 
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getCategoryPerformance(
        string $tenantId,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        $results = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('products as p', 'oi.product_id', '=', 'p.id')
            ->leftJoin('categories as c', 'p.category_id', '=', 'c.id')
            ->where('o.tenant_id', $tenantId)
            ->where('o.status', '!=', 'cancelled')
            ->whereBetween('o.created_at', [$period['start'], $period['end']])
            ->select([
                'c.id as category_id',
                'c.name as category_name',
                DB::raw('COUNT(DISTINCT p.id) as product_count'),
                DB::raw('SUM(oi.quantity) as total_quantity_sold'),
                DB::raw('SUM(oi.quantity * oi.price) as total_revenue'),
            ])
            ->groupBy('c.id', 'c.name')
            ->orderByDesc('total_revenue')
            ->get();
        
        return $results->map(function ($item) {
            return [
                'category_id' => $item->category_id,
                'category_name' => $item->category_name ?? 'Uncategorized',
                'product_count' => (int) $item->product_count,
                'total_quantity_sold' => (int) $item->total_quantity_sold,
                'total_revenue' => (float) $item->total_revenue,
            ];
        })->toArray();
    }

    /**
     * Get most viewed products
     * 
     * @param string $tenantId
     * @param int $limit
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getTopViewedProducts(
        string $tenantId,
        int $limit = 10,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        $results = ProductView::query()
            ->select([
                'product_id',
                DB::raw('COUNT(*) as view_count'),
                DB::raw('COUNT(DISTINCT user_id) as unique_viewers'),
            ])
            ->tenantScoped($tenantId)
            ->dateRange($period['start'], $period['end'])
            ->groupBy('product_id')
            ->orderByDesc('view_count')
            ->limit($limit)
            ->get();
        
        // Enrich with product data
        $productIds = $results->pluck('product_id')->toArray();
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');
        
        return $results->map(function ($item) use ($products) {
            $product = $products->get($item->product_id);
            
            return [
                'product_id' => $item->product_id,
                'product_name' => $product->name ?? 'Unknown',
                'product_sku' => $product->sku ?? 'N/A',
                'image_path' => $product->image_path ?? null,
                'view_count' => (int) $item->view_count,
                'unique_viewers' => (int) $item->unique_viewers,
            ];
        })->toArray();
    }

    /**
     * Get summary metrics for dashboard overview
     * 
     * @param string $tenantId
     * @param string $periodStart
     * @param string $periodEnd
     * @return array
     */
    private function getSummaryMetrics(string $tenantId, string $periodStart, string $periodEnd): array
    {
        // Total revenue and orders from order_items
        $salesData = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->where('o.tenant_id', $tenantId)
            ->where('o.status', '!=', 'cancelled')
            ->whereBetween('o.created_at', [$periodStart, $periodEnd])
            ->selectRaw('
                COUNT(DISTINCT o.id) as total_orders,
                SUM(oi.quantity) as total_quantity_sold,
                SUM(oi.quantity * oi.price) as total_revenue
            ')
            ->first();
        
        // Total products count
        $totalProducts = Product::where('tenant_id', $tenantId)->count();
        
        return [
            'total_products' => $totalProducts,
            'total_orders' => (int) ($salesData->total_orders ?? 0),
            'total_quantity_sold' => (int) ($salesData->total_quantity_sold ?? 0),
            'total_revenue' => (float) ($salesData->total_revenue ?? 0),
        ];
    }

    /**
     * Get recent view count
     */
    private function getRecentViewCount(string $tenantId, string $periodStart, string $periodEnd): int
    {
        return ProductView::tenantScoped($tenantId)
            ->dateRange($periodStart, $periodEnd)
            ->count();
    }

    /**
     * Get recent search count
     */
    private function getRecentSearchCount(string $tenantId, string $periodStart, string $periodEnd): int
    {
        return ProductSearchTerm::tenantScoped($tenantId)
            ->dateRange($periodStart, $periodEnd)
            ->count();
    }

    /**
     * Get average profit margin
     */
    private function getAverageProfitMargin(string $tenantId, ?string $periodStart, ?string $periodEnd): float
    {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        $result = DB::table('order_items as oi')
            ->join('orders as o', 'oi.order_id', '=', 'o.id')
            ->join('products as p', 'oi.product_id', '=', 'p.id')
            ->where('o.tenant_id', $tenantId)
            ->where('o.status', '!=', 'cancelled')
            ->whereBetween('o.created_at', [$period['start'], $period['end']])
            ->selectRaw('
                SUM(oi.quantity * oi.price) as total_revenue,
                SUM(oi.quantity * (oi.price - COALESCE(p.cost_price, 0))) as total_profit
            ')
            ->first();
        
        if ($result && $result->total_revenue > 0) {
            return round(($result->total_profit / $result->total_revenue) * 100, 2);
        }
        
        return 0;
    }

    /**
     * Normalize period dates
     */
    private function normalizePeriod(?string $periodStart, ?string $periodEnd): array
    {
        $end = $periodEnd ? Carbon::parse($periodEnd) : Carbon::now();
        $start = $periodStart ? Carbon::parse($periodStart) : Carbon::now()->subDays(30);
        
        return [
            'start' => $start->toDateTimeString(),
            'end' => $end->toDateTimeString(),
        ];
    }
}