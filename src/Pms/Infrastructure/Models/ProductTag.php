<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ProductTag extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'product_tags';

    protected $fillable = [
        'tenant_id',
        'name',
        'color',
    ];

    protected $casts = [
        'tenant_id' => 'string',
    ];

    protected $appends = ['usage_count'];

    /**
     * Get the tenant that owns the tag
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Get all products that have this tag
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(
            Product::class,
            'product_tag_pivot',
            'tag_id',
            'product_id',
            'id',
            'id'
        )
            ->wherePivot('tenant_id', $this->tenant_id);
    }

    /**
     * Scope a query to only include tags for a specific tenant
     */
    public function scopeForTenant($query, string $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Scope to get popular tags (most used)
     */
    public function scopePopular($query, int $limit = 10)
    {
        return $query->withCount('products')
            ->orderBy('products_count', 'desc')
            ->limit($limit);
    }

    /**
     * Get the usage count attribute
     */
    public function getUsageCountAttribute(): int
    {
        return $this->products()->count();
    }

    /**
     * Get a default color if not set
     */
    public function getColorAttribute($value): string
    {
        $defaultColors = [
            'blue', 'green', 'red', 'yellow', 'purple', 
            'pink', 'indigo', 'teal', 'orange', 'gray'
        ];

        return $value ?? $defaultColors[array_rand($defaultColors)];
    }
}