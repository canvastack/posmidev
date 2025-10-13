<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AnalyticsForecast Model
 *
 * Phase 5: Backend Analytics - Forecasting
 * Stores pre-calculated forecasts for performance optimization.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $forecast_date (when forecast was generated)
 * @property string $predicted_date (date being predicted)
 * @property string $metric_type (revenue|transactions|average_ticket)
 * @property string $algorithm (linear_regression|exponential_smoothing)
 * @property float $predicted_value
 * @property float|null $confidence_lower (95% CI lower bound)
 * @property float|null $confidence_upper (95% CI upper bound)
 * @property float|null $r_squared (goodness of fit)
 * @property array|null $algorithm_params
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property-read Tenant $tenant
 */
class AnalyticsForecast extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'analytics_forecasts';

    protected $fillable = [
        'tenant_id',
        'forecast_date',
        'predicted_date',
        'metric_type',
        'algorithm',
        'predicted_value',
        'confidence_lower',
        'confidence_upper',
        'r_squared',
        'algorithm_params',
    ];

    protected $casts = [
        'forecast_date' => 'date',
        'predicted_date' => 'date',
        'predicted_value' => 'decimal:2',
        'confidence_lower' => 'decimal:2',
        'confidence_upper' => 'decimal:2',
        'r_squared' => 'decimal:4',
        'algorithm_params' => 'array',
    ];

    /**
     * Get the tenant that owns this forecast
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
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
     * Scope: Filter by algorithm
     */
    public function scopeAlgorithm($query, string $algorithm)
    {
        return $query->where('algorithm', $algorithm);
    }

    /**
     * Scope: Latest forecast for each date
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('forecast_date', 'desc');
    }

    /**
     * Scope: Predicted dates in range
     */
    public function scopePredictedDateRange($query, ?string $startDate = null, ?string $endDate = null)
    {
        if ($startDate) {
            $query->where('predicted_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('predicted_date', '<=', $endDate);
        }

        return $query;
    }

    /**
     * Scope: Generated on specific date
     */
    public function scopeGeneratedOn($query, string $date)
    {
        return $query->where('forecast_date', $date);
    }
}
