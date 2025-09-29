<?php

namespace Src\Pms\Infrastructure\Repositories;

use Src\Pms\Core\Domain\Entities\Category as CategoryEntity;
use Src\Pms\Core\Domain\Repositories\CategoryRepositoryInterface;
use Src\Pms\Infrastructure\Models\Category as CategoryModel;

class EloquentCategoryRepository implements CategoryRepositoryInterface
{
    public function findById(string $id): ?CategoryEntity
    {
        $model = CategoryModel::find($id);
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function findByTenant(string $tenantId): array
    {
        $models = CategoryModel::where('tenant_id', $tenantId)->get();
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
    }

    public function findByTenantPaginated(string $tenantId, int $perPage = 15)
    {
        return CategoryModel::where('tenant_id', $tenantId)->paginate($perPage);
    }

    public function save(CategoryEntity $category): void
    {
        CategoryModel::updateOrCreate(
            ['id' => $category->getId()],
            [
                'tenant_id' => $category->getTenantId(),
                'name' => $category->getName(),
                'description' => $category->getDescription(),
            ]
        );
    }

    public function delete(string $id): void
    {
        CategoryModel::destroy($id);
    }

    private function toDomainEntity(CategoryModel $model): CategoryEntity
    {
        return new CategoryEntity(
            id: $model->id,
            tenantId: $model->tenant_id,
            name: $model->name,
            description: $model->description,
            createdAt: $model->created_at
        );
    }
}