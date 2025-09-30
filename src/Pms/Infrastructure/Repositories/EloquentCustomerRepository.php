<?php

namespace Src\Pms\Infrastructure\Repositories;

use Src\Pms\Core\Domain\Entities\Customer as CustomerEntity;
use Src\Pms\Core\Domain\Repositories\CustomerRepositoryInterface;
use Src\Pms\Infrastructure\Models\Customer as CustomerModel;

class EloquentCustomerRepository implements CustomerRepositoryInterface
{
    public function findById(string $id): ?CustomerEntity
    {
        $model = CustomerModel::find($id);
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function findByIdAndTenant(string $id, string $tenantId): ?CustomerEntity
    {
        $model = CustomerModel::where('id', $id)
            ->where('tenant_id', $tenantId)
            ->first();
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function findByTenant(string $tenantId): array
    {
        $models = CustomerModel::where('tenant_id', $tenantId)->get();
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
    }

    public function findByTenantPaginated(string $tenantId, int $perPage = 15)
    {
        $models = CustomerModel::where('tenant_id', $tenantId)->paginate($perPage);
        $models->getCollection()->transform(fn($model) => $this->toDomainEntity($model));
        return $models;
    }

    public function findByEmail(string $email, string $tenantId): ?CustomerEntity
    {
        $model = CustomerModel::where('email', $email)
            ->where('tenant_id', $tenantId)
            ->first();
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function findByPhone(string $phone, string $tenantId): ?CustomerEntity
    {
        $model = CustomerModel::where('phone', $phone)
            ->where('tenant_id', $tenantId)
            ->first();
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function searchByName(string $name, string $tenantId): array
    {
        $models = CustomerModel::where('tenant_id', $tenantId)
            ->where('name', 'LIKE', "%{$name}%")
            ->get();
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
    }

    public function searchByNamePaginated(string $name, string $tenantId, int $perPage = 15)
    {
        $models = CustomerModel::where('tenant_id', $tenantId)
            ->where('name', 'LIKE', "%{$name}%")
            ->paginate($perPage);
        $models->getCollection()->transform(fn($model) => $this->toDomainEntity($model));
        return $models;
    }

    public function save(CustomerEntity $customer): void
    {
        CustomerModel::updateOrCreate(
            ['id' => $customer->getId()],
            [
                'tenant_id' => $customer->getTenantId(),
                'name' => $customer->getName(),
                'email' => $customer->getEmail(),
                'phone' => $customer->getPhone(),
                'address' => $customer->getAddress(),
                'tags' => $customer->getTags(),
            ]
        );
    }

    public function delete(string $id): void
    {
        CustomerModel::destroy($id);
    }

    private function toDomainEntity(CustomerModel $model): CustomerEntity
    {
        return new CustomerEntity(
            id: $model->id,
            tenantId: $model->tenant_id,
            name: $model->name,
            email: $model->email,
            phone: $model->phone,
            address: $model->address,
            createdAt: $model->created_at,
            updatedAt: $model->updated_at
        );
    }
}