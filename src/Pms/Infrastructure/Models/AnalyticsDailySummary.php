<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AnalyticsDailySummary Model
 * 
 * Stores pre-aggregated analytics data for faster dashboard queries.
 * Populated by scheduled job that runs daily.
 * 
 * @property string $id
 * @property string $tenant_id
 * @property string $date
 * @property string $metric_type
 * @property string|null $product_id
 * @property array $metric_value
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * 
 * @property-read Tenant $tenant
 * @property-read Product|null $product
 */
class AnalyticsDailySummary extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'analytics_daily_summary';

    protected $fillable = [
        'tenant_id',
        'date',
        'metric_type',
        'product_id',
        'metric_value',
    ];

    protected $casts = [
        'date' => 'date',
        'metric_value' => 'array',
    ];

    /**
     * Get the tenant that owns this summary
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get the product (if summary is product-specific)
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Scope: Filter by tenant
     */
    public function scopeTenantScoped($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope: Filter by metric type
     */
    public function scopeMetricType($query, string $type)
    {
        return $query->where('metric_type', $type);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeDateRange($query, ?string $startDate = null, ?string $endDate = null)
    {
        if ($startDate) {
            $query->where('date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('date', '<=', $endDate);
        }
        return $query;
    }

    /**
     * Scope: Only tenant-wide metrics (no product_id)
     */
    public function scopeTenantWide($query)
    {
        return $query->whereNull('product_id');
    }

    /**
     * Scope: Only product-specific metrics
     */
    public function scopeProductSpecific($query)
    {
        return $query->whereNotNull('product_id');
    }

    /**
     * Scope: For specific product
     */
    public function scopeForProduct($query, string $productId)
    {
        return $query->where('product_id', $productId);
    }
}