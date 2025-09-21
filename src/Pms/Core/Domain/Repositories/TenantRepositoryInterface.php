<?php

namespace Src\Pms\Core\Domain\Repositories;

use Src\Pms\Core\Domain\Entities\Tenant;

interface TenantRepositoryInterface
{
    public function findById(string $id): ?Tenant;
    public function save(Tenant $tenant): void;
    public function delete(string $id): void;
}