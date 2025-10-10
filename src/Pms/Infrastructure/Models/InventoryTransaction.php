<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InventoryTransaction extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    // Disable updated_at since this is append-only log
    const UPDATED_AT = null;

    protected $guarded = [];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'material_id' => 'string',
        'user_id' => 'string',
        'quantity_before' => 'decimal:3',
        'quantity_change' => 'decimal:3',
        'quantity_after' => 'decimal:3',
        'created_at' => 'datetime',
    ];

    // ========================================
    // Relationships
    // ========================================

    /**
     * Transaction belongs to a tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Transaction belongs to a material
     */
    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
    }

    /**
     * Transaction belongs to a user (who performed the action)
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Polymorphic relation to reference entity
     * Can be Order, StockAdjustment, etc.
     */
    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    // ========================================
    // Query Scopes
    // ========================================

    /**
     * Scope query to specific tenant
     */
    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope query by material
     */
    public function scopeForMaterial(Builder $query, string $materialId): Builder
    {
        return $query->where('material_id', $materialId);
    }

    /**
     * Scope query by transaction type
     */
    public function scopeByType(Builder $query, string $type): Builder
    {
        return $query->where('transaction_type', $type);
    }

    /**
     * Scope query by reason
     */
    public function scopeByReason(Builder $query, string $reason): Builder
    {
        return $query->where('reason', $reason);
    }

    /**
     * Scope query by date range
     */
    public function scopeInDateRange(Builder $query, string $startDate, string $endDate): Builder
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope query for stock increases
     */
    public function scopeIncreases(Builder $query): Builder
    {
        return $query->where('quantity_change', '>', 0);
    }

    /**
     * Scope query for stock decreases
     */
    public function scopeDecreases(Builder $query): Builder
    {
        return $query->where('quantity_change', '<', 0);
    }

    /**
     * Order by most recent first
     */
    public function scopeRecent(Builder $query): Builder
    {
        return $query->orderBy('created_at', 'desc');
    }

    // ========================================
    // Accessors & Attributes
    // ========================================

    /**
     * Check if transaction increased stock
     */
    public function getIsIncreaseAttribute(): bool
    {
        return $this->quantity_change > 0;
    }

    /**
     * Check if transaction decreased stock
     */
    public function getIsDecreaseAttribute(): bool
    {
        return $this->quantity_change < 0;
    }

    /**
     * Get absolute quantity change
     */
    public function getAbsoluteChangeAttribute(): float
    {
        return abs($this->quantity_change);
    }

    /**
     * Get change direction: 'in', 'out', or 'neutral'
     */
    public function getDirectionAttribute(): string
    {
        if ($this->quantity_change > 0) {
            return 'in';
        } elseif ($this->quantity_change < 0) {
            return 'out';
        }
        return 'neutral';
    }

    /**
     * Get transaction type label for UI
     */
    public function getTypeLabel(): string
    {
        return match($this->transaction_type) {
            'adjustment' => 'Manual Adjustment',
            'deduction' => 'Stock Deduction',
            'restock' => 'Restock',
            default => ucfirst($this->transaction_type),
        };
    }

    /**
     * Get reason label for UI
     */
    public function getReasonLabel(): string
    {
        return match($this->reason) {
            'purchase' => 'Purchase',
            'waste' => 'Waste',
            'damage' => 'Damage',
            'count_adjustment' => 'Count Adjustment',
            'production' => 'Production',
            'sale' => 'Sale',
            'other' => 'Other',
            default => ucfirst($this->reason),
        };
    }

    // ========================================
    // Business Logic Methods
    // ========================================

    /**
     * Format for display in UI
     */
    public function toDisplayArray(): array
    {
        return [
            'id' => $this->id,
            'transaction_type' => $this->transaction_type,
            'type_label' => $this->getTypeLabel(),
            'reason' => $this->reason,
            'reason_label' => $this->getReasonLabel(),
            'quantity_before' => $this->quantity_before,
            'quantity_change' => $this->quantity_change,
            'absolute_change' => $this->absolute_change,
            'quantity_after' => $this->quantity_after,
            'direction' => $this->direction,
            'is_increase' => $this->is_increase,
            'is_decrease' => $this->is_decrease,
            'notes' => $this->notes,
            'user_name' => $this->user?->name ?? 'System',
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'created_at' => $this->created_at?->toISOString(),
            'created_at_human' => $this->created_at?->diffForHumans(),
        ];
    }

    /**
     * Get transaction summary for a material within date range
     */
    public static function getSummaryForMaterial(
        string $materialId,
        string $tenantId,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        $query = self::where('tenant_id', $tenantId)
            ->where('material_id', $materialId);

        if ($startDate && $endDate) {
            $query->whereBetween('created_at', [$startDate, $endDate]);
        }

        $transactions = $query->get();

        return [
            'total_transactions' => $transactions->count(),
            'total_increases' => $transactions->where('quantity_change', '>', 0)->sum('quantity_change'),
            'total_decreases' => abs($transactions->where('quantity_change', '<', 0)->sum('quantity_change')),
            'net_change' => $transactions->sum('quantity_change'),
            'by_type' => $transactions->groupBy('transaction_type')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'total_change' => $group->sum('quantity_change'),
                ];
            }),
            'by_reason' => $transactions->groupBy('reason')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'total_change' => $group->sum('quantity_change'),
                ];
            }),
        ];
    }
}