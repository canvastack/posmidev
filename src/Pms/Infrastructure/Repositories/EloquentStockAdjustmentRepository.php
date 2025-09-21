<?php

namespace Src\Pms\Infrastructure\Repositories;

use Src\Pms\Core\Domain\Entities\StockAdjustment as StockAdjustmentEntity;
use Src\Pms\Core\Domain\Repositories\StockAdjustmentRepositoryInterface;
use Src\Pms\Infrastructure\Models\StockAdjustment as StockAdjustmentModel;

class EloquentStockAdjustmentRepository implements StockAdjustmentRepositoryInterface
{
    public function save(StockAdjustmentEntity $stockAdjustment): void
    {
        StockAdjustmentModel::create([
            'id' => $stockAdjustment->getId(),
            'product_id' => $stockAdjustment->getProductId(),
            'user_id' => $stockAdjustment->getUserId(),
            'quantity' => $stockAdjustment->getQuantity(),
            'reason' => $stockAdjustment->getReason(),
            'notes' => $stockAdjustment->getNotes(),
        ]);
    }

    public function findByProduct(string $productId): array
    {
        $models = StockAdjustmentModel::where('product_id', $productId)
            ->orderBy('created_at', 'desc')
            ->get();
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
    }

    public function findByTenant(string $tenantId): array
    {
        $models = StockAdjustmentModel::whereHas('product', function($query) use ($tenantId) {
            $query->where('tenant_id', $tenantId);
        })->orderBy('created_at', 'desc')->get();
        
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
    }

    private function toDomainEntity(StockAdjustmentModel $model): StockAdjustmentEntity
    {
        return new StockAdjustmentEntity(
            id: $model->id,
            productId: $model->product_id,
            userId: $model->user_id,
            quantity: $model->quantity,
            reason: $model->reason,
            notes: $model->notes,
            createdAt: $model->created_at
        );
    }
}