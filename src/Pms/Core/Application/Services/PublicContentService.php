<?php

namespace Src\Pms\Core\Application\Services;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Src\Pms\Infrastructure\Models\Product; // Using Eloquent model here for read-only query efficiency
use Src\Pms\Infrastructure\Models\ContentPage;

class PublicContentService
{
    /**
     * Return paginated published products for a tenant.
     * Optional filters: q (search by name/description), minStock (default 0), limit (1..100)
     */
    public function getPublishedProducts(string $tenantId, array $params = []): LengthAwarePaginator
    {
        $limit = isset($params['limit']) ? (int) $params['limit'] : 12;
        $limit = max(1, min($limit, 100));
        $q = $params['q'] ?? null;
        $minStock = isset($params['minStock']) ? (int) $params['minStock'] : 1; // default hide out-of-stock

        $query = Product::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'published')
            ->where('stock', '>=', $minStock)
            ->select(['id', 'name', 'description', 'price', 'stock', 'category_id', 'image_path', 'thumbnail_path']);

        if ($q) {
            $query->where(function ($sub) use ($q) {
                $sub->where('name', 'like', "%$q%")
                    ->orWhere('description', 'like', "%$q%");
            });
        }

        return $query->orderBy('name')->paginate($limit);
    }

    /**
     * Return single published product by id for a tenant; throws 404 if not found or not published.
     */
    public function getPublishedProduct(string $tenantId, string $productId)
    {
        return Product::query()
            ->where('tenant_id', $tenantId)
            ->where('status', 'published')
            ->where('id', $productId)
            ->firstOrFail(['id', 'name', 'description', 'price', 'stock', 'category_id', 'image_path', 'thumbnail_path']);
    }

    /**
     * Return published content page by slug for a tenant; throws 404 if not found or not published.
     */
    public function getPublishedPage(string $tenantId, string $slug)
    {
        return ContentPage::query()
            ->where('tenant_id', $tenantId)
            ->where('slug', $slug)
            ->published()
            ->firstOrFail(['id', 'slug', 'title', 'content', 'published_at']);
    }

    /**
     * Return all published content pages for a tenant.
     */
    public function getAllPublishedPages(string $tenantId)
    {
        return ContentPage::query()
            ->where('tenant_id', $tenantId)
            ->published()
            ->select(['id', 'slug', 'title', 'published_at'])
            ->orderBy('published_at', 'desc')
            ->get();
    }
}