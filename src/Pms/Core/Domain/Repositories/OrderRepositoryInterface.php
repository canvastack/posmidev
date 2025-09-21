<?php

namespace Src\Pms\Core\Domain\Repositories;

use Src\Pms\Core\Domain\Entities\Order;

interface OrderRepositoryInterface
{
    public function findById(string $id): ?Order;
    public function findByTenant(string $tenantId): array;
    public function save(Order $order): void;
    public function generateInvoiceNumber(string $tenantId): string;
    public function getTodaysSales(string $tenantId): array;
    public function getSalesReport(string $tenantId, \DateTimeInterface $from, \DateTimeInterface $to): array;
}