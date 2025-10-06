<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class VariantAnalytics extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Create a new factory instance for the model
     */
    protected static function newFactory()
    {
        return \Database\Factories\VariantAnalyticsFactory::new();
    }

    protected $fillable = [
        'id',
        'tenant_id',
        'product_variant_id',
        'period_date',
        'period_type',
        'total_orders',
        'quantity_sold',
        'revenue',
        'profit',
        'stock_start',
        'stock_end',
        'stock_added',
        'stock_removed',
        'days_out_of_stock',
        'conversion_rate',
        'view_count',
        'add_to_cart_count',
        'revenue_rank_percentile',
        'quantity_rank_percentile',
        'stock_turnover_rate',
        'avg_daily_sales',
        'predicted_sales_next_period',
        'predicted_stockout_date',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'product_variant_id' => 'string',
        'period_date' => 'date',
        'period_type' => 'string',
        'total_orders' => 'integer',
        'quantity_sold' => 'integer',
        'revenue' => 'decimal:2',
        'profit' => 'decimal:2',
        'stock_start' => 'integer',
        'stock_end' => 'integer',
        'stock_added' => 'integer',
        'stock_removed' => 'integer',
        'days_out_of_stock' => 'integer',
        'conversion_rate' => 'decimal:2',
        'view_count' => 'integer',
        'add_to_cart_count' => 'integer',
        'revenue_rank_percentile' => 'decimal:2',
        'quantity_rank_percentile' => 'decimal:2',
        'stock_turnover_rate' => 'decimal:4',
        'avg_daily_sales' => 'decimal:2',
        'predicted_sales_next_period' => 'integer',
        'predicted_stockout_date' => 'date',
    ];

    protected $attributes = [
        'period_type' => 'daily',
    ];

    // ========================================
    // Relationships
    // ========================================

    /**
     * Tenant relationship
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Product variant relationship
     */
    public function productVariant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }
    
    /**
     * Alias for productVariant relationship (for backwards compatibility)
     */
    public function variant(): BelongsTo
    {
        return $this->productVariant();
    }

    // ========================================
    // Query Scopes
    // ========================================

    /**
     * Scope to tenant
     */
    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope to variant
     */
    public function scopeForVariant(Builder $query, string $variantId): Builder
    {
        return $query->where('product_variant_id', $variantId);
    }

    /**
     * Scope to period type
     */
    public function scopePeriodType(Builder $query, string $type): Builder
    {
        return $query->where('period_type', $type);
    }

    /**
     * Scope to date range
     */
    public function scopeDateRange(Builder $query, string $startDate, string $endDate): Builder
    {
        return $query->whereBetween('period_date', [$startDate, $endDate]);
    }

    /**
     * Scope to today
     */
    public function scopeToday(Builder $query): Builder
    {
        return $query->where('period_date', now()->toDateString());
    }

    /**
     * Scope to yesterday
     */
    public function scopeYesterday(Builder $query): Builder
    {
        return $query->where('period_date', now()->subDay()->toDateString());
    }

    /**
     * Scope to this week
     */
    public function scopeThisWeek(Builder $query): Builder
    {
        return $query->whereBetween('period_date', [
            now()->startOfWeek()->toDateString(),
            now()->endOfWeek()->toDateString(),
        ]);
    }

    /**
     * Scope to this month
     */
    public function scopeThisMonth(Builder $query): Builder
    {
        return $query->whereBetween('period_date', [
            now()->startOfMonth()->toDateString(),
            now()->endOfMonth()->toDateString(),
        ]);
    }

    /**
     * Scope to top performers by revenue
     */
    public function scopeTopRevenue(Builder $query, int $limit = 10): Builder
    {
        return $query->orderByDesc('revenue')->limit($limit);
    }

    /**
     * Scope to top performers by quantity
     */
    public function scopeTopQuantity(Builder $query, int $limit = 10): Builder
    {
        return $query->orderByDesc('quantity_sold')->limit($limit);
    }

    /**
     * Scope to underperformers (low sales)
     */
    public function scopeUnderperforming(Builder $query, int $limit = 10): Builder
    {
        return $query->orderBy('quantity_sold')->limit($limit);
    }

    // ========================================
    // Calculation Methods
    // ========================================

    /**
     * Calculate profit margin percentage
     */
    public function getProfitMarginAttribute(): float
    {
        if ($this->revenue == 0) {
            return 0;
        }

        return ($this->profit / $this->revenue) * 100;
    }

    /**
     * Calculate conversion rate from views to sales
     */
    public function calculateConversionRate(): float
    {
        if ($this->view_count == 0) {
            return 0;
        }

        return ($this->total_orders / $this->view_count) * 100;
    }

    /**
     * Calculate cart abandonment rate
     */
    public function calculateCartAbandonmentRate(): float
    {
        if ($this->add_to_cart_count == 0) {
            return 0;
        }

        return (($this->add_to_cart_count - $this->total_orders) / $this->add_to_cart_count) * 100;
    }

    /**
     * Calculate stock turnover rate
     */
    public function calculateStockTurnoverRate(): float
    {
        $avgStock = ($this->stock_start + $this->stock_end) / 2;
        
        if ($avgStock == 0) {
            return 0;
        }

        return $this->quantity_sold / $avgStock;
    }

    /**
     * Calculate days of stock remaining
     */
    public function calculateDaysOfStockRemaining(): int
    {
        if ($this->avg_daily_sales == 0 || $this->stock_end == 0) {
            return 0;
        }

        return (int) ceil($this->stock_end / $this->avg_daily_sales);
    }

    /**
     * Is this variant a top performer?
     */
    public function isTopPerformer(): bool
    {
        return ($this->revenue_rank_percentile ?? 0) >= 80 
            || ($this->quantity_rank_percentile ?? 0) >= 80;
    }

    /**
     * Is this variant underperforming?
     */
    public function isUnderperforming(): bool
    {
        return ($this->revenue_rank_percentile ?? 0) <= 20 
            && ($this->quantity_rank_percentile ?? 0) <= 20;
    }

    /**
     * Get performance status
     */
    public function getPerformanceStatus(): string
    {
        if ($this->isTopPerformer()) {
            return 'excellent';
        }

        if ($this->isUnderperforming()) {
            return 'poor';
        }

        if (($this->revenue_rank_percentile ?? 0) >= 50) {
            return 'good';
        }

        return 'average';
    }

    /**
     * Get performance color for UI
     */
    public function getPerformanceColor(): string
    {
        return match($this->getPerformanceStatus()) {
            'excellent' => 'green',
            'good' => 'blue',
            'average' => 'yellow',
            'poor' => 'red',
            default => 'gray',
        };
    }

    // ========================================
    // Aggregation Methods
    // ========================================

    /**
     * Aggregate analytics for a variant over a period
     */
    public static function aggregateForVariant(
        string $tenantId, 
        string $variantId, 
        string $startDate, 
        string $endDate
    ): array {
        $analytics = static::forTenant($tenantId)
            ->forVariant($variantId)
            ->dateRange($startDate, $endDate)
            ->get();

        return [
            'total_orders' => $analytics->sum('total_orders'),
            'quantity_sold' => $analytics->sum('quantity_sold'),
            'revenue' => $analytics->sum('revenue'),
            'profit' => $analytics->sum('profit'),
            'view_count' => $analytics->sum('view_count'),
            'add_to_cart_count' => $analytics->sum('add_to_cart_count'),
            'avg_conversion_rate' => $analytics->avg('conversion_rate'),
            'days_out_of_stock' => $analytics->sum('days_out_of_stock'),
        ];
    }

    /**
     * Get top performing variants for a tenant
     */
    public static function getTopPerformers(
        string $tenantId,
        string $metric = 'revenue',
        string $periodType = 'monthly',
        int $limit = 10,
        ?string $periodStart = null,
        ?string $periodEnd = null
    ): \Illuminate\Support\Collection {
        $query = static::forTenant($tenantId)
            ->where('period_type', $periodType)
            ->with('productVariant.product');

        if ($periodStart) {
            $query->where('period_date', '>=', $periodStart);
        }

        if ($periodEnd) {
            $query->where('period_date', '<=', $periodEnd);
        }

        // Get latest analytics per variant and order by metric
        return $query->whereIn('id', function ($subquery) use ($tenantId, $periodType) {
                $subquery->selectRaw('MAX(id)')
                    ->from('variant_analytics')
                    ->where('tenant_id', $tenantId)
                    ->where('period_type', $periodType)
                    ->groupBy('product_variant_id');
            })
            ->orderByDesc($metric)
            ->limit($limit)
            ->get();
    }

    /**
     * Calculate percentile ranks for a period
     */
    public static function calculatePercentileRanks(string $tenantId, string $periodDate): void
    {
        $analytics = static::forTenant($tenantId)
            ->where('period_date', $periodDate)
            ->orderBy('revenue')
            ->get();

        $total = $analytics->count();

        if ($total === 0) {
            return;
        }

        foreach ($analytics as $index => $analytic) {
            $percentile = ($index / $total) * 100;
            $analytic->update(['revenue_rank_percentile' => $percentile]);
        }

        // Recalculate for quantity
        $analytics = static::forTenant($tenantId)
            ->where('period_date', $periodDate)
            ->orderBy('quantity_sold')
            ->get();

        foreach ($analytics as $index => $analytic) {
            $percentile = ($index / $total) * 100;
            $analytic->update(['quantity_rank_percentile' => $percentile]);
        }
    }

    // ========================================
    // Model Events
    // ========================================

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate UUID if not provided
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            // Auto-calculate conversion rate if not set
            if ($model->conversion_rate === null || $model->conversion_rate == 0) {
                $model->conversion_rate = $model->calculateConversionRate();
            }

            // Auto-calculate stock turnover rate if not set
            if ($model->stock_turnover_rate === null || $model->stock_turnover_rate == 0) {
                $model->stock_turnover_rate = $model->calculateStockTurnoverRate();
            }
        });
    }
}