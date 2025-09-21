<?php

namespace Src\Pms\Core\Domain\Repositories;

use Src\Pms\Core\Domain\Entities\Category;

interface CategoryRepositoryInterface
{
    public function findById(string $id): ?Category;
    public function findByTenant(string $tenantId): array;
    public function save(Category $category): void;
    public function delete(string $id): void;
}