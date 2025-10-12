<?php

namespace Src\Pms\Infrastructure\Repositories;

use Src\Pms\Core\Domain\Entities\Order as OrderEntity;
use Src\Pms\Core\Domain\Entities\OrderItem as OrderItemEntity;
use Src\Pms\Core\Domain\Repositories\OrderRepositoryInterface;
use Src\Pms\Infrastructure\Models\Order as OrderModel;
use Src\Pms\Infrastructure\Models\OrderItem as OrderItemModel;

class EloquentOrderRepository implements OrderRepositoryInterface
{
    public function findById(string $id): ?OrderEntity
    {
        $model = OrderModel::with('items')->find($id);
        return $model ? $this->toDomainEntity($model) : null;
    }

    public function findByTenant(string $tenantId): array
    {
        $models = OrderModel::with('items')
            ->where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc')
            ->get();
        return $models->map(fn($model) => $this->toDomainEntity($model))->toArray();
    }

    public function findByTenantPaginated(string $tenantId, int $perPage = 15)
    {
        return OrderModel::with('items')
            ->where('tenant_id', $tenantId)
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);
    }

    public function save(OrderEntity $order): void
    {
        $orderModel = OrderModel::updateOrCreate(
            ['id' => $order->getId()],
            [
                'tenant_id' => $order->getTenantId(),
                'user_id' => $order->getUserId(),
                'customer_id' => $order->getCustomerId(),
                'invoice_number' => $order->getInvoiceNumber(),
                'total_amount' => $order->getTotalAmount(),
                'payment_method' => $order->getPaymentMethod(),
                'amount_paid' => $order->getAmountPaid(),
                'change_amount' => $order->getChange(),
                'status' => 'paid', // Fixed: Analytics expects 'paid' status for completed transactions
            ]
        );

        // Save order items
        foreach ($order->getItems() as $item) {
            OrderItemModel::updateOrCreate(
                [
                    'order_id' => $order->getId(),
                    'product_id' => $item->getProductId()
                ],
                [
                    'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
                    'product_name' => $item->getProductName(),
                    'quantity' => $item->getQuantity(),
                    'price' => $item->getPrice(),
                    'subtotal' => $item->getSubtotal(),
                ]
            );
        }
    }

    public function generateInvoiceNumber(string $tenantId): string
    {
        $date = date('Ymd');
        $lastOrder = OrderModel::where('tenant_id', $tenantId)
            ->where('invoice_number', 'like', "INV-{$date}-%")
            ->orderBy('invoice_number', 'desc')
            ->first();

        if ($lastOrder) {
            $lastNumber = (int) substr($lastOrder->invoice_number, -4);
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return sprintf('INV-%s-%04d', $date, $newNumber);
    }

    public function getTodaysSales(string $tenantId): array
    {
        $today = date('Y-m-d');
        $models = OrderModel::with('items')
            ->where('tenant_id', $tenantId)
            ->whereDate('created_at', $today)
            ->get();

        return [
            'total_revenue' => $models->sum('total_amount'),
            'total_transactions' => $models->count(),
            'orders' => $models->map(fn($model) => $this->toDomainEntity($model))->toArray()
        ];
    }

    public function getSalesReport(string $tenantId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        $models = OrderModel::with('items')
            ->where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$from, $to])
            ->get();

        return [
            'total_revenue' => $models->sum('total_amount'),
            'total_transactions' => $models->count(),
            'orders' => $models->map(fn($model) => $this->toDomainEntity($model))->toArray()
        ];
    }

    private function toDomainEntity(OrderModel $model): OrderEntity
    {
        $order = new OrderEntity(
            id: $model->id,
            tenantId: $model->tenant_id,
            invoiceNumber: $model->invoice_number,
            paymentMethod: $model->payment_method,
            amountPaid: (float) $model->amount_paid,
            customerId: $model->customer_id,
            userId: $model->user_id,
            createdAt: $model->created_at
        );

        foreach ($model->items as $itemModel) {
            $orderItem = new OrderItemEntity(
                productId: $itemModel->product_id,
                productName: $itemModel->product_name,
                quantity: $itemModel->quantity,
                price: (float) $itemModel->price
            );
            $order->addItem($orderItem);
        }

        return $order;
    }
}