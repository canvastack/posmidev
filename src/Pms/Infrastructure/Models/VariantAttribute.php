<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class VariantAttribute extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Create a new factory instance for the model
     */
    protected static function newFactory()
    {
        return \Database\Factories\VariantAttributeFactory::new();
    }

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'slug',
        'description',
        'values',
        'display_type',
        'sort_order',
        'is_active',
        'price_modifiers',
        'visual_settings',
        'usage_count',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'values' => 'array', // JSONB array of possible values
        'price_modifiers' => 'array', // JSONB object mapping values to price modifiers
        'visual_settings' => 'array', // JSONB object for colors, swatches, etc.
        'sort_order' => 'integer',
        'is_active' => 'boolean',
        'usage_count' => 'integer',
    ];

    protected $attributes = [
        'display_type' => 'select',
        'sort_order' => 0,
        'is_active' => true,
        'usage_count' => 0,
    ];

    // ========================================
    // Relationships
    // ========================================

    /**
     * Tenant relationship
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // ========================================
    // Query Scopes
    // ========================================

    /**
     * Scope to tenant
     */
    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope to active attributes
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to search by name
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        $driver = $query->getConnection()->getDriverName();
        $operator = $driver === 'pgsql' ? 'ILIKE' : 'LIKE';
        
        return $query->where(function ($q) use ($search, $operator) {
            $q->where('name', $operator, "%{$search}%")
                ->orWhere('description', $operator, "%{$search}%");
        });
    }

    /**
     * Scope to order by sort order then name
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    // ========================================
    // Accessors & Mutators
    // ========================================

    /**
     * Auto-generate slug from name if not provided
     */
    public function setSlugAttribute(?string $value): void
    {
        if (empty($value) && !empty($this->name)) {
            $this->attributes['slug'] = Str::slug($this->name);
        } else {
            $this->attributes['slug'] = $value ? Str::slug($value) : null;
        }
    }

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Add a value to the attribute
     */
    public function addValue(string $value): bool
    {
        $values = $this->values ?? [];
        
        if (in_array($value, $values)) {
            return false; // Value already exists
        }

        $values[] = $value;
        $this->values = $values;
        $this->save();

        return true;
    }

    /**
     * Remove a value from the attribute
     */
    public function removeValue(string $value): bool
    {
        $values = $this->values ?? [];
        
        $index = array_search($value, $values);
        if ($index === false) {
            return false; // Value doesn't exist
        }

        unset($values[$index]);
        $this->values = array_values($values); // Re-index array
        $this->save();

        return true;
    }

    /**
     * Update a value
     */
    public function updateValue(string $oldValue, string $newValue): bool
    {
        $values = $this->values ?? [];
        
        $index = array_search($oldValue, $values);
        if ($index === false) {
            return false;
        }

        $values[$index] = $newValue;
        $this->values = $values;
        $this->save();

        return true;
    }

    /**
     * Check if attribute has a specific value
     */
    public function hasValue(string $value): bool
    {
        $values = $this->values ?? [];
        return in_array($value, $values);
    }

    /**
     * Get price modifier for a specific value
     */
    public function getPriceModifier(string $value): float
    {
        $modifiers = $this->price_modifiers ?? [];
        return (float) ($modifiers[$value] ?? 0);
    }

    /**
     * Set price modifier for a value
     */
    public function setPriceModifier(string $value, float $modifier): void
    {
        $modifiers = $this->price_modifiers ?? [];
        $modifiers[$value] = $modifier;
        $this->price_modifiers = $modifiers;
        $this->save();
    }

    /**
     * Get visual setting for a value (e.g., color hex)
     */
    public function getVisualSetting(string $value, ?string $key = null): mixed
    {
        $settings = $this->visual_settings ?? [];
        
        if (!isset($settings[$value])) {
            return null;
        }

        if ($key === null) {
            return $settings[$value];
        }

        return $settings[$value][$key] ?? null;
    }

    /**
     * Set visual setting for a value
     */
    public function setVisualSetting(string $value, mixed $setting): void
    {
        $settings = $this->visual_settings ?? [];
        $settings[$value] = $setting;
        $this->visual_settings = $settings;
        $this->save();
    }

    /**
     * Calculate total possible combinations with another attribute
     */
    public function getCombinationCount(?VariantAttribute $otherAttribute = null): int
    {
        $thisCount = count($this->values ?? []);

        if ($otherAttribute === null) {
            return $thisCount;
        }

        $otherCount = count($otherAttribute->values ?? []);
        return $thisCount * $otherCount;
    }

    /**
     * Get all values with their price modifiers
     */
    public function getValuesWithModifiers(): array
    {
        $values = $this->values ?? [];
        $modifiers = $this->price_modifiers ?? [];

        return array_map(function ($value) use ($modifiers) {
            return [
                'value' => $value,
                'price_modifier' => $modifiers[$value] ?? 0,
            ];
        }, $values);
    }

    /**
     * Get all values with their visual settings
     */
    public function getValuesWithVisuals(): array
    {
        $values = $this->values ?? [];
        $visuals = $this->visual_settings ?? [];

        return array_map(function ($value) use ($visuals) {
            return [
                'value' => $value,
                'visual' => $visuals[$value] ?? null,
            ];
        }, $values);
    }

    /**
     * Increment usage count
     */
    public function incrementUsage(): void
    {
        $this->increment('usage_count');
    }

    /**
     * Decrement usage count
     */
    public function decrementUsage(): void
    {
        if ($this->usage_count > 0) {
            $this->decrement('usage_count');
        }
    }

    // ========================================
    // Static Helper Methods
    // ========================================

    /**
     * Get popular attributes (most used)
     */
    public static function getPopular(string $tenantId, int $limit = 10): \Illuminate\Support\Collection
    {
        return static::forTenant($tenantId)
            ->active()
            ->orderByDesc('usage_count')
            ->limit($limit)
            ->get();
    }

    /**
     * Get available display types
     */
    public static function getDisplayTypes(): array
    {
        return [
            'select' => 'Dropdown Select',
            'radio' => 'Radio Buttons',
            'button' => 'Button Group',
            'swatch' => 'Color/Image Swatches',
        ];
    }

    // ========================================
    // Model Events
    // ========================================

    /**
     * Boot the model
     */
    protected static function boot()
    {
        parent::boot();

        // Auto-generate UUID if not provided
        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) Str::uuid();
            }

            // Auto-generate slug if not provided
            if (empty($model->slug) && !empty($model->name)) {
                $model->slug = Str::slug($model->name);
            }
        });

        // Auto-update slug on name change
        static::updating(function ($model) {
            if ($model->isDirty('name') && empty($model->slug)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }
}