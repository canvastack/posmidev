<?php

namespace Src\Pms\Infrastructure\Repositories;

use Src\Pms\Core\Domain\Entities\Product as ProductEntity;
use Src\Pms\Core\Domain\Repositories\ProductRepositoryInterface;
use Src\Pms\Infrastructure\Models\Product as ProductModel;

class EloquentProductRepository implements ProductRepositoryInterface
{
    public function findById(string $id): ?ProductEntity
    {
        $model = ProductModel::find($id);
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function findByIdAndTenant(string $id, string $tenantId): ?ProductEntity
    {
        $model = ProductModel::where('id', $id)
            ->where('tenant_id', $tenantId)
            ->first();
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function findByTenant(string $tenantId): array
    {
        $models = ProductModel::where('tenant_id', $tenantId)->get();
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
    }

    public function findByTenantPaginated(
        string $tenantId, 
        int $perPage = 15, 
        ?string $search = null, 
        ?string $categoryId = null,
        ?string $sortBy = null,
        ?string $sortOrder = 'asc',
        ?string $stockFilter = null,
        ?float $minPrice = null,
        ?float $maxPrice = null,
        ?string $createdFrom = null,
        ?string $createdTo = null,
        ?string $updatedFrom = null,
        ?string $updatedTo = null,
        ?array $statuses = null,
        bool $includeArchived = false,
        bool $onlyArchived = false
    )
    {
        $query = ProductModel::where('tenant_id', $tenantId);

        // Phase 11: Archive filtering
        if ($onlyArchived) {
            $query->onlyTrashed();
        } elseif ($includeArchived) {
            $query->withTrashed();
        }
        // Default: exclude archived (soft-deleted) products

        // Apply search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ILIKE', "%{$search}%")
                  ->orWhere('sku', 'ILIKE', "%{$search}%")
                  ->orWhere('description', 'ILIKE', "%{$search}%");
            });
        }

        // Apply category filter
        if ($categoryId && $categoryId !== 'all') {
            $query->where('category_id', $categoryId);
        }

        // Apply stock filter
        if ($stockFilter) {
            switch ($stockFilter) {
                case 'in_stock':
                    $query->where('stock', '>', 10);
                    break;
                case 'low_stock':
                    $query->where('stock', '>', 0)->where('stock', '<=', 10);
                    break;
                case 'out_of_stock':
                    $query->where('stock', '<=', 0);
                    break;
            }
        }

        // Apply price range filter
        if ($minPrice !== null) {
            $query->where('price', '>=', $minPrice);
        }
        if ($maxPrice !== null) {
            $query->where('price', '<=', $maxPrice);
        }

        // Apply created date range filter
        if ($createdFrom) {
            $query->where('created_at', '>=', $createdFrom);
        }
        if ($createdTo) {
            $query->where('created_at', '<=', $createdTo . ' 23:59:59');
        }

        // Apply updated date range filter
        if ($updatedFrom) {
            $query->where('updated_at', '>=', $updatedFrom);
        }
        if ($updatedTo) {
            $query->where('updated_at', '<=', $updatedTo . ' 23:59:59');
        }

        // Apply status filter (multi-select)
        if ($statuses && is_array($statuses) && count($statuses) > 0) {
            $query->whereIn('status', $statuses);
        }

        // Apply sorting
        $allowedSortFields = ['name', 'sku', 'price', 'stock', 'created_at', 'updated_at'];
        $sortField = in_array($sortBy, $allowedSortFields) ? $sortBy : 'created_at';
        $sortDirection = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';
        
        $query->orderBy($sortField, $sortDirection);

        return $query->with('category')->paginate($perPage);
    }

    public function findBySku(string $sku, string $tenantId): ?ProductEntity
    {
        $model = ProductModel::where('sku', $sku)
            ->where('tenant_id', $tenantId)
            ->first();
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function save(ProductEntity $product): void
    {
        ProductModel::updateOrCreate(
            ['id' => $product->getId()],
            [
                'tenant_id' => $product->getTenantId(),
                'name' => $product->getName(),
                'sku' => $product->getSku(),
                'price' => $product->getPrice(),
                'stock' => $product->getStock(),
                'category_id' => $product->getCategoryId(),
                'description' => $product->getDescription(),
                'cost_price' => $product->getCostPrice(),
                'status' => $product->getStatus(),
            ]
        );
    }

    public function delete(string $id): void
    {
        ProductModel::destroy($id);
    }

    public function findLowStockProducts(string $tenantId, int $threshold = 10): array
    {
        $models = ProductModel::where('tenant_id', $tenantId)
            ->where('stock', '<=', $threshold)
            ->get();
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
    }

    private function toDomainEntity(ProductModel $model): ProductEntity
    {
        return new ProductEntity(
            id: $model->id,
            tenantId: $model->tenant_id,
            name: $model->name,
            sku: $model->sku,
            price: (float) $model->price,
            stock: $model->stock,
            categoryId: $model->category_id,
            description: $model->description,
            costPrice: $model->cost_price ? (float) $model->cost_price : null,
            createdAt: $model->created_at
        );
    }
}