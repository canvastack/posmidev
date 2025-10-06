<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\VariantAnalytics;
use Carbon\Carbon;

/**
 * Variant Analytics Service
 * 
 * Handles calculation and aggregation of variant performance analytics
 */
class VariantAnalyticsService
{
    /**
     * Calculate daily analytics for a specific variant
     */
    public function calculateDailyAnalytics(string $tenantId, string $variantId, string $date): VariantAnalytics
    {
        $variant = ProductVariant::forTenant($tenantId)->findOrFail($variantId);
        $carbonDate = Carbon::parse($date);

        // Get order data for this variant on this date
        $orderData = $this->getOrderDataForDay($variantId, $carbonDate);

        // Get stock data
        $stockData = $this->getStockDataForDay($variant, $carbonDate);

        // Get engagement data (views, cart adds)
        $engagementData = $this->getEngagementDataForDay($variantId, $carbonDate);

        // Calculate or retrieve analytics
        return VariantAnalytics::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'product_variant_id' => $variantId,
                'period_date' => $carbonDate->toDateString(),
                'period_type' => 'daily',
            ],
            array_merge(
                $orderData,
                $stockData,
                $engagementData,
                $this->calculateDerivedMetrics($variant, $orderData, $stockData, $engagementData)
            )
        );
    }

    /**
     * Calculate analytics for all variants in a tenant for a specific date
     */
    public function calculateDailyAnalyticsForTenant(string $tenantId, string $date): Collection
    {
        $variants = ProductVariant::forTenant($tenantId)->get();
        $results = collect();

        foreach ($variants as $variant) {
            try {
                $analytics = $this->calculateDailyAnalytics($tenantId, $variant->id, $date);
                $results->push($analytics);
            } catch (\Exception $e) {
                \Log::error("Failed to calculate analytics for variant {$variant->id}: " . $e->getMessage());
            }
        }

        // After all daily analytics calculated, update percentile ranks
        if ($results->isNotEmpty()) {
            VariantAnalytics::calculatePercentileRanks($tenantId, $date);
        }

        return $results;
    }

    /**
     * Aggregate daily analytics into weekly analytics
     */
    public function aggregateWeeklyAnalytics(string $tenantId, string $variantId, Carbon $weekStart): VariantAnalytics
    {
        $weekEnd = $weekStart->copy()->endOfWeek();

        $dailyAnalytics = VariantAnalytics::forTenant($tenantId)
            ->forVariant($variantId)
            ->periodType('daily')
            ->whereBetween('period_date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->get();

        if ($dailyAnalytics->isEmpty()) {
            throw new \Exception("No daily analytics found for aggregation");
        }

        $variant = ProductVariant::forTenant($tenantId)->findOrFail($variantId);

        return VariantAnalytics::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'product_variant_id' => $variantId,
                'period_date' => $weekStart->toDateString(),
                'period_type' => 'weekly',
            ],
            $this->aggregateAnalytics($variant, $dailyAnalytics)
        );
    }

    /**
     * Aggregate daily analytics into monthly analytics
     */
    public function aggregateMonthlyAnalytics(string $tenantId, string $variantId, Carbon $monthStart): VariantAnalytics
    {
        $monthEnd = $monthStart->copy()->endOfMonth();

        $dailyAnalytics = VariantAnalytics::forTenant($tenantId)
            ->forVariant($variantId)
            ->periodType('daily')
            ->whereBetween('period_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->get();

        if ($dailyAnalytics->isEmpty()) {
            throw new \Exception("No daily analytics found for aggregation");
        }

        $variant = ProductVariant::forTenant($tenantId)->findOrFail($variantId);

        return VariantAnalytics::updateOrCreate(
            [
                'tenant_id' => $tenantId,
                'product_variant_id' => $variantId,
                'period_date' => $monthStart->toDateString(),
                'period_type' => 'monthly',
            ],
            $this->aggregateAnalytics($variant, $dailyAnalytics)
        );
    }

    /**
     * Get insights and recommendations for a variant
     */
    public function getVariantInsights(string $tenantId, string $variantId): array
    {
        $variant = ProductVariant::forTenant($tenantId)->findOrFail($variantId);
        
        // Get latest monthly analytics
        $latestAnalytics = VariantAnalytics::forTenant($tenantId)
            ->forVariant($variantId)
            ->periodType('monthly')
            ->orderBy('period_date', 'desc')
            ->first();

        if (!$latestAnalytics) {
            return [
                'status' => 'no_data',
                'message' => 'No analytics data available yet',
                'recommendations' => [],
            ];
        }

        $insights = [
            'performance_status' => $latestAnalytics->getPerformanceStatus(),
            'performance_color' => $latestAnalytics->getPerformanceColor(),
            'is_top_performer' => $latestAnalytics->isTopPerformer(),
            'is_underperforming' => $latestAnalytics->isUnderperforming(),
        ];

        $recommendations = [];

        // Stock recommendations
        if ($variant->is_low_stock) {
            $recommendations[] = [
                'type' => 'stock',
                'priority' => 'high',
                'message' => "Low stock alert! Current stock: {$variant->stock}. Consider reordering.",
                'action' => 'reorder',
            ];
        }

        if ($latestAnalytics->predicted_stockout_date) {
            $daysUntilStockout = Carbon::parse($latestAnalytics->predicted_stockout_date)->diffInDays(now());
            if ($daysUntilStockout <= 7) {
                $recommendations[] = [
                    'type' => 'stock',
                    'priority' => 'critical',
                    'message' => "Predicted to run out of stock in {$daysUntilStockout} days",
                    'action' => 'urgent_reorder',
                ];
            }
        }

        // Performance recommendations
        if ($latestAnalytics->isUnderperforming()) {
            if ($latestAnalytics->conversion_rate < 1) {
                $recommendations[] = [
                    'type' => 'performance',
                    'priority' => 'medium',
                    'message' => 'Low conversion rate. Consider improving product images or description.',
                    'action' => 'improve_listing',
                ];
            }

            if ($latestAnalytics->view_count < 10) {
                $recommendations[] = [
                    'type' => 'marketing',
                    'priority' => 'medium',
                    'message' => 'Low visibility. Consider promoting this variant.',
                    'action' => 'promote',
                ];
            }
        }

        // Pricing recommendations
        if ($latestAnalytics->profit_margin < 10) {
            $recommendations[] = [
                'type' => 'pricing',
                'priority' => 'medium',
                'message' => 'Low profit margin. Consider adjusting price or reducing costs.',
                'action' => 'review_pricing',
            ];
        }

        // Success indicators
        if ($latestAnalytics->isTopPerformer()) {
            $recommendations[] = [
                'type' => 'success',
                'priority' => 'info',
                'message' => 'This variant is performing excellently! Ensure adequate stock levels.',
                'action' => 'maintain',
            ];
        }

        return [
            'variant' => [
                'id' => $variant->id,
                'name' => $variant->display_name,
                'sku' => $variant->sku,
                'current_stock' => $variant->stock,
                'available_stock' => $variant->available_stock,
            ],
            'latest_analytics' => [
                'period_date' => $latestAnalytics->period_date->format('Y-m-d'),
                'revenue' => (float) $latestAnalytics->revenue,
                'profit' => (float) $latestAnalytics->profit,
                'quantity_sold' => $latestAnalytics->quantity_sold,
                'conversion_rate' => (float) $latestAnalytics->conversion_rate,
            ],
            'insights' => $insights,
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Get comparative performance across attribute values
     * Example: Compare all "Red" variants vs "Blue" variants
     */
    public function getAttributePerformanceComparison(string $tenantId, string $attributeName, string $periodType = 'monthly'): array
    {
        // Get all variants with this attribute
        $variants = ProductVariant::forTenant($tenantId)
            ->whereRaw("attributes->? IS NOT NULL", [$attributeName])
            ->get();

        if ($variants->isEmpty()) {
            return [
                'attribute' => $attributeName,
                'message' => 'No variants found with this attribute',
                'data' => [],
            ];
        }

        // Group by attribute value
        $groupedVariants = $variants->groupBy(function ($variant) use ($attributeName) {
            return $variant->attributes[$attributeName] ?? 'unknown';
        });

        $results = [];

        foreach ($groupedVariants as $attributeValue => $variantsGroup) {
            $variantIds = $variantsGroup->pluck('id');

            // Get latest analytics for these variants
            $analytics = VariantAnalytics::query()
                ->whereIn('product_variant_id', $variantIds)
                ->where('period_type', $periodType)
                ->whereIn('id', function ($query) use ($variantIds, $periodType) {
                    $query->selectRaw('MAX(id)')
                        ->from('variant_analytics')
                        ->whereIn('product_variant_id', $variantIds)
                        ->where('period_type', $periodType)
                        ->groupBy('product_variant_id');
                })
                ->get();

            $results[$attributeValue] = [
                'variant_count' => $variantsGroup->count(),
                'total_revenue' => (float) $analytics->sum('revenue'),
                'total_profit' => (float) $analytics->sum('profit'),
                'total_quantity_sold' => $analytics->sum('quantity_sold'),
                'avg_conversion_rate' => round((float) $analytics->avg('conversion_rate'), 2),
                'avg_profit_margin' => $analytics->avg('revenue') > 0 
                    ? round(($analytics->sum('profit') / $analytics->sum('revenue')) * 100, 2)
                    : 0,
            ];
        }

        // Sort by revenue descending
        $sortedResults = collect($results)->sortByDesc('total_revenue')->toArray();

        return [
            'attribute' => $attributeName,
            'period_type' => $periodType,
            'comparison' => $sortedResults,
            'top_performer' => array_key_first($sortedResults),
            'insights' => $this->generateAttributeInsights($attributeName, $sortedResults),
        ];
    }

    // ========================================
    // Private Helper Methods
    // ========================================

    /**
     * Get order data for a specific day
     */
    private function getOrderDataForDay(string $variantId, Carbon $date): array
    {
        // TODO: Implement when Order system is ready
        // For now, return zeros or mock data
        
        return [
            'total_orders' => 0,
            'quantity_sold' => 0,
            'revenue' => 0,
            'profit' => 0,
        ];
    }

    /**
     * Get stock data for a specific day
     */
    private function getStockDataForDay(ProductVariant $variant, Carbon $date): array
    {
        // Get previous day's analytics for stock_start
        $previousAnalytics = VariantAnalytics::forVariant($variant->id)
            ->periodType('daily')
            ->where('period_date', $date->copy()->subDay()->toDateString())
            ->first();

        $stockStart = $previousAnalytics ? $previousAnalytics->stock_end : $variant->stock;
        $stockEnd = $variant->stock;

        return [
            'stock_start' => $stockStart,
            'stock_end' => $stockEnd,
            'stock_added' => max(0, $stockEnd - $stockStart),
            'stock_removed' => max(0, $stockStart - $stockEnd),
            'days_out_of_stock' => $stockEnd == 0 ? 1 : 0,
        ];
    }

    /**
     * Get engagement data for a specific day
     */
    private function getEngagementDataForDay(string $variantId, Carbon $date): array
    {
        // TODO: Implement when product view tracking is ready
        // For now, return zeros or mock data
        
        return [
            'view_count' => 0,
            'add_to_cart_count' => 0,
        ];
    }

    /**
     * Calculate derived metrics
     */
    private function calculateDerivedMetrics(ProductVariant $variant, array $orderData, array $stockData, array $engagementData): array
    {
        $conversionRate = $engagementData['view_count'] > 0 
            ? ($orderData['total_orders'] / $engagementData['view_count']) * 100
            : 0;

        $avgStock = ($stockData['stock_start'] + $stockData['stock_end']) / 2;
        $turnoverRate = $avgStock > 0 ? $orderData['quantity_sold'] / $avgStock : 0;

        $avgDailySales = $orderData['quantity_sold']; // Since this is daily data

        return [
            'conversion_rate' => round($conversionRate, 2),
            'stock_turnover_rate' => round($turnoverRate, 4),
            'avg_daily_sales' => round($avgDailySales, 2),
            'predicted_sales_next_period' => (int) ceil($avgDailySales),
            'predicted_stockout_date' => $avgDailySales > 0 && $stockData['stock_end'] > 0
                ? Carbon::now()->addDays((int) ceil($stockData['stock_end'] / max($avgDailySales, 1)))->toDateString()
                : null,
        ];
    }

    /**
     * Aggregate analytics from daily data
     */
    private function aggregateAnalytics(ProductVariant $variant, Collection $dailyAnalytics): array
    {
        $totalDays = $dailyAnalytics->count();
        $avgDailySales = $totalDays > 0 ? $dailyAnalytics->sum('quantity_sold') / $totalDays : 0;

        return [
            'total_orders' => $dailyAnalytics->sum('total_orders'),
            'quantity_sold' => $dailyAnalytics->sum('quantity_sold'),
            'revenue' => $dailyAnalytics->sum('revenue'),
            'profit' => $dailyAnalytics->sum('profit'),
            'stock_start' => $dailyAnalytics->first()->stock_start,
            'stock_end' => $dailyAnalytics->last()->stock_end,
            'stock_added' => $dailyAnalytics->sum('stock_added'),
            'stock_removed' => $dailyAnalytics->sum('stock_removed'),
            'days_out_of_stock' => $dailyAnalytics->sum('days_out_of_stock'),
            'view_count' => $dailyAnalytics->sum('view_count'),
            'add_to_cart_count' => $dailyAnalytics->sum('add_to_cart_count'),
            'conversion_rate' => round((float) $dailyAnalytics->avg('conversion_rate'), 2),
            'stock_turnover_rate' => round((float) $dailyAnalytics->avg('stock_turnover_rate'), 4),
            'avg_daily_sales' => round($avgDailySales, 2),
            'predicted_sales_next_period' => (int) ceil($avgDailySales * $totalDays),
            'predicted_stockout_date' => $avgDailySales > 0 && $variant->stock > 0
                ? Carbon::now()->addDays((int) ceil($variant->stock / max($avgDailySales, 1)))->toDateString()
                : null,
        ];
    }

    /**
     * Generate insights from attribute comparison
     */
    private function generateAttributeInsights(string $attributeName, array $comparison): array
    {
        if (empty($comparison)) {
            return [];
        }

        $insights = [];
        $values = array_keys($comparison);
        $topValue = $values[0];
        $bottomValue = end($values);

        $topRevenue = $comparison[$topValue]['total_revenue'];
        $bottomRevenue = $comparison[$bottomValue]['total_revenue'];

        if ($topRevenue > 0 && $bottomRevenue >= 0) {
            $revenueDiff = (($topRevenue - $bottomRevenue) / $topRevenue) * 100;
            
            $insights[] = [
                'type' => 'performance_gap',
                'message' => "'{$topValue}' outperforms '{$bottomValue}' by " . round($revenueDiff, 1) . "% in revenue.",
            ];
        }

        // Find best conversion rate
        $bestConversion = collect($comparison)->sortByDesc('avg_conversion_rate')->first();
        $bestConversionValue = array_search($bestConversion, $comparison);

        if ($bestConversionValue) {
            $insights[] = [
                'type' => 'best_conversion',
                'message' => "'{$bestConversionValue}' has the highest conversion rate at {$bestConversion['avg_conversion_rate']}%.",
            ];
        }

        return $insights;
    }
}