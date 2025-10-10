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
use Illuminate\Support\Facades\Schema;

class Recipe extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $guarded = [];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'product_id' => 'string',
        'yield_quantity' => 'float', // Changed from decimal to float for proper JS number handling
        'is_active' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    // ========================================
    // Relationships
    // ========================================

    /**
     * Recipe belongs to a tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Recipe belongs to a product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Recipe has many recipe materials (components)
     */
    public function recipeMaterials(): HasMany
    {
        return $this->hasMany(RecipeMaterial::class);
    }

    /**
     * Alias for better readability
     */
    public function components(): HasMany
    {
        return $this->recipeMaterials();
    }

    /**
     * Recipe materials with eager loaded material details
     */
    public function materialsWithDetails(): HasMany
    {
        return $this->hasMany(RecipeMaterial::class)->with('material');
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
     * Scope query to active recipes
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope query by product
     */
    public function scopeForProduct(Builder $query, string $productId): Builder
    {
        return $query->where('product_id', $productId);
    }

    // ========================================
    // Business Logic Methods
    // ========================================

    /**
     * Activate this recipe and deactivate others for the same product
     * Ensures only one active recipe per product per tenant
     */
    public function activate(): bool
    {
        return DB::transaction(function () {
            // Deactivate all other recipes for this product in the same tenant
            Recipe::where('product_id', $this->product_id)
                ->where('tenant_id', $this->tenant_id)
                ->where('id', '!=', $this->id)
                ->update(['is_active' => false]);

            // Activate this recipe
            $this->is_active = true;
            $this->save();

            // Update product's active_recipe_id if column exists
            if ($this->product && Schema::hasColumn('products', 'active_recipe_id')) {
                $this->product->active_recipe_id = $this->id;
                $this->product->save();
            }

            return true;
        });
    }

    /**
     * Deactivate this recipe
     */
    public function deactivate(): bool
    {
        $this->is_active = false;
        $this->save();

        // Clear product's active_recipe_id if this was the active recipe
        if ($this->product && 
            Schema::hasColumn('products', 'active_recipe_id') && 
            $this->product->active_recipe_id === $this->id) {
            $this->product->active_recipe_id = null;
            $this->product->save();
        }

        return true;
    }

    /**
     * Calculate total cost of all materials in this recipe
     * Includes waste percentage
     */
    public function calculateTotalCost(): float
    {
        return $this->recipeMaterials()
            ->with('material')
            ->get()
            ->sum(function (RecipeMaterial $component) {
                return $component->total_cost;
            });
    }

    /**
     * Get cost per unit of finished product
     */
    public function getCostPerUnitAttribute(): float
    {
        if ($this->yield_quantity <= 0) {
            return 0;
        }

        return $this->calculateTotalCost() / $this->yield_quantity;
    }

    /**
     * Check if recipe can be deleted
     * Cannot delete if active
     */
    public function canBeDeleted(): bool
    {
        return !$this->is_active;
    }

    /**
     * Calculate maximum producible quantity based on current material stock
     * 
     * @return array{
     *   can_produce: bool,
     *   max_quantity: int,
     *   limiting_material: ?array,
     *   all_materials_availability: array
     * }
     */
    public function calculateMaxProducibleQuantity(): array
    {
        $components = $this->materialsWithDetails;

        // Debug logging untuk memvalidasi asumsi
        \Log::info('🔍 Recipe Debug - calculateMaxProducibleQuantity', [
            'recipe_id' => $this->id,
            'recipe_name' => $this->name,
            'components_count' => $components->count(),
            'components' => $components->map(function ($component) {
                return [
                    'material_id' => $component->material_id,
                    'material_name' => $component->material->name ?? 'Unknown',
                    'quantity_required' => $component->quantity_required,
                    'waste_percentage' => $component->waste_percentage,
                    'effective_quantity' => $component->effective_quantity,
                    'material_stock' => $component->material->stock_quantity ?? 0,
                ];
            })->toArray(),
            'timestamp' => now()->toISOString()
        ]);

        if ($components->isEmpty()) {
            return [
                'can_produce' => false,
                'max_quantity' => 0,
                'limiting_material' => null,
                'all_materials_availability' => [],
                'message' => 'No materials defined in recipe'
            ];
        }

        $maxProducible = PHP_INT_MAX;
        $limitingMaterial = null;
        $materialsAvailability = [];

        foreach ($components as $component) {
            $material = $component->material;
            $effectiveQty = $component->effective_quantity;

            if ($effectiveQty <= 0) {
                continue;
            }

            // Calculate how many batches can be made from this material
            $maxFromThisMaterial = floor($material->stock_quantity / $effectiveQty);

            $materialsAvailability[] = [
                'material_id' => $material->id,
                'material_name' => $material->name,
                'material_unit' => $material->unit,
                'required_quantity' => $component->quantity_required,
                'waste_percentage' => $component->waste_percentage,
                'effective_quantity' => $effectiveQty,
                'available_stock' => $material->stock_quantity,
                'sufficient' => $material->stock_quantity >= $effectiveQty,
                'max_producible' => $maxFromThisMaterial,
            ];

            // Track the limiting material (bottleneck)
            if ($maxFromThisMaterial < $maxProducible) {
                $maxProducible = $maxFromThisMaterial;
                $limitingMaterial = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'required_per_unit' => $effectiveQty,
                    'available_stock' => $material->stock_quantity,
                    'max_units' => $maxFromThisMaterial,
                ];
            }
        }

        $maxProducible = max(0, $maxProducible === PHP_INT_MAX ? 0 : $maxProducible);

        \Log::info('🔍 Recipe Debug - Final Calculation', [
            'recipe_id' => $this->id,
            'max_producible' => $maxProducible,
            'limiting_material' => $limitingMaterial,
            'timestamp' => now()->toISOString()
        ]);

        return [
            'can_produce' => $maxProducible > 0,
            'max_quantity' => (int) $maxProducible,
            'limiting_material' => $limitingMaterial,
            'all_materials_availability' => $materialsAvailability,
        ];
    }

    /**
     * Check if sufficient materials exist to produce given quantity
     */
    public function checkSufficiency(int $quantity): array
    {
        $components = $this->materialsWithDetails;
        $insufficient = [];
        $sufficient = true;

        foreach ($components as $component) {
            $material = $component->material;
            $requiredQty = $component->effective_quantity * $quantity;
            $isSufficient = $material->stock_quantity >= $requiredQty;

            if (!$isSufficient) {
                $sufficient = false;
                $insufficient[] = [
                    'material_id' => $material->id,
                    'material_name' => $material->name,
                    'required_quantity' => $requiredQty,
                    'available_quantity' => $material->stock_quantity,
                    'shortage' => $requiredQty - $material->stock_quantity,
                ];
            }
        }

        return [
            'sufficient' => $sufficient,
            'can_produce' => $sufficient,
            'requested_quantity' => $quantity,
            'insufficient_materials' => $insufficient,
        ];
    }

    /**
     * Deduct materials for production
     * Should be called when a product using this recipe is sold
     */
    public function deductMaterialsForProduction(
        int $quantity,
        ?User $user = null,
        ?string $referenceType = null,
        ?string $referenceId = null
    ): array {
        // First check sufficiency
        $sufficiency = $this->checkSufficiency($quantity);
        
        if (!$sufficiency['sufficient']) {
            throw new \RuntimeException('Insufficient materials for production');
        }

        return DB::transaction(function () use ($quantity, $user, $referenceType, $referenceId) {
            $transactions = [];

            foreach ($this->materialsWithDetails as $component) {
                $material = $component->material;
                $requiredQty = $component->effective_quantity * $quantity;

                // Deduct stock
                $transaction = $material->adjustStock(
                    type: 'deduction',
                    quantity: $requiredQty,
                    reason: 'production',
                    notes: "Production deduction for recipe: {$this->name} (Qty: {$quantity})",
                    user: $user
                );

                // Update reference if provided
                if ($referenceType && $referenceId) {
                    $transaction->reference_type = $referenceType;
                    $transaction->reference_id = $referenceId;
                    $transaction->save();
                }

                $transactions[] = $transaction;
            }

            return [
                'success' => true,
                'transactions' => $transactions,
                'produced_quantity' => $quantity,
            ];
        });
    }
}