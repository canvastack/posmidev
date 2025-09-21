<?php

namespace Src\Pms\Core\Domain\Repositories;

use Src\Pms\Core\Domain\Entities\StockAdjustment;

interface StockAdjustmentRepositoryInterface
{
    public function save(StockAdjustment $stockAdjustment): void;
    public function findByProduct(string $productId): array;
    public function findByTenant(string $tenantId): array;
}