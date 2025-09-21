<?php

namespace Src\Pms\Core\Application\Services;

use Src\Pms\Core\Domain\Entities\Order;
use Src\Pms\Core\Domain\Entities\OrderItem;
use Src\Pms\Core\Domain\Repositories\OrderRepositoryInterface;
use Src\Pms\Core\Domain\Repositories\ProductRepositoryInterface;

class OrderService
{
    public function __construct(
        private OrderRepositoryInterface $orderRepository,
        private ProductRepositoryInterface $productRepository
    ) {}

    public function createOrder(
        string $tenantId,
        array $items,
        string $paymentMethod,
        float $amountPaid,
        ?string $customerId = null,
        ?string $userId = null
    ): Order {
        $invoiceNumber = $this->orderRepository->generateInvoiceNumber($tenantId);
        
        $order = new Order(
            id: \Ramsey\Uuid\Uuid::uuid4()->toString(),
            tenantId: $tenantId,
            invoiceNumber: $invoiceNumber,
            paymentMethod: $paymentMethod,
            amountPaid: $amountPaid,
            customerId: $customerId,
            userId: $userId,
            createdAt: new \DateTime()
        );

        foreach ($items as $itemData) {
            $product = $this->productRepository->findById($itemData['product_id']);
            if (!$product) {
                throw new \InvalidArgumentException("Product not found: {$itemData['product_id']}");
            }

            // Check stock availability
            if ($product->getStock() < $itemData['quantity']) {
                throw new \InvalidArgumentException("Insufficient stock for product: {$product->getName()}");
            }

            // Reduce stock
            $product->adjustStock(-$itemData['quantity']);
            $this->productRepository->save($product);

            // Add item to order
            $orderItem = new OrderItem(
                productId: $product->getId(),
                productName: $product->getName(),
                quantity: $itemData['quantity'],
                price: $product->getPrice()
            );
            
            $order->addItem($orderItem);
        }

        // Validate payment amount
        if ($amountPaid < $order->getTotalAmount()) {
            throw new \InvalidArgumentException('Insufficient payment amount');
        }

        $this->orderRepository->save($order);
        return $order;
    }

    public function getOrdersByTenant(string $tenantId): array
    {
        return $this->orderRepository->findByTenant($tenantId);
    }

    public function getOrder(string $orderId): ?Order
    {
        return $this->orderRepository->findById($orderId);
    }

    public function getTodaysSales(string $tenantId): array
    {
        return $this->orderRepository->getTodaysSales($tenantId);
    }

    public function getSalesReport(string $tenantId, \DateTimeInterface $from, \DateTimeInterface $to): array
    {
        return $this->orderRepository->getSalesReport($tenantId, $from, $to);
    }
}