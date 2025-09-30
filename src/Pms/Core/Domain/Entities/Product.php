<?php

namespace Src\Pms\Core\Domain\Entities;

class Product
{
    public function __construct(
        private string $id,
        private string $tenantId,
        private string $name,
        private string $sku,
        private float $price,
        private int $stock,
        private ?string $categoryId = null,
        private ?string $description = null,
        private ?float $costPrice = null,
        private ?\DateTimeInterface $createdAt = null,
        private string $status = 'draft', // draft|published|archived
    ) {}

    public function getId(): string
    {
        return $this->id;
    }

    public function getTenantId(): string
    {
        return $this->tenantId;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getSku(): string
    {
        return $this->sku;
    }

    public function getPrice(): float
    {
        return $this->price;
    }

    public function getStock(): int
    {
        return $this->stock;
    }

    public function getCategoryId(): ?string
    {
        return $this->categoryId;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function getCostPrice(): ?float
    {
        return $this->costPrice;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): void
    {
        $allowed = ['draft', 'published', 'archived'];
        if (!in_array($status, $allowed, true)) {
            throw new \InvalidArgumentException('Invalid product status');
        }
        $this->status = $status;
    }

    public function updateDetails(string $name, float $price, ?string $description = null): void
    {
        $this->name = $name;
        $this->price = $price;
        $this->description = $description;
    }

    public function setStock(int $stock): void
    {
        $this->stock = $stock;

        if ($this->stock < 0) {
            throw new \InvalidArgumentException('Stock cannot be negative');
        }
    }

    public function adjustStock(int $quantity): void
    {
        $this->stock += $quantity;

        if ($this->stock < 0) {
            throw new \InvalidArgumentException('Stock cannot be negative');
        }
    }

    public function isLowStock(int $threshold = 10): bool
    {
        return $this->stock <= $threshold;
    }
}