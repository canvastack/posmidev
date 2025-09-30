<?php

namespace Src\Pms\Core\Domain\Repositories;

use Src\Pms\Core\Domain\Entities\Customer;

interface CustomerRepositoryInterface
{
    public function findById(string $id): ?Customer;
    public function findByIdAndTenant(string $id, string $tenantId): ?Customer;
    public function findByTenant(string $tenantId): array;
    public function findByTenantPaginated(string $tenantId, int $perPage = 15);
    public function findByEmail(string $email, string $tenantId): ?Customer;
    public function findByPhone(string $phone, string $tenantId): ?Customer;
    public function searchByName(string $name, string $tenantId): array;
    public function searchByNamePaginated(string $name, string $tenantId, int $perPage = 15);
    public function save(Customer $customer): void;
    public function delete(string $id): void;
}