<?php

namespace Src\Pms\Core\Services;

use Src\Pms\Infrastructure\Models\Category;
use Src\Pms\Infrastructure\Models\Product;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class CategoryService
{
    /**
     * Get all categories for a tenant (flat list)
     */
    public function getAll(string $tenantId): array
    {
        $categories = Category::where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get();

        return $categories->map(function ($category) {
            return [
                'id' => $category->id,
                'tenant_id' => $category->tenant_id,
                'parent_id' => $category->parent_id,
                'name' => $category->name,
                'description' => $category->description,
                'full_path' => $category->full_path,
                'depth' => $category->depth,
                'created_at' => $category->created_at,
                'updated_at' => $category->updated_at,
            ];
        })->toArray();
    }

    /**
     * Get hierarchical tree of categories
     */
    public function getTree(string $tenantId): array
    {
        return Category::buildTree($tenantId);
    }

    /**
     * Get flat list with indentation (for dropdowns)
     */
    public function getFlatWithIndentation(string $tenantId): array
    {
        return Category::getFlatWithIndentation($tenantId);
    }

    /**
     * Get a single category by ID
     */
    public function getById(string $tenantId, string $categoryId): ?Category
    {
        return Category::where('tenant_id', $tenantId)
            ->where('id', $categoryId)
            ->first();
    }

    /**
     * Create a new category
     */
    public function create(string $tenantId, array $data): Category
    {
        // Validate parent exists if provided
        if (!empty($data['parent_id'])) {
            $parent = Category::where('tenant_id', $tenantId)
                ->where('id', $data['parent_id'])
                ->first();

            if (!$parent) {
                throw new \InvalidArgumentException('Parent category not found or does not belong to this tenant');
            }
        }

        $category = Category::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            'parent_id' => $data['parent_id'] ?? null,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
        ]);

        return $category->fresh();
    }

    /**
     * Update a category
     */
    public function update(string $tenantId, string $categoryId, array $data): Category
    {
        $category = $this->getById($tenantId, $categoryId);

        if (!$category) {
            throw new \InvalidArgumentException('Category not found');
        }

        // Validate parent exists if provided and not self
        if (!empty($data['parent_id'])) {
            if ($data['parent_id'] === $categoryId) {
                throw new \InvalidArgumentException('Category cannot be its own parent');
            }

            $parent = Category::where('tenant_id', $tenantId)
                ->where('id', $data['parent_id'])
                ->first();

            if (!$parent) {
                throw new \InvalidArgumentException('Parent category not found or does not belong to this tenant');
            }

            // Check for circular reference (parent cannot be a descendant)
            $descendants = $category->descendants();
            if ($descendants->contains('id', $data['parent_id'])) {
                throw new \InvalidArgumentException('Cannot set parent to a descendant category (circular reference)');
            }
        }

        $category->update([
            'parent_id' => $data['parent_id'] ?? $category->parent_id,
            'name' => $data['name'] ?? $category->name,
            'description' => $data['description'] ?? $category->description,
        ]);

        return $category->fresh();
    }

    /**
     * Delete a category
     * 
     * @param bool $deleteChildren If true, delete all children. If false, throw error if has children.
     */
    public function delete(string $tenantId, string $categoryId, bool $deleteChildren = false): bool
    {
        $category = $this->getById($tenantId, $categoryId);

        if (!$category) {
            throw new \InvalidArgumentException('Category not found');
        }

        // Check if has children
        $childrenCount = $category->children()->count();
        
        if ($childrenCount > 0 && !$deleteChildren) {
            throw new \InvalidArgumentException("Cannot delete category with {$childrenCount} child categories. Delete children first or use deleteChildren=true");
        }

        // Delete the category (cascade will handle children if deleteChildren=true)
        return $category->delete();
    }

    /**
     * Attach categories to a product
     * 
     * @param string $tenantId
     * @param string $productId
     * @param array $categoryIds Array of category IDs
     * @param string|null $primaryCategoryId Which category should be primary (for backward compatibility)
     */
    public function attachToProduct(string $tenantId, string $productId, array $categoryIds, ?string $primaryCategoryId = null): void
    {
        $product = Product::where('tenant_id', $tenantId)
            ->where('id', $productId)
            ->first();

        if (!$product) {
            throw new \InvalidArgumentException('Product not found');
        }

        // Validate all categories belong to this tenant
        $validCategories = Category::where('tenant_id', $tenantId)
            ->whereIn('id', $categoryIds)
            ->pluck('id')
            ->toArray();

        if (count($validCategories) !== count($categoryIds)) {
            throw new \InvalidArgumentException('One or more categories do not exist or do not belong to this tenant');
        }

        // Determine primary category
        if ($primaryCategoryId && !in_array($primaryCategoryId, $categoryIds)) {
            throw new \InvalidArgumentException('Primary category must be one of the selected categories');
        }

        // If no primary specified, use first one
        if (!$primaryCategoryId && count($categoryIds) > 0) {
            $primaryCategoryId = $categoryIds[0];
        }

        // Prepare sync data with is_primary flag
        $syncData = [];
        foreach ($categoryIds as $categoryId) {
            $syncData[$categoryId] = ['is_primary' => ($categoryId === $primaryCategoryId)];
        }

        // Sync categories (will remove old ones and add new ones)
        $product->categories()->sync($syncData);

        // Update product.category_id for backward compatibility
        $product->update(['category_id' => $primaryCategoryId]);
    }

    /**
     * Sync product categories (similar to attachToProduct but more explicit)
     */
    public function syncProductCategories(string $tenantId, string $productId, array $categoryIds, ?string $primaryCategoryId = null): void
    {
        $this->attachToProduct($tenantId, $productId, $categoryIds, $primaryCategoryId);
    }

    /**
     * Get all products in a category (including subcategories if recursive)
     */
    public function getProducts(string $tenantId, string $categoryId, bool $includeSubcategories = false): array
    {
        $category = $this->getById($tenantId, $categoryId);

        if (!$category) {
            throw new \InvalidArgumentException('Category not found');
        }

        if ($includeSubcategories) {
            // Get category + all descendants
            $categoryIds = $category->descendants()->pluck('id')->toArray();
            $categoryIds[] = $categoryId;

            return Product::where('tenant_id', $tenantId)
                ->whereHas('categories', function ($query) use ($categoryIds) {
                    $query->whereIn('categories.id', $categoryIds);
                })
                ->get()
                ->toArray();
        } else {
            return $category->products()
                ->where('tenant_id', $tenantId)
                ->get()
                ->toArray();
        }
    }

    /**
     * Get category statistics
     */
    public function getStatistics(string $tenantId, string $categoryId): array
    {
        $category = $this->getById($tenantId, $categoryId);

        if (!$category) {
            throw new \InvalidArgumentException('Category not found');
        }

        return [
            'id' => $category->id,
            'name' => $category->name,
            'full_path' => $category->full_path,
            'depth' => $category->depth,
            'children_count' => $category->children()->count(),
            'products_count' => $category->products()->count(),
            'descendants_count' => $category->descendants()->count(),
            'total_products_including_subcategories' => Product::where('tenant_id', $tenantId)
                ->whereHas('categories', function ($query) use ($category, $categoryId) {
                    $descendantIds = $category->descendants()->pluck('id')->toArray();
                    $descendantIds[] = $categoryId;
                    $query->whereIn('categories.id', $descendantIds);
                })
                ->count(),
        ];
    }
}