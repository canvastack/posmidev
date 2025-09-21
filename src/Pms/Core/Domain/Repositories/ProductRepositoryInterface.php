<?php

namespace Src\Pms\Core\Domain\Repositories;

use Src\Pms\Core\Domain\Entities\Product;

interface ProductRepositoryInterface
{
    public function findById(string $id): ?Product;
    public function findByTenant(string $tenantId): array;
    public function findBySku(string $sku, string $tenantId): ?Product;
    public function save(Product $product): void;
    public function delete(string $id): void;
    public function findLowStockProducts(string $tenantId, int $threshold = 10): array;
}