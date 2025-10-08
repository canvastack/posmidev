<?php

namespace Src\Pms\Core\Services;

use Src\Pms\Infrastructure\Models\ProductView;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * View Tracking Service
 * 
 * Handles product view tracking for analytics.
 * Tracks both authenticated and anonymous user views.
 * 
 * @package Src\Pms\Core\Services
 */
class ViewTrackingService
{
    /**
     * Track a product view
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $userId
     * @param array $metadata
     * @return ProductView
     */
    public function trackView(
        string $productId,
        string $tenantId,
        ?string $userId = null,
        array $metadata = []
    ): ProductView {
        return ProductView::create([
            'tenant_id' => $tenantId,
            'product_id' => $productId,
            'user_id' => $userId,
            'ip_address' => $metadata['ip_address'] ?? null,
            'user_agent' => $metadata['user_agent'] ?? null,
            'viewed_at' => now(),
        ]);
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
    public function getMostViewed(
        string $tenantId,
        int $limit = 10,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $query = ProductView::query()
            ->select([
                'product_id',
                DB::raw('COUNT(*) as view_count'),
                DB::raw('COUNT(DISTINCT user_id) as unique_viewers'),
                DB::raw('MAX(viewed_at) as last_viewed'),
            ])
            ->tenantScoped($tenantId)
            ->groupBy('product_id')
            ->orderByDesc('view_count')
            ->limit($limit);
        
        if ($periodStart) {
            $query->where('viewed_at', '>=', $periodStart);
        }
        if ($periodEnd) {
            $query->where('viewed_at', '<=', $periodEnd);
        }
        
        $results = $query->get();
        
        // Load product details
        $productIds = $results->pluck('product_id')->toArray();
        $products = \Src\Pms\Infrastructure\Models\Product::whereIn('id', $productIds)
            ->get()
            ->keyBy('id');
        
        return $results->map(function ($item) use ($products) {
            $product = $products->get($item->product_id);
            
            return [
                'product_id' => $item->product_id,
                'product_name' => $product->name ?? 'Unknown',
                'product_sku' => $product->sku ?? 'N/A',
                'image_url' => $product->image_url ?? null,
                'view_count' => (int) $item->view_count,
                'unique_viewers' => (int) $item->unique_viewers,
                'last_viewed' => $item->last_viewed,
            ];
        })->toArray();
    }

    /**
     * Get view trends for a product
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @param string $groupBy ('day', 'week', 'month')
     * @return array
     */
    public function getViewTrends(
        string $productId,
        string $tenantId,
        ?string $periodStart = null,
        ?string $periodEnd = null,
        string $groupBy = 'day'
    ): array {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        // Build date grouping based on $groupBy
        $dateFormat = match($groupBy) {
            'week' => 'YYYY-IW', // ISO week
            'month' => 'YYYY-MM',
            default => 'YYYY-MM-DD', // day
        };
        
        $results = ProductView::query()
            ->select([
                DB::raw("TO_CHAR(viewed_at, '{$dateFormat}') as period"),
                DB::raw('COUNT(*) as view_count'),
                DB::raw('COUNT(DISTINCT user_id) as unique_viewers'),
            ])
            ->tenantScoped($tenantId)
            ->forProduct($productId)
            ->dateRange($period['start'], $period['end'])
            ->groupBy('period')
            ->orderBy('period')
            ->get();
        
        return $results->map(function ($item) {
            return [
                'period' => $item->period,
                'view_count' => (int) $item->view_count,
                'unique_viewers' => (int) $item->unique_viewers,
            ];
        })->toArray();
    }

    /**
     * Get view statistics for a product
     * 
     * @param string $productId
     * @param string $tenantId
     * @param string|null $periodStart
     * @param string|null $periodEnd
     * @return array
     */
    public function getViewStats(
        string $productId,
        string $tenantId,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): array {
        $period = $this->normalizePeriod($periodStart, $periodEnd);
        
        $stats = ProductView::query()
            ->select([
                DB::raw('COUNT(*) as total_views'),
                DB::raw('COUNT(DISTINCT user_id) as unique_viewers'),
                DB::raw('COUNT(CASE WHEN user_id IS NULL THEN 1 END) as anonymous_views'),
                DB::raw('COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as authenticated_views'),
            ])
            ->tenantScoped($tenantId)
            ->forProduct($productId)
            ->dateRange($period['start'], $period['end'])
            ->first();
        
        return [
            'total_views' => (int) ($stats->total_views ?? 0),
            'unique_viewers' => (int) ($stats->unique_viewers ?? 0),
            'anonymous_views' => (int) ($stats->anonymous_views ?? 0),
            'authenticated_views' => (int) ($stats->authenticated_views ?? 0),
            'period' => $period,
        ];
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