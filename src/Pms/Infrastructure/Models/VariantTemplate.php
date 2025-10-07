<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class VariantTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    /**
     * Create a new factory instance for the model
     */
    protected static function newFactory()
    {
        return \Database\Factories\VariantTemplateFactory::new();
    }

    protected $fillable = [
        'id',
        'tenant_id',
        'name',
        'slug',
        'description',
        'category',
        'configuration',
        'is_system',
        'is_active',
        'is_featured',
        'thumbnail_path',
        'icon',
        'usage_count',
        'last_used_at',
        'estimated_variant_count',
        'tags',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'configuration' => 'array', // JSONB
        'tags' => 'array', // JSONB
        'is_system' => 'boolean',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'usage_count' => 'integer',
        'estimated_variant_count' => 'integer',
        'last_used_at' => 'datetime',
    ];

    protected $attributes = [
        'is_system' => false,
        'is_active' => true,
        'is_featured' => false,
        'usage_count' => 0,
        'estimated_variant_count' => 0,
    ];

    protected $appends = ['thumbnail_url'];

    // ========================================
    // Relationships
    // ========================================

    /**
     * Tenant relationship (can be null for system templates)
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    // ========================================
    // Query Scopes
    // ========================================

    /**
     * Scope to tenant (includes system templates)
     */
    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where(function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)
                ->orWhere('is_system', true);
        });
    }

    /**
     * Scope to active templates
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to featured templates
     */
    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope to system templates
     */
    public function scopeSystem(Builder $query): Builder
    {
        return $query->where('is_system', true);
    }

    /**
     * Scope to custom (non-system) templates
     */
    public function scopeCustom(Builder $query): Builder
    {
        return $query->where('is_system', false);
    }

    /**
     * Scope to category
     */
    public function scopeCategory(Builder $query, string $category): Builder
    {
        return $query->where('category', $category);
    }

    /**
     * Scope to search by name or description
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'ILIKE', "%{$search}%")
                ->orWhere('description', 'ILIKE', "%{$search}%")
                ->orWhereJsonContains('tags', $search);
        });
    }

    /**
     * Scope to popular templates (most used)
     */
    public function scopePopular(Builder $query, int $limit = 10): Builder
    {
        return $query->orderByDesc('usage_count')->limit($limit);
    }

    // ========================================
    // Accessors & Mutators
    // ========================================

    /**
     * Get full thumbnail URL
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if (!$this->thumbnail_path) {
            return null;
        }

        if (str_starts_with($this->thumbnail_path, 'http://') || str_starts_with($this->thumbnail_path, 'https://')) {
            return $this->thumbnail_path;
        }

        return asset('storage/' . $this->thumbnail_path);
    }

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
    // Configuration Helper Methods
    // ========================================

    /**
     * Get attributes from configuration
     */
    public function getConfigurationAttributes(): array
    {
        return $this->configuration['attributes'] ?? [];
    }

    /**
     * Get SKU pattern from configuration
     */
    public function getSkuPattern(): ?string
    {
        return $this->configuration['sku_pattern'] ?? null;
    }

    /**
     * Get price modifiers from configuration
     */
    public function getPriceModifiers(): array
    {
        return $this->configuration['price_modifiers'] ?? [];
    }

    /**
     * Get default values from configuration
     */
    public function getDefaultValues(): array
    {
        return $this->configuration['default_values'] ?? [];
    }

    /**
     * Set configuration attributes
     */
    public function setConfigurationAttributes(array $attributes): void
    {
        $config = $this->configuration ?? [];
        $config['attributes'] = $attributes;
        $this->configuration = $config;
    }

    /**
     * Set SKU pattern in configuration
     */
    public function setConfigurationSkuPattern(string $pattern): void
    {
        $config = $this->configuration ?? [];
        $config['sku_pattern'] = $pattern;
        $this->configuration = $config;
    }

    /**
     * Set price modifiers in configuration
     */
    public function setConfigurationPriceModifiers(array $modifiers): void
    {
        $config = $this->configuration ?? [];
        $config['price_modifiers'] = $modifiers;
        $this->configuration = $config;
    }

    /**
     * Set default values in configuration
     */
    public function setConfigurationDefaultValues(array $defaults): void
    {
        $config = $this->configuration ?? [];
        $config['default_values'] = $defaults;
        $this->configuration = $config;
    }

    /**
     * Calculate estimated variant count from configuration
     */
    public function calculateEstimatedVariantCount(): int
    {
        $attributes = $this->getConfigurationAttributes();
        
        if (empty($attributes)) {
            return 0;
        }

        $count = 1;
        foreach ($attributes as $attribute) {
            $values = $attribute['values'] ?? [];
            $count *= count($values);
        }

        return $count;
    }

    /**
     * Calculate total combinations (alias to estimated variant count)
     */
    public function calculateTotalCombinations(): int
    {
        // Keep lightweight by using the precomputed logic
        return $this->calculateEstimatedVariantCount();
    }

    /**
     * Update estimated variant count
     */
    public function updateEstimatedVariantCount(): void
    {
        $this->estimated_variant_count = $this->calculateEstimatedVariantCount();
        $this->save();
    }

    /**
     * Generate all variant combinations from template
     */
    public function generateVariantCombinations(): array
    {
        $attributes = $this->getConfigurationAttributes();
        
        if (empty($attributes)) {
            return [];
        }

        // Extract attribute names and values
        $attributeMap = [];
        foreach ($attributes as $attr) {
            $attributeMap[$attr['name']] = $attr['values'];
        }

        // Generate all combinations
        return $this->cartesianProduct($attributeMap);
    }

    /**
     * Calculate cartesian product of attributes
     */
    private function cartesianProduct(array $arrays): array
    {
        $result = [[]];
        
        foreach ($arrays as $key => $values) {
            $append = [];
            foreach ($result as $product) {
                foreach ($values as $value) {
                    $product[$key] = $value;
                    $append[] = $product;
                }
            }
            $result = $append;
        }
        
        return $result;
    }

    /**
     * Apply template to generate variant data array
     */
    public function applyToProduct(Product $product): array
    {
        $combinations = $this->generateVariantCombinations();
        $skuPattern = $this->getSkuPattern();
        $priceModifiers = $this->getPriceModifiers();
        $defaultValues = $this->getDefaultValues();

        $variants = [];

        foreach ($combinations as $combination) {
            // Generate SKU
            $sku = $this->generateSku($product, $combination, $skuPattern);

            // Calculate price with modifiers
            $priceModifier = 0;
            foreach ($combination as $attrName => $attrValue) {
                if (isset($priceModifiers[$attrName][$attrValue])) {
                    $priceModifier += $priceModifiers[$attrName][$attrValue];
                }
            }

            $variants[] = [
                'sku' => $sku,
                'name' => ProductVariant::generateNameFromAttributes($combination),
                'attributes' => $combination,
                'price' => $product->price + $priceModifier,
                'price_modifier' => $priceModifier,
                'cost_price' => $product->cost_price ?? null,
                'stock' => $defaultValues['stock'] ?? 0,
                'reorder_point' => $defaultValues['reorder_point'] ?? null,
                'reorder_quantity' => $defaultValues['reorder_quantity'] ?? null,
                'is_active' => true,
            ];
        }

        return $variants;
    }

    /**
     * Generate SKU from pattern
     */
    private function generateSku(Product $product, array $attributes, ?string $pattern): string
    {
        if (empty($pattern)) {
            // Default pattern: PRODUCT_SKU-VALUE1-VALUE2-...
            $attributeValues = array_values($attributes);
            return $product->sku . '-' . implode('-', array_map(fn($v) => Str::slug($v), $attributeValues));
        }

        // Replace placeholders in pattern
        $sku = str_replace('{PRODUCT}', $product->sku, $pattern);
        
        foreach ($attributes as $name => $value) {
            $placeholder = '{' . strtoupper(Str::slug($name, '_')) . '}';
            $sku = str_replace($placeholder, Str::slug($value), $sku);
        }

        return $sku;
    }

    /**
     * Mark template as used
     */
    public function markAsUsed(): void
    {
        $this->increment('usage_count');
        $this->update(['last_used_at' => now()]);
    }

    // ========================================
    // Static Helper Methods
    // ========================================

    /**
     * Get available categories
     */
    public static function getCategories(): array
    {
        return [
            'clothing' => 'Clothing & Apparel',
            'footwear' => 'Footwear',
            'electronics' => 'Electronics',
            'food_beverage' => 'Food & Beverage',
            'furniture' => 'Furniture',
            'accessories' => 'Accessories',
            'custom' => 'Custom',
        ];
    }

    /**
     * Get category display name
     */
    public function getCategoryDisplayName(): string
    {
        $categories = static::getCategories();
        return $categories[$this->category] ?? $this->category;
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

            // Calculate estimated variant count
            if ($model->estimated_variant_count === 0) {
                $model->estimated_variant_count = $model->calculateEstimatedVariantCount();
            }
        });

        // Prevent deletion of system templates
        static::deleting(function ($model) {
            if ($model->is_system) {
                throw new \Exception('System templates cannot be deleted');
            }
        });
    }
}