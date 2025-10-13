<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * AnalyticsUserPreference Model
 *
 * Phase 5: Backend Analytics - User Preferences
 * Stores user-configurable analytics settings.
 * NULL user_id = tenant-wide default preferences.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string|null $user_id
 * @property int $anomaly_window_days
 * @property float $anomaly_threshold_low
 * @property float $anomaly_threshold_medium
 * @property float $anomaly_threshold_high
 * @property float $anomaly_threshold_critical
 * @property int $forecast_days_ahead
 * @property string $forecast_algorithm
 * @property bool $email_notifications_enabled
 * @property array $notification_severity_filter
 * @property string $notification_digest_frequency
 * @property int $benchmark_baseline_days
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 * @property-read Tenant $tenant
 * @property-read User|null $user
 */
class AnalyticsUserPreference extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'analytics_user_preferences';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'anomaly_window_days',
        'anomaly_threshold_low',
        'anomaly_threshold_medium',
        'anomaly_threshold_high',
        'anomaly_threshold_critical',
        'forecast_days_ahead',
        'forecast_algorithm',
        'email_notifications_enabled',
        'notification_severity_filter',
        'notification_digest_frequency',
        'benchmark_baseline_days',
    ];

    protected $casts = [
        'anomaly_window_days' => 'integer',
        'anomaly_threshold_low' => 'decimal:2',
        'anomaly_threshold_medium' => 'decimal:2',
        'anomaly_threshold_high' => 'decimal:2',
        'anomaly_threshold_critical' => 'decimal:2',
        'forecast_days_ahead' => 'integer',
        'email_notifications_enabled' => 'boolean',
        'notification_severity_filter' => 'array',
        'benchmark_baseline_days' => 'integer',
    ];

    /**
     * Get the tenant that owns this preference
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get the user that owns this preference
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope: Filter by tenant
     */
    public function scopeTenantScoped($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope: Tenant-wide defaults (no user_id)
     */
    public function scopeTenantDefaults($query)
    {
        return $query->whereNull('user_id');
    }

    /**
     * Scope: User-specific preferences
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Get preferences for a user (or tenant default if not found)
     */
    public static function getForUser(string $tenantId, ?string $userId = null): self
    {
        if ($userId) {
            $userPref = self::where('tenant_id', $tenantId)
                ->where('user_id', $userId)
                ->first();

            if ($userPref) {
                return $userPref;
            }
        }

        return self::where('tenant_id', $tenantId)
            ->whereNull('user_id')
            ->firstOrFail();
    }
}
