<?php

namespace Src\Pms\Core\Domain\Entities;

class Tenant
{
    public function __construct(
        private string $id,
        private string $name,
        private ?string $address = null,
        private ?string $phone = null,
        private ?string $logo = null,
        private ?\DateTimeInterface $createdAt = null
    ) {}

    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getAddress(): ?string
    {
        return $this->address;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function getLogo(): ?string
    {
        return $this->logo;
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function updateProfile(string $name, ?string $address = null, ?string $phone = null): void
    {
        $this->name = $name;
        $this->address = $address;
        $this->phone = $phone;
    }
}