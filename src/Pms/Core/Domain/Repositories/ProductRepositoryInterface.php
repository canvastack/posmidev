<?php

namespace Src\Pms\Core\Domain\Repositories;

use Src\Pms\Core\Domain\Entities\Product;

interface ProductRepositoryInterface
{
    public function findById(string $id): ?Product;
    public function findByIdAndTenant(string $id, string $tenantId): ?Product;
    public function findByTenant(string $tenantId): array;
    public function findByTenantPaginated(
        string $tenantId, 
        int $perPage = 15, 
        ?string $search = null, 
        ?string $categoryId = null,
        ?string $sortBy = null,
        ?string $sortOrder = 'asc',
        ?string $stockFilter = null,
        ?float $minPrice = null,
        ?float $maxPrice = null
    );
    public function findBySku(string $sku, string $tenantId): ?Product;
    public function save(Product $product): void;
    public function delete(string $id): void;
    public function findLowStockProducts(string $tenantId, int $threshold = 10): array;
}