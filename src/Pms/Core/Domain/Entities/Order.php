<?php

namespace Src\Pms\Core\Domain\Entities;

class Order
{
    private array $items = [];

    public function __construct(
        private string $id,
        private string $tenantId,
        private string $invoiceNumber,
        private string $paymentMethod,
        private float $amountPaid,
        private ?string $customerId = null,
        private ?string $userId = null,
        private ?\DateTimeInterface $createdAt = null
    ) {}

    public function getId(): string
    {
        return $this->id;
    }

    public function getTenantId(): string
    {
        return $this->tenantId;
    }

    public function getInvoiceNumber(): string
    {
        return $this->invoiceNumber;
    }

    public function getPaymentMethod(): string
    {
        return $this->paymentMethod;
    }

    public function getAmountPaid(): float
    {
        return $this->amountPaid;
    }

    public function getCustomerId(): ?string
    {
        return $this->customerId;
    }

    public function getUserId(): ?string
    {
        return $this->userId;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function addItem(OrderItem $item): void
    {
        $this->items[] = $item;
    }

    public function getItems(): array
    {
        return $this->items;
    }

    public function getTotalAmount(): float
    {
        return array_sum(array_map(fn($item) => $item->getSubtotal(), $this->items));
    }

    public function getChange(): float
    {
        return $this->amountPaid - $this->getTotalAmount();
    }
}

class OrderItem
{
    public function __construct(
        private string $productId,
        private string $productName,
        private int $quantity,
        private float $price
    ) {}

    public function getProductId(): string
    {
        return $this->productId;
    }

    public function getProductName(): string
    {
        return $this->productName;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function getPrice(): float
    {
        return $this->price;
    }

    public function getSubtotal(): float
    {
        return $this->quantity * $this->price;
    }
}