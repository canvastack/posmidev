<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Product extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'category_id',
        'name',
        'sku',
        'description',
        'price',
        'cost_price',
        'stock',
        'status',
        'image_path',
        'thumbnail_path',
        // Phase 5: Stock Management fields
        'reorder_point',
        'reorder_quantity',
        'low_stock_alert_enabled',
        'last_alerted_at',
        // Phase 6: Product Variants fields
        'has_variants',
        'variant_count',
        'manage_stock_by_variant',
        // Phase 9: Additional Business Features
        'supplier_id',
        'uom',
        'tax_rate',
        'tax_inclusive',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'category_id' => 'string',
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'stock' => 'integer',
        'status' => 'string',
        // Phase 5: Stock Management casts
        'reorder_point' => 'integer',
        'reorder_quantity' => 'integer',
        'low_stock_alert_enabled' => 'boolean',
        'last_alerted_at' => 'datetime',
        // Phase 6: Product Variants casts
        'has_variants' => 'boolean',
        'variant_count' => 'integer',
        'manage_stock_by_variant' => 'boolean',
        // Phase 9: Additional Business Features casts
        'supplier_id' => 'string',
        'tax_rate' => 'decimal:2',
        'tax_inclusive' => 'boolean',
    ];

    protected $appends = ['image_url', 'thumbnail_url'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stockAdjustments(): HasMany
    {
        return $this->hasMany(StockAdjustment::class);
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Get the full image URL accessor
     */
    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }

        // If it's already a full URL, return as is
        if (str_starts_with($this->image_path, 'http://') || str_starts_with($this->image_path, 'https://')) {
            return $this->image_path;
        }

        // Otherwise, generate storage URL
        return asset('storage/' . $this->image_path);
    }

    /**
     * Get the full thumbnail URL accessor
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if (!$this->thumbnail_path) {
            return $this->image_url; // Fallback to main image
        }

        // If it's already a full URL, return as is
        if (str_starts_with($this->thumbnail_path, 'http://') || str_starts_with($this->thumbnail_path, 'https://')) {
            return $this->thumbnail_path;
        }

        // Otherwise, generate storage URL
        return asset('storage/' . $this->thumbnail_path);
    }

    /**
     * Price history tracking relationship
     */
    public function priceHistory(): HasMany
    {
        return $this->hasMany(ProductPriceHistory::class);
    }

    /**
     * Stock history tracking relationship
     */
    public function stockHistory(): HasMany
    {
        return $this->hasMany(ProductStockHistory::class);
    }

    /**
     * Stock alerts relationship (Phase 5)
     */
    public function stockAlerts(): HasMany
    {
        return $this->hasMany(StockAlert::class);
    }

    /**
     * Product variants relationship (Phase 6)
     */
    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /**
     * Active variants only (Phase 6)
     */
    public function activeVariants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('is_active', true);
    }

    /**
     * Default variant (Phase 6)
     */
    public function defaultVariant(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('is_default', true);
    }

    /**
     * Product images relationship (Phase 7: Multi-Image Gallery)
     */
    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order', 'asc');
    }

    /**
     * Primary image only (Phase 7)
     */
    public function primaryImage(): HasMany
    {
        return $this->hasMany(ProductImage::class)->where('is_primary', true);
    }

    /**
     * Product supplier relationship (Phase 9)
     */
    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class, 'supplier_id', 'id');
    }

    /**
     * Product tags relationship (Phase 9)
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(
            ProductTag::class,
            'product_tag_pivot',
            'product_id',
            'tag_id',
            'id',
            'id'
        )
            ->wherePivot('tenant_id', $this->tenant_id);
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
     * Scope query to active products
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope query to low stock products
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->where('low_stock_alert_enabled', true)
            ->whereColumn('stock', '<=', 'reorder_point');
    }

    /**
     * Scope query to out of stock products
     */
    public function scopeOutOfStock(Builder $query): Builder
    {
        return $query->where('stock', '<=', 0);
    }

    // ========================================
    // Phase 5: Stock Management Helper Methods
    // ========================================

    /**
     * Check if product is below reorder point
     * 
     * @return bool
     */
    public function isLowStock(): bool
    {
        return $this->low_stock_alert_enabled 
            && $this->stock <= $this->reorder_point;
    }

    /**
     * Check if product is critically low (50% of reorder point)
     * 
     * @return bool
     */
    public function isCriticalStock(): bool
    {
        return $this->low_stock_alert_enabled 
            && $this->reorder_point > 0
            && $this->stock <= ($this->reorder_point / 2);
    }

    /**
     * Check if product is out of stock
     * 
     * @return bool
     */
    public function isOutOfStock(): bool
    {
        return $this->stock <= 0;
    }

    /**
     * Get stock status badge for UI
     * Returns: normal, low, critical, out_of_stock
     * 
     * @return string
     */
    public function getStockStatusAttribute(): string
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
     * Get stock status color for UI
     * Returns: green, yellow, orange, red
     * 
     * @return string
     */
    public function getStockStatusColorAttribute(): string
    {
        return match($this->stock_status) {
            'normal' => 'green',
            'low' => 'yellow',
            'critical' => 'orange',
            'out_of_stock' => 'red',
            default => 'gray',
        };
    }

    /**
     * Get recommended order quantity based on reorder settings
     * 
     * @return int
     */
    public function getRecommendedOrderQuantityAttribute(): int
    {
        if ($this->isLowStock() && $this->reorder_quantity > 0) {
            return $this->reorder_quantity;
        }
        
        return 0;
    }

    /**
     * Get stock percentage based on reorder point
     * Useful for progress bars and visual indicators
     * 
     * @return float
     */
    public function getStockPercentageAttribute(): float
    {
        if ($this->reorder_point <= 0) {
            return 100.0;
        }

        $percentage = ($this->stock / $this->reorder_point) * 100;
        return min(100.0, max(0.0, $percentage));
    }

    /**
     * Check if product needs reordering
     * 
     * @return bool
     */
    public function needsReorder(): bool
    {
        return $this->isLowStock() && $this->reorder_quantity > 0;
    }

    // ========================================
    // Phase 6: Product Variants Helper Methods
    // ========================================

    /**
     * Get total stock across all variants
     * 
     * @return int
     */
    public function getTotalVariantStock(): int
    {
        if (!$this->has_variants) {
            return $this->stock;
        }

        return $this->variants()->sum('stock');
    }

    /**
     * Get total available stock across all variants (stock - reserved)
     * 
     * @return int
     */
    public function getTotalAvailableVariantStock(): int
    {
        if (!$this->has_variants) {
            return $this->stock;
        }

        return $this->variants()->get()->sum(function ($variant) {
            return $variant->available_stock;
        });
    }

    /**
     * Check if product has any low stock variants
     * 
     * @return bool
     */
    public function hasLowStockVariants(): bool
    {
        if (!$this->has_variants) {
            return $this->isLowStock();
        }

        return $this->variants()->lowStock()->exists();
    }

    /**
     * Check if product has any out of stock variants
     * 
     * @return bool
     */
    public function hasOutOfStockVariants(): bool
    {
        if (!$this->has_variants) {
            return $this->isOutOfStock();
        }

        return $this->variants()->outOfStock()->exists();
    }

    /**
     * Get the effective stock (product stock if no variants, else sum of variant stock)
     * 
     * @return int
     */
    public function getEffectiveStock(): int
    {
        if ($this->manage_stock_by_variant && $this->has_variants) {
            return $this->getTotalVariantStock();
        }

        return $this->stock;
    }

    /**
     * Get severity level for stock alerts
     * 
     * @return string
     */
    public function getStockAlertSeverity(): string
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

    // ========================================
    // Phase 9: Tax Calculation Helper Methods
    // ========================================

    /**
     * Get price without tax
     * 
     * @return float
     */
    public function getPriceWithoutTaxAttribute(): float
    {
        if (!$this->tax_rate || $this->tax_rate <= 0) {
            return (float) $this->price;
        }

        if ($this->tax_inclusive) {
            // Price is inclusive, calculate base price
            return (float) ($this->price / (1 + ($this->tax_rate / 100)));
        }

        // Price is already without tax
        return (float) $this->price;
    }

    /**
     * Get price with tax
     * 
     * @return float
     */
    public function getPriceWithTaxAttribute(): float
    {
        if (!$this->tax_rate || $this->tax_rate <= 0) {
            return (float) $this->price;
        }

        if ($this->tax_inclusive) {
            // Price already includes tax
            return (float) $this->price;
        }

        // Add tax to price
        return (float) ($this->price * (1 + ($this->tax_rate / 100)));
    }

    /**
     * Get tax amount
     * 
     * @return float
     */
    public function getTaxAmountAttribute(): float
    {
        if (!$this->tax_rate || $this->tax_rate <= 0) {
            return 0.0;
        }

        return (float) ($this->price_with_tax - $this->price_without_tax);
    }

    /**
     * Calculate tax for a given quantity
     * 
     * @param int $quantity
     * @return float
     */
    public function calculateTax(int $quantity = 1): float
    {
        return (float) ($this->tax_amount * $quantity);
    }

    /**
     * Calculate total with tax for a given quantity
     * 
     * @param int $quantity
     * @return float
     */
    public function calculateTotalWithTax(int $quantity = 1): float
    {
        return (float) ($this->price_with_tax * $quantity);
    }

    /**
     * Get formatted UOM display
     * 
     * @return string
     */
    public function getFormattedUomAttribute(): string
    {
        return $this->uom ?? 'pcs';
    }

    /**
     * Get stock with UOM label
     * 
     * @return string
     */
    public function getStockWithUomAttribute(): string
    {
        return $this->stock . ' ' . $this->formatted_uom;
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
                'name',
                'sku',
                'description',
                'price',
                'cost_price',
                'stock',
                'status',
                'category_id',
                'image_path',
                // Phase 5: Log stock management fields
                'reorder_point',
                'reorder_quantity',
                'low_stock_alert_enabled',
                // Phase 6: Log variant fields
                'has_variants',
                'variant_count',
                'manage_stock_by_variant',
                // Phase 9: Log business feature fields
                'supplier_id',
                'uom',
                'tax_rate',
                'tax_inclusive',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn(string $eventName) => "Product {$eventName}")
            ->useLogName('product');
    }

    /**
     * Tap into the activity being logged
     */
    public function tapActivity(\Spatie\Activitylog\Contracts\Activity $activity, string $eventName)
    {
        $activity->tenant_id = $this->tenant_id;
    }
}