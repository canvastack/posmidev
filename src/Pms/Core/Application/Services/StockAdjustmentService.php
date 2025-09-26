<?php

namespace Src\Pms\Core\Application\Services;

use Src\Pms\Core\Domain\Contracts\TransactionManagerInterface;
use Src\Pms\Core\Domain\Entities\StockAdjustment;
use Src\Pms\Core\Domain\Repositories\StockAdjustmentRepositoryInterface;
use Src\Pms\Core\Domain\Repositories\ProductRepositoryInterface;

class StockAdjustmentService
{
    public function __construct(
        private StockAdjustmentRepositoryInterface $stockAdjustmentRepository,
        private ProductRepositoryInterface $productRepository,
        private TransactionManagerInterface $tx
    ) {}

    public function createStockAdjustment(
        string $productId,
        int $quantity,
        string $reason,
        ?string $notes = null,
        ?string $userId = null
    ): StockAdjustment {
        return $this->tx->run(function () use ($productId, $quantity, $reason, $notes, $userId) {
            $product = $this->productRepository->findById($productId);
            if (!$product) {
                throw new \InvalidArgumentException('Product not found');
            }

            // Adjust product stock (atomic)
            $product->adjustStock($quantity);
            $this->productRepository->save($product);

            // Create stock adjustment record
            $stockAdjustment = new StockAdjustment(
                id: \Ramsey\Uuid\Uuid::uuid4()->toString(),
                productId: $productId,
                userId: $userId,
                quantity: $quantity,
                reason: $reason,
                notes: $notes,
                createdAt: new \DateTime()
            );

            $this->stockAdjustmentRepository->save($stockAdjustment);
            return $stockAdjustment;
        });
    }

    public function getStockAdjustmentsByProduct(string $productId): array
    {
        return $this->stockAdjustmentRepository->findByProduct($productId);
    }

    public function getStockAdjustmentsByTenant(string $tenantId): array
    {
        return $this->stockAdjustmentRepository->findByTenant($tenantId);
    }
}