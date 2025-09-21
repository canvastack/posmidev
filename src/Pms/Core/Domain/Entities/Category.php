<?php

namespace Src\Pms\Core\Domain\Entities;

class Category
{
    public function __construct(
        private string $id,
        private string $tenantId,
        private string $name,
        private ?string $description = null,
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

    public function getName(): string
    {
        return $this->name;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function updateDetails(string $name, ?string $description = null): void
    {
        $this->name = $name;
        $this->description = $description;
    }
}