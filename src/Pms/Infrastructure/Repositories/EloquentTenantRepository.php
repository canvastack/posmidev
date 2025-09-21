<?php

namespace Src\Pms\Infrastructure\Repositories;

use Src\Pms\Core\Domain\Entities\Tenant as TenantEntity;
use Src\Pms\Core\Domain\Repositories\TenantRepositoryInterface;
use Src\Pms\Infrastructure\Models\Tenant as TenantModel;

class EloquentTenantRepository implements TenantRepositoryInterface
{
    public function findById(string $id): ?TenantEntity
    {
        $model = TenantModel::find($id);
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function save(TenantEntity $tenant): void
    {
        TenantModel::updateOrCreate(
            ['id' => $tenant->getId()],
            [
                'name' => $tenant->getName(),
                'address' => $tenant->getAddress(),
                'phone' => $tenant->getPhone(),
                'logo' => $tenant->getLogo(),
            ]
        );
    }

    public function delete(string $id): void
    {
        TenantModel::destroy($id);
    }

    private function toDomainEntity(TenantModel $model): TenantEntity
    {
        return new TenantEntity(
            id: $model->id,
            name: $model->name,
            address: $model->address,
            phone: $model->phone,
            logo: $model->logo,
            createdAt: $model->created_at
        );
    }
}