<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AnalyticsAnomaly Model
 *
 * Phase 5: Backend Analytics - Anomaly Detection
 * Stores detected anomalies (spikes, drops, flat periods) for historical tracking.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $detected_date
 * @property string $metric_type (revenue|transactions|average_ticket)
 * @property string $anomaly_type (spike|drop|flat)
 * @property string $severity (low|medium|high|critical)
 * @property float $actual_value
 * @property float $expected_value
 * @property float $variance_percent
 * @property float $z_score
 * @property string|null $context_data
 * @property bool $acknowledged
 * @property string|null $acknowledged_by
 * @property \Carbon\Carbon|null $acknowledged_at
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property-read Tenant $tenant
 * @property-read User|null $acknowledgedBy
 */
class AnalyticsAnomaly extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'analytics_anomalies';

    protected $fillable = [
        'tenant_id',
        'detected_date',
        'metric_type',
        'anomaly_type',
        'severity',
        'actual_value',
        'expected_value',
        'variance_percent',
        'z_score',
        'context_data',
        'acknowledged',
        'acknowledged_by',
        'acknowledged_at',
    ];

    protected $casts = [
        'detected_date' => 'date',
        'actual_value' => 'decimal:2',
        'expected_value' => 'decimal:2',
        'variance_percent' => 'decimal:2',
        'z_score' => 'decimal:4',
        'acknowledged' => 'boolean',
        'acknowledged_at' => 'datetime',
    ];

    /**
     * Get the tenant that owns this anomaly
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get the user who acknowledged this anomaly
     */
    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    /**
     * Scope: Filter by tenant
     */
    public function scopeTenantScoped($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope: Filter by severity
     */
    public function scopeSeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope: Filter by acknowledged status
     */
    public function scopeAcknowledged($query, bool $acknowledged = true)
    {
        return $query->where('acknowledged', $acknowledged);
    }

    /**
     * Scope: Unacknowledged only
     */
    public function scopeUnacknowledged($query)
    {
        return $query->where('acknowledged', false);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeDateRange($query, ?string $startDate = null, ?string $endDate = null)
    {
        if ($startDate) {
            $query->where('detected_date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('detected_date', '<=', $endDate);
        }

        return $query;
    }

    /**
     * Scope: Critical severity only
     */
    public function scopeCritical($query)
    {
        return $query->where('severity', 'critical');
    }

    /**
     * Acknowledge this anomaly
     */
    public function acknowledge(string $userId): bool
    {
        $this->acknowledged = true;
        $this->acknowledged_by = $userId;
        $this->acknowledged_at = now();

        return $this->save();
    }
}
