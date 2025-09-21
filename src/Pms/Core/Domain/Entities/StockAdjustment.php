<?php

namespace Src\Pms\Core\Domain\Entities;

class StockAdjustment
{
    public function __construct(
        private string $id,
        private string $productId,
        private string $userId,
        private int $quantity,
        private string $reason,
        private ?string $notes = null,
        private ?\DateTimeInterface $createdAt = null
    ) {}

    public function getId(): string
    {
        return $this->id;
    }

    public function getProductId(): string
    {
        return $this->productId;
    }

    public function getUserId(): string
    {
        return $this->userId;
    }

    public function getQuantity(): int
    {
        return $this->quantity;
    }

    public function getReason(): string
    {
        return $this->reason;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }
}