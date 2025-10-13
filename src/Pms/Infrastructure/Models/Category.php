<?php

namespace Src\Pms\Infrastructure\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Category extends Model
{
    use HasFactory;

    protected $keyType = 'string';
    public $incrementing = false;

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    protected $fillable = [
        'id',
        'tenant_id',
        'parent_id',
        'name',
        'description',
    ];

    protected $casts = [
        'id' => 'string',
        'tenant_id' => 'string',
        'parent_id' => 'string',
    ];

    protected $appends = ['full_path', 'depth'];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Legacy relationship - single category per product
     * @deprecated Use products() many-to-many instead
     */
    public function productsLegacy(): HasMany
    {
        return $this->hasMany(Product::class, 'category_id');
    }

    /**
     * Products relationship (many-to-many via pivot)
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'category_product')
            ->withPivot('is_primary')
            ->withTimestamps();
    }

    /**
     * Parent category relationship (hierarchical)
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    /**
     * Child categories relationship (hierarchical)
     */
    public function children(): HasMany
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    /**
     * Get ancestors (parent, grandparent, etc.)
     */
    public function ancestors()
    {
        $ancestors = collect();
        $category = $this;
        
        while ($category->parent) {
            $ancestors->prepend($category->parent);
            $category = $category->parent;
        }
        
        return $ancestors;
    }

    /**
     * Get descendants (children, grandchildren, etc.) - recursive
     */
    public function descendants()
    {
        $descendants = collect();
        
        foreach ($this->children as $child) {
            $descendants->push($child);
            $descendants = $descendants->merge($child->descendants());
        }
        
        return $descendants;
    }

    /**
     * Get full path accessor (e.g., "Electronics > Phones > Smartphones")
     */
    public function getFullPathAttribute(): string
    {
        $path = $this->ancestors()->pluck('name')->toArray();
        $path[] = $this->name;
        
        return implode(' > ', $path);
    }

    /**
     * Get depth level accessor
     */
    public function getDepthAttribute(): int
    {
        return $this->ancestors()->count();
    }

    /**
     * Scope: Get root categories only (parent_id is null)
     */
    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Scope: Get categories with children count
     */
    public function scopeWithChildrenCount(Builder $query): Builder
    {
        return $query->withCount('children');
    }

    /**
     * Scope: Build hierarchical tree (for dropdowns)
     */
    public static function buildTree(string $tenantId, ?string $parentId = null): array
    {
        $categories = self::where('tenant_id', $tenantId)
            ->where('parent_id', $parentId)
            ->orderBy('name')
            ->get();
        
        $tree = [];
        
        foreach ($categories as $category) {
            $tree[] = [
                'id' => $category->id,
                'name' => $category->name,
                'full_path' => $category->full_path,
                'depth' => $category->depth,
                'children' => self::buildTree($tenantId, $category->id),
            ];
        }
        
        return $tree;
    }

    /**
     * Get flat list with indentation for UI dropdowns
     */
    public static function getFlatWithIndentation(string $tenantId): array
    {
        $categories = self::where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get();
        
        $result = [];
        
        foreach ($categories as $category) {
            $result[] = [
                'id' => $category->id,
                'name' => $category->name,
                'full_path' => $category->full_path,
                'depth' => $category->depth,
                'parent_id' => $category->parent_id,
                'tenant_id' => $category->tenant_id,
                'description' => $category->description,
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at,
            ];
        }
        
        // Sort by full_path for hierarchical display
        usort($result, function($a, $b) {
            return strcmp($a['full_path'], $b['full_path']);
        });
        
        return $result;
    }
}