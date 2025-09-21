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

    public function findByTenant(string $tenantId): array
    {
        $models = ProductModel::where('tenant_id', $tenantId)->get();
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
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