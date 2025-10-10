<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Material extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $guarded = [];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'stock_quantity' => 'float', // Changed from decimal to float for proper JS number handling
        'reorder_level' => 'float',  // Changed from decimal to float for proper JS number handling
        'unit_cost' => 'float',      // Changed from decimal to float for proper JS number handling
        'deleted_at' => 'datetime',
    ];

    protected $appends = ['is_low_stock'];

    // ========================================
    // Relationships
    // ========================================

    /**
     * Material belongs to a tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Material has many recipe materials (usage in recipes)
     */
    public function recipeMaterials(): HasMany
    {
        return $this->hasMany(RecipeMaterial::class);
    }

    /**
     * Material has many inventory transactions
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(InventoryTransaction::class, 'material_id')->orderBy('created_at', 'desc');
    }

    /**
     * Material has many inventory transactions (alias for transactions)
     */
    public function inventoryTransactions(): HasMany
    {
        return $this->transactions();
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
     * Scope query to low stock materials
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('stock_quantity', '<', 'reorder_level');
    }

    /**
     * Scope query by category
     */
    public function scopeByCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Scope query by unit
     */
    public function scopeByUnit(Builder $query, string $unit): Builder
    {
        return $query->where('unit', $unit);
    }

    // ========================================
    // Accessors & Attributes
    // ========================================

    /**
     * Check if material is below reorder level
     */
    public function getIsLowStockAttribute(): bool
    {
        return $this->stock_quantity < $this->reorder_level;
    }

    // ========================================
    // Business Logic Methods
    // ========================================

    /**
     * Adjust stock quantity and create transaction record
     * 
     * @param string $type - 'adjustment', 'deduction', 'restock'
     * @param float $quantity - Positive for increase, negative for decrease
     * @param string $reason - purchase, waste, damage, count_adjustment, production, sale, other
     * @param string|null $notes
     * @param User|null $user
     * @return InventoryTransaction
     */
    public function adjustStock(
        string $type,
        float $quantity,
        string $reason,
        ?string $notes = null,
        ?User $user = null
    ): InventoryTransaction {
        return DB::transaction(function () use ($type, $quantity, $reason, $notes, $user) {
            $quantityBefore = $this->stock_quantity;
            
            // Determine quantity change based on type
            $quantityChange = match($type) {
                'restock' => abs($quantity),
                'deduction' => -abs($quantity),
                'adjustment' => $quantity, // Can be positive or negative
                default => throw new \InvalidArgumentException("Invalid transaction type: {$type}")
            };

            // Update stock
            $this->stock_quantity += $quantityChange;
            
            // Prevent negative stock
            if ($this->stock_quantity < 0) {
                throw new \RuntimeException("Insufficient stock. Available: {$quantityBefore}, Requested: " . abs($quantityChange));
            }

            $this->save();

            // Create transaction record
            return $this->transactions()->create([
                'id' => \Illuminate\Support\Str::uuid(),
                'tenant_id' => $this->tenant_id,
                'material_id' => $this->id,
                'transaction_type' => $type,
                'quantity_before' => $quantityBefore,
                'quantity_change' => $quantityChange,
                'quantity_after' => $this->stock_quantity,
                'reason' => $reason,
                'notes' => $notes,
                'user_id' => $user?->id,
            ]);
        });
    }

    /**
     * Check if material can be deleted
     * Cannot delete if used in any active recipes
     */
    public function canBeDeleted(): bool
    {
        // Check if material is used in any active recipes
        $usedInActiveRecipes = $this->recipeMaterials()
            ->whereHas('recipe', function (Builder $query) {
                $query->where('is_active', true);
            })
            ->exists();

        return !$usedInActiveRecipes;
    }

    /**
     * Get list of active recipes using this material
     */
    public function getActiveRecipesUsingMaterial()
    {
        return Recipe::whereHas('recipeMaterials', function (Builder $query) {
            $query->where('material_id', $this->id);
        })
            ->where('is_active', true)
            ->where('tenant_id', $this->tenant_id)
            ->get(['id', 'name']);
    }

    /**
     * Get total quantity required by all active recipes
     */
    public function getTotalQuantityRequiredByActiveRecipes(): float
    {
        return $this->recipeMaterials()
            ->whereHas('recipe', function (Builder $query) {
                $query->where('is_active', true);
            })
            ->sum('quantity_required');
    }

    /**
     * Check if sufficient stock for given quantity
     */
    public function hasSufficientStock(float $quantity): bool
    {
        return $this->stock_quantity >= $quantity;
    }

    /**
     * Get stock status for UI
     * Returns: normal, low, critical, out_of_stock
     */
    public function getStockStatusAttribute(): string
    {
        if ($this->stock_quantity <= 0) {
            return 'out_of_stock';
        }
        
        if ($this->stock_quantity <= ($this->reorder_level * 0.5)) {
            return 'critical';
        }
        
        if ($this->is_low_stock) {
            return 'low';
        }
        
        return 'normal';
    }
}