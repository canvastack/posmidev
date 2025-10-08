<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

/**
 * ProductImage Model
 * 
 * Phase 7: Multi-Image Gallery
 * Manages multiple images per product with sorting and primary selection
 * 
 * @property string $id UUID primary key
 * @property string $tenant_id Tenant UUID (for multi-tenancy)
 * @property string $product_id Product UUID
 * @property string $image_url Full image URL
 * @property string|null $thumbnail_url Thumbnail URL (200x200)
 * @property bool $is_primary Primary image flag
 * @property int $sort_order Display order (0-based)
 */
class ProductImage extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'tenant_id',
        'product_id',
        'image_url',
        'thumbnail_url',
        'is_primary',
        'sort_order',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'product_id' => 'string',
        'is_primary' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $hidden = ['created_at', 'updated_at'];

    /**
     * Boot method to auto-generate UUID
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    /**
     * Relationship: Product
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Relationship: Tenant
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Scope: Filter by tenant
     */
    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope: Filter by product
     */
    public function scopeForProduct(Builder $query, string $productId): Builder
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Scope: Order by sort_order
     */
    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order', 'asc');
    }

    /**
     * Scope: Get primary image only
     */
    public function scopePrimary(Builder $query): Builder
    {
        return $query->where('is_primary', true);
    }

    /**
     * Get full image URL attribute (accessor)
     */
    public function getFullImageUrlAttribute(): string
    {
        if (str_starts_with($this->image_url, 'http://') || str_starts_with($this->image_url, 'https://')) {
            return $this->image_url;
        }

        return asset('storage/' . $this->image_url);
    }

    /**
     * Get full thumbnail URL attribute (accessor)
     */
    public function getFullThumbnailUrlAttribute(): ?string
    {
        if (!$this->thumbnail_url) {
            return $this->full_image_url;
        }

        if (str_starts_with($this->thumbnail_url, 'http://') || str_starts_with($this->thumbnail_url, 'https://')) {
            return $this->thumbnail_url;
        }

        return asset('storage/' . $this->thumbnail_url);
    }
}