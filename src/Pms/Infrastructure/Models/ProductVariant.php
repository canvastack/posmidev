<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class ProductVariant extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'product_id',
        'sku',
        'name',
        'attributes',
        'price',
        'cost_price',
        'price_modifier',
        'stock',
        'reserved_stock',
        'reorder_point',
        'reorder_quantity',
        'low_stock_alert_enabled',
        'image_path',
        'thumbnail_path',
        'barcode',
        'is_active',
        'is_default',
        'sort_order',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'product_id' => 'string',
        'attributes' => 'array', // JSONB
        'metadata' => 'array', // JSONB
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'price_modifier' => 'decimal:2',
        'stock' => 'integer',
        'reserved_stock' => 'integer',
        'reorder_point' => 'integer',
        'reorder_quantity' => 'integer',
        'low_stock_alert_enabled' => 'boolean',
        'is_active' => 'boolean',
        'is_default' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $appends = ['image_url', 'thumbnail_url', 'available_stock', 'display_name'];

    // ========================================
    // Relationships
    // ========================================

    /**
     * Parent product relationship
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Tenant relationship
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Order items relationship
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Analytics relationship
     */
    public function analytics(): HasMany
    {
        return $this->hasMany(VariantAnalytics::class);
    }

    // ========================================
    // Accessors & Mutators
    // ========================================

    /**
     * Get available stock (stock - reserved)
     */
    public function getAvailableStockAttribute(): int
    {
        return max(0, $this->stock - $this->reserved_stock);
    }

    /**
     * Get display name (combines variant name or attributes)
     */
    public function getDisplayNameAttribute(): string
    {
        if ($this->name) {
            return $this->name;
        }

        if (empty($this->attributes)) {
            return 'Default Variant';
        }

        // Generate name from attributes: "Red - Large - Cotton"
        return implode(' - ', array_values($this->attributes));
    }

    /**
     * Get full image URL
     */
    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            // Fallback to parent product image
            return $this->product?->image_url;
        }

        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
            return $this->image_path;
        }

        return asset('storage/' . $this->image_path);
    }

    /**
     * Get full thumbnail URL
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if (!$this->thumbnail_path) {
            // Fallback to main image, then parent product
            return $this->image_url;
        }

        if (str_starts_with($this->thumbnail_path, 'http://') || str_starts_with($this->thumbnail_path, 'https://')) {
            return $this->thumbnail_path;
        }

        return asset('storage/' . $this->thumbnail_path);
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
     * Scope to product
     */
    public function scopeForProduct(Builder $query, string $productId): Builder
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope to active variants
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to default variant
     */
    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope to low stock variants
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->where('low_stock_alert_enabled', true)
            ->whereColumn('stock', '<=', 'reorder_point');
    }

    /**
     * Scope to out of stock variants
     */
    public function scopeOutOfStock(Builder $query): Builder
    {
        return $query->where('stock', '<=', 0);
    }

    /**
     * Scope to variants with specific attribute
     * Example: ->withAttribute('color', 'Red')
     */
    public function scopeWithAttribute(Builder $query, string $key, mixed $value): Builder
    {
        return $query->whereJsonContains('attributes->' . $key, $value);
    }

    /**
     * Scope to variants with any of the given attributes
     * Example: ->withAttributes(['color' => 'Red', 'size' => 'L'])
     */
    public function scopeWithAttributes(Builder $query, array $attributes): Builder
    {
        foreach ($attributes as $key => $value) {
            $query->whereJsonContains('attributes->' . $key, $value);
        }
        return $query;
    }

    /**
     * Scope to search variants by SKU, name, or attributes
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where(function ($q) use ($search) {
            $q->where('sku', 'ILIKE', "%{$search}%")
                ->orWhere('name', 'ILIKE', "%{$search}%")
                ->orWhereRaw("attributes::text ILIKE ?", ["%{$search}%"]);
        });
    }

    // ========================================
    // Stock Management Methods
    // ========================================

    /**
     * Check if variant is low stock
     */
    public function isLowStock(): bool
    {
        return $this->low_stock_alert_enabled 
            && $this->reorder_point > 0
            && $this->stock <= $this->reorder_point;
    }

    /**
     * Check if variant is critically low (50% of reorder point)
     */
    public function isCriticalStock(): bool
    {
        return $this->low_stock_alert_enabled 
            && $this->reorder_point > 0
            && $this->stock <= ($this->reorder_point / 2);
    }

    /**
     * Check if variant is out of stock
     */
    public function isOutOfStock(): bool
    {
        return $this->stock <= 0;
    }

    /**
     * Get stock status
     */
    public function getStockStatus(): string
    {
        if ($this->isOutOfStock()) {
            return 'out_of_stock';
        }
        
        if ($this->isCriticalStock()) {
            return 'critical';
        }
        
        if ($this->isLowStock()) {
            return 'low';
        }
        
        return 'normal';
    }

    /**
     * Reserve stock for order
     */
    public function reserveStock(int $quantity): bool
    {
        if ($this->available_stock < $quantity) {
            return false;
        }

        $this->increment('reserved_stock', $quantity);
        return true;
    }

    /**
     * Release reserved stock
     */
    public function releaseStock(int $quantity): void
    {
        $this->decrement('reserved_stock', min($quantity, $this->reserved_stock));
    }

    /**
     * Reduce actual stock (after order completion)
     */
    public function reduceStock(int $quantity): bool
    {
        if ($this->stock < $quantity) {
            return false;
        }

        $this->decrement('stock', $quantity);
        
        // Also reduce reserved stock if applicable
        if ($this->reserved_stock >= $quantity) {
            $this->decrement('reserved_stock', $quantity);
        }

        return true;
    }

    /**
     * Add stock
     */
    public function addStock(int $quantity): void
    {
        $this->increment('stock', $quantity);
    }

    // ========================================
    // Helper Methods
    // ========================================

    /**
     * Get profit margin
     */
    public function getProfitMargin(): float
    {
        if (!$this->cost_price || $this->cost_price == 0) {
            return 0;
        }

        return (($this->price - $this->cost_price) / $this->price) * 100;
    }

    /**
     * Get attribute value by key
     */
    public function getAttribute(string $key): mixed
    {
        return $this->attributes[$key] ?? null;
    }

    /**
     * Set attribute value
     */
    public function setAttribute(string $key, mixed $value): void
    {
        $attributes = $this->attributes ?? [];
        $attributes[$key] = $value;
        $this->attributes = $attributes;
    }

    /**
     * Generate variant name from attributes
     */
    public static function generateNameFromAttributes(array $attributes): string
    {
        return implode(' - ', array_values($attributes));
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
                $model->id = (string) \Illuminate\Support\Str::uuid();
            }
        });

        // Update parent product variant count on create
        static::created(function ($model) {
            $model->product->increment('variant_count');
            $model->product->update(['has_variants' => true]);
        });

        // Update parent product variant count on delete
        static::deleted(function ($model) {
            $product = $model->product;
            $product->decrement('variant_count');
            
            // If no more variants, update has_variants flag
            if ($product->variant_count <= 0) {
                $product->update(['has_variants' => false, 'variant_count' => 0]);
            }
        });
    }

    // ========================================
    // Activity Log Configuration
    // ========================================

    /**
     * Configure activity log options
     */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'sku',
                'name',
                'attributes',
                'price',
                'cost_price',
                'stock',
                'is_active',
                'is_default',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Product variant {$eventName}")
            ->useLogName('product_variant');
    }

    /**
     * Tap into the activity being logged
     */
    public function tapActivity(\Spatie\Activitylog\Contracts\Activity $activity, string $eventName)
    {
        $activity->tenant_id = $this->tenant_id;
    }
}