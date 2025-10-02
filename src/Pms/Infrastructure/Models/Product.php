<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

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
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'category_id' => 'string',
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'stock' => 'integer',
        'status' => 'string',
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
}