<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Stock Alert Model
 * 
 * Phase 5: Stock Management Enhancements
 * Tracks low stock alerts for products
 * 
 * CORE IMMUTABLE RULES ENFORCED:
 * - UUID primary key
 * - tenant_id scoping (global scope)
 * - All queries automatically filtered by tenant_id
 * 
 * @property string $id
 * @property string $tenant_id
 * @property string $product_id
 * @property int $current_stock
 * @property int $reorder_point
 * @property string $severity (low, critical, out_of_stock)
 * @property string $status (pending, acknowledged, resolved, dismissed)
 * @property bool $notified
 * @property \Carbon\Carbon|null $notified_at
 * @property string|null $acknowledged_by
 * @property \Carbon\Carbon|null $acknowledged_at
 * @property string|null $acknowledged_notes
 * @property string|null $resolved_by
 * @property \Carbon\Carbon|null $resolved_at
 * @property string|null $resolved_notes
 * @property string|null $dismissed_by
 * @property \Carbon\Carbon|null $dismissed_at
 * @property string|null $dismissed_notes
 * @property string|null $notes
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class StockAlert extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'stock_alerts';

    protected $fillable = [
        'tenant_id',
        'product_id',
        'current_stock',
        'reorder_point',
        'severity',
        'status',
        'notified',
        'notified_at',
        'acknowledged_by',
        'acknowledged_at',
        'acknowledged_notes',
        'resolved_by',
        'resolved_at',
        'resolved_notes',
        'dismissed_by',
        'dismissed_at',
        'dismissed_notes',
        'notes',
    ];

    protected $casts = [
        'current_stock' => 'integer',
        'reorder_point' => 'integer',
        'notified' => 'boolean',
        'notified_at' => 'datetime',
        'acknowledged_at' => 'datetime',
        'resolved_at' => 'datetime',
        'dismissed_at' => 'datetime',
    ];

    /**
     * IMMUTABLE RULE: All queries must be tenant-scoped
     * 
     * IMPORTANT: We DO NOT use global scope here because:
     * 1. Controllers explicitly filter by $tenantId from route parameter
     * 2. Global scope using auth()->user()->tenant_id breaks when HQ users access other tenants
     * 3. Middleware SetPermissionsTeamFromTenant handles team context
     * 4. Policies enforce tenant isolation at authorization level
     * 
     * All queries MUST explicitly include ->where('tenant_id', $tenantId)
     */
    protected static function booted()
    {
        // Set tenant_id automatically when creating
        static::creating(function ($model) {
            if (empty($model->tenant_id) && auth()->check()) {
                $model->tenant_id = auth()->user()->tenant_id;
            }
        });
    }

    // ========================================
    // Relationships
    // ========================================

    /**
     * Get the tenant that owns the alert
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get the product that triggered the alert
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the user who acknowledged the alert
     */
    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    /**
     * Get the user who resolved the alert
     */
    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * Get the user who dismissed the alert
     */
    public function dismissedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'dismissed_by');
    }

    /**
     * Alias for acknowledgedBy relationship (for test compatibility)
     */
    public function acknowledgedByUser(): BelongsTo
    {
        return $this->acknowledgedBy();
    }

    /**
     * Alias for resolvedBy relationship (for test compatibility)
     */
    public function resolvedByUser(): BelongsTo
    {
        return $this->resolvedBy();
    }

    /**
     * Alias for dismissedBy relationship (for test compatibility)
     */
    public function dismissedByUser(): BelongsTo
    {
        return $this->dismissedBy();
    }

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Acknowledge the alert
     * 
     * @param User $user User acknowledging the alert
     * @param string|null $notes Optional notes
     * @return void
     */
    public function acknowledge(User $user, ?string $notes = null): void
    {
        $this->update([
            'status' => 'acknowledged',
            'acknowledged_by' => $user->id,
            'acknowledged_at' => now(),
            'acknowledged_notes' => $notes,
        ]);
    }

    /**
     * Resolve the alert (stock has been replenished)
     * 
     * @param User $user User resolving the alert
     * @param string|null $notes Optional notes
     * @return void
     */
    public function resolve(User $user, ?string $notes = null): void
    {
        $this->update([
            'status' => 'resolved',
            'resolved_by' => $user->id,
            'resolved_at' => now(),
            'resolved_notes' => $notes,
        ]);
    }

    /**
     * Dismiss the alert (false positive or intentional low stock)
     * 
     * @param User $user User dismissing the alert
     * @param string|null $notes Optional notes
     * @return void
     */
    public function dismiss(User $user, ?string $notes = null): void
    {
        $this->update([
            'status' => 'dismissed',
            'dismissed_by' => $user->id,
            'dismissed_at' => now(),
            'dismissed_notes' => $notes,
        ]);
    }

    /**
     * Mark the alert as notified
     * 
     * @return void
     */
    public function markAsNotified(): void
    {
        $this->update([
            'notified' => true,
            'notified_at' => now(),
        ]);
    }

    // ========================================
    // Query Scopes
    // ========================================

    /**
     * Scope to get only pending alerts
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope to get only acknowledged alerts
     */
    public function scopeAcknowledged($query)
    {
        return $query->where('status', 'acknowledged');
    }

    /**
     * Scope to get only resolved alerts
     */
    public function scopeResolved($query)
    {
        return $query->where('status', 'resolved');
    }

    /**
     * Scope to get only dismissed alerts
     */
    public function scopeDismissed($query)
    {
        return $query->where('status', 'dismissed');
    }

    /**
     * Scope to filter by severity
     * 
     * @param mixed $query
     * @param string $severity low, critical, or out_of_stock
     */
    public function scopeBySeverity($query, string $severity)
    {
        return $query->where('severity', $severity);
    }

    /**
     * Scope to get low severity alerts
     */
    public function scopeLowSeverity($query)
    {
        return $query->where('severity', 'low');
    }

    /**
     * Scope to get critical severity alerts
     */
    public function scopeCriticalSeverity($query)
    {
        return $query->where('severity', 'critical');
    }

    /**
     * Scope to get out of stock alerts
     */
    public function scopeOutOfStock($query)
    {
        return $query->where('severity', 'out_of_stock');
    }

    /**
     * Scope to get alerts that haven't been notified yet
     */
    public function scopeNotNotified($query)
    {
        return $query->where('notified', false);
    }

    /**
     * Scope to get recent alerts (last 7 days)
     */
    public function scopeRecent($query, int $days = 7)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    /**
     * Scope to get critical alerts (critical or out_of_stock severity)
     */
    public function scopeCritical($query)
    {
        return $query->whereIn('severity', ['critical', 'out_of_stock']);
    }

    /**
     * Scope to get actionable alerts (pending or acknowledged status)
     */
    public function scopeActionable($query)
    {
        return $query->whereIn('status', ['pending', 'acknowledged']);
    }

    // ========================================
    // Accessors & Attributes
    // ========================================

    /**
     * Get severity color for UI
     */
    public function getSeverityColorAttribute(): string
    {
        return match($this->severity) {
            'low' => 'yellow',
            'critical' => 'orange',
            'out_of_stock' => 'red',
            default => 'gray',
        };
    }

    /**
     * Get status color for UI
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'pending' => 'red',
            'acknowledged' => 'yellow',
            'resolved' => 'green',
            'dismissed' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Check if alert is actionable (pending or acknowledged)
     */
    public function getIsActionableAttribute(): bool
    {
        return in_array($this->status, ['pending', 'acknowledged']);
    }

    /**
     * Check if alert is closed (resolved or dismissed)
     */
    public function getIsClosedAttribute(): bool
    {
        return in_array($this->status, ['resolved', 'dismissed']);
    }

    // ========================================
    // Business Logic Methods
    // ========================================

    /**
     * Check if alert is actionable (pending or acknowledged)
     * 
     * @return bool
     */
    public function isActionable(): bool
    {
        return in_array($this->status, ['pending', 'acknowledged']);
    }

    /**
     * Check if alert is critical (critical or out_of_stock severity)
     * 
     * @return bool
     */
    public function isCritical(): bool
    {
        return in_array($this->severity, ['critical', 'out_of_stock']);
    }

    /**
     * Check if alert is resolved
     * 
     * @return bool
     */
    public function isResolved(): bool
    {
        return $this->status === 'resolved';
    }

    /**
     * Calculate severity based on current stock and reorder point
     * 
     * @return string
     */
    public function calculateSeverity(): string
    {
        if ($this->current_stock == 0) {
            return 'out_of_stock';
        }
        
        if ($this->current_stock <= ($this->reorder_point / 2)) {
            return 'critical';
        }
        
        return 'low';
    }
}