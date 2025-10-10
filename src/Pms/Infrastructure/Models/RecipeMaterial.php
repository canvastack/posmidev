<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class RecipeMaterial extends Model
{
    use HasFactory, HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $guarded = [];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'recipe_id' => 'string',
        'material_id' => 'string',
        'quantity_required' => 'float', // Changed from decimal to float for proper JS number handling
        'waste_percentage' => 'float', // Changed from decimal to float for proper JS number handling
    ];

    protected $appends = ['effective_quantity', 'total_cost', 'display_name'];

    // ========================================
    // Relationships
    // ========================================

    /**
     * Recipe material belongs to a tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Recipe material belongs to a recipe
     */
    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }

    /**
     * Recipe material belongs to a material
     */
    public function material(): BelongsTo
    {
        return $this->belongsTo(Material::class);
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
     * Scope query by recipe
     */
    public function scopeForRecipe(Builder $query, string $recipeId): Builder
    {
        return $query->where('recipe_id', $recipeId);
    }

    /**
     * Scope query by material
     */
    public function scopeForMaterial(Builder $query, string $materialId): Builder
    {
        return $query->where('material_id', $materialId);
    }

    // ========================================
    // Accessors & Attributes
    // ========================================

    /**
     * Calculate effective quantity including waste percentage
     * Formula: quantity_required * (1 + waste_percentage/100)
     * 
     * Example: 
     * - quantity_required = 100
     * - waste_percentage = 5
     * - effective_quantity = 100 * (1 + 5/100) = 100 * 1.05 = 105
     */
    public function getEffectiveQuantityAttribute(): float
    {
        $wasteMultiplier = 1 + ($this->waste_percentage / 100);
        return $this->quantity_required * $wasteMultiplier;
    }

    /**
     * Calculate total cost for this component
     * Formula: effective_quantity * material->unit_cost
     */
    public function getTotalCostAttribute(): float
    {
        if (!$this->material) {
            return 0;
        }

        return $this->effective_quantity * $this->material->unit_cost;
    }

    /**
     * Get cost per unit of recipe (proportional)
     */
    public function getCostPerRecipeUnitAttribute(): float
    {
        if (!$this->recipe || $this->recipe->yield_quantity <= 0) {
            return 0;
        }

        return $this->total_cost / $this->recipe->yield_quantity;
    }

    // ========================================
    // Business Logic Methods
    // ========================================

    /**
     * Check if sufficient material stock exists for this component
     */
    public function hasSufficientStock(int $recipeQuantity = 1): bool
    {
        if (!$this->material) {
            return false;
        }

        $requiredQuantity = $this->effective_quantity * $recipeQuantity;
        return $this->material->stock_quantity >= $requiredQuantity;
    }

    /**
     * Get shortage information
     */
    public function getShortageInfo(int $recipeQuantity = 1): array
    {
        if (!$this->material) {
            return [
                'has_shortage' => true,
                'required' => $this->effective_quantity * $recipeQuantity,
                'available' => 0,
                'shortage' => $this->effective_quantity * $recipeQuantity,
            ];
        }

        $required = $this->effective_quantity * $recipeQuantity;
        $available = $this->material->stock_quantity;
        $shortage = max(0, $required - $available);

        return [
            'has_shortage' => $shortage > 0,
            'required' => $required,
            'available' => $available,
            'shortage' => $shortage,
        ];
    }

    /**
     * Calculate maximum producible quantity based on this material alone
     */
    public function getMaxProducibleFromThisMaterial(): int
    {
        if (!$this->material || $this->effective_quantity <= 0) {
            return 0;
        }

        return (int) floor($this->material->stock_quantity / $this->effective_quantity);
    }

    /**
     * Get waste amount (absolute)
     */
    public function getWasteAmountAttribute(): float
    {
        return $this->quantity_required * ($this->waste_percentage / 100);
    }

    /**
     * Get display name for this recipe material
     */
    public function getDisplayNameAttribute(): string
    {
        $materialName = $this->material ? $this->material->name : 'Unknown Material';
        $unit = $this->material ? $this->material->unit : $this->unit;
        return "{$materialName} ({$this->quantity_required} {$unit})";
    }

    /**
     * Format for display in UI
     */
    public function toDisplayArray(): array
    {
        return [
            'id' => $this->id,
            'material_id' => $this->material_id,
            'material_name' => $this->material->name ?? 'Unknown',
            'material_unit' => $this->material->unit ?? '',
            'quantity_required' => $this->quantity_required,
            'waste_percentage' => $this->waste_percentage,
            'waste_amount' => $this->waste_amount,
            'effective_quantity' => $this->effective_quantity,
            'unit_cost' => $this->material->unit_cost ?? 0,
            'total_cost' => $this->total_cost,
            'available_stock' => $this->material->stock_quantity ?? 0,
            'max_producible' => $this->getMaxProducibleFromThisMaterial(),
            'notes' => $this->notes,
        ];
    }
}