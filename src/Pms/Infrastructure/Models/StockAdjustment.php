<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Stock Adjustment Model
 * 
 * Tracks all stock adjustments (increases, decreases, corrections)
 * 
 * 🔒 CORE IMMUTABLE RULES ENFORCED:
 * - UUID primary key
 * - tenant_id scoping (global scope)
 * - All queries automatically filtered by tenant_id
 * - Strictly tenant-scoped data access
 * 
 * @property string $id
 * @property string $tenant_id
 * @property string $product_id
 * @property string|null $user_id
 * @property int $quantity
 * @property string|null $reason
 * @property string|null $notes
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class StockAdjustment extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'product_id',
        'user_id',
        'quantity',
        'reason',
        'notes',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'product_id' => 'string',
        'user_id' => 'string',
        'quantity' => 'integer',
    ];

    /**
     * 🔒 IMMUTABLE RULE: All queries must be tenant-scoped
     * Global scope ensures no cross-tenant data access
     */
    protected static function booted()
    {
        static::addGlobalScope('tenant', function ($query) {
            if (auth()->check()) {
                $query->where('tenant_id', auth()->user()->tenant_id);
            }
        });

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
     * Get the tenant that owns the adjustment
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // ========================================
    // Accessors (for API consistency)
    // ========================================

    public function getTenantId(): string
    {
        return $this->tenant_id;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getProductId(): string
    {
        return $this->product_id;
    }

    public function getUserId(): ?string
    {
        return $this->user_id;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function getReason(): ?string
    {
        return $this->reason;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function getCreatedAt(): ?\Carbon\Carbon
    {
        return $this->created_at;
    }
}