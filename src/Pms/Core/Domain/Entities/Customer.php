<?php

namespace Src\Pms\Core\Domain\Entities;

class Customer
{
    private array $tags = [];

    public function __construct(
        private string $id,
        private string $tenantId,
        private string $name,
        private ?string $email = null,
        private ?string $phone = null,
        private ?string $address = null,
        private ?\DateTimeInterface $createdAt = null,
        private ?\DateTimeInterface $updatedAt = null,
        private ?string $photoUrl = null,
        private ?string $photoThumbUrl = null,
        private ?float $deliveryLatitude = null,
        private ?float $deliveryLongitude = null,
        private ?string $deliveryAddress = null
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

    public function setName(string $name): void
    {
        $this->name = $name;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): void
    {
        $this->email = $email;
    }

    public function getPhone(): ?string
    {
        return $this->phone;
    }

    public function setPhone(?string $phone): void
    {
        $this->phone = $phone;
    }

    public function getAddress(): ?string
    {
        return $this->address;
    }

    public function setAddress(?string $address): void
    {
        $this->address = $address;
    }

    public function getTags(): array
    {
        return $this->tags;
    }

    public function setTags(array $tags): void
    {
        $this->tags = $tags;
    }

    public function addTag(string $tag): void
    {
        if (!in_array($tag, $this->tags)) {
            $this->tags[] = $tag;
        }
    }

    public function removeTag(string $tag): void
    {
        $this->tags = array_filter($this->tags, fn($t) => $t !== $tag);
    }

    public function getCreatedAt(): ?\DateTimeInterface
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeInterface $createdAt): void
    {
        $this->createdAt = $createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeInterface
    {
        return $this->updatedAt;
    }

    public function setUpdatedAt(\DateTimeInterface $updatedAt): void
    {
        $this->updatedAt = $updatedAt;
    }

    public function getPhotoUrl(): ?string
    {
        return $this->photoUrl;
    }

    public function setPhotoUrl(?string $photoUrl): void
    {
        $this->photoUrl = $photoUrl;
    }

    public function getPhotoThumbUrl(): ?string
    {
        return $this->photoThumbUrl;
    }

    public function setPhotoThumbUrl(?string $photoThumbUrl): void
    {
        $this->photoThumbUrl = $photoThumbUrl;
    }

    public function getDeliveryLatitude(): ?float
    {
        return $this->deliveryLatitude;
    }

    public function setDeliveryLatitude(?float $deliveryLatitude): void
    {
        $this->deliveryLatitude = $deliveryLatitude;
    }

    public function getDeliveryLongitude(): ?float
    {
        return $this->deliveryLongitude;
    }

    public function setDeliveryLongitude(?float $deliveryLongitude): void
    {
        $this->deliveryLongitude = $deliveryLongitude;
    }

    public function getDeliveryAddress(): ?string
    {
        return $this->deliveryAddress;
    }

    public function setDeliveryAddress(?string $deliveryAddress): void
    {
        $this->deliveryAddress = $deliveryAddress;
    }

    public function hasPhoto(): bool
    {
        return !empty($this->photoUrl);
    }

    public function hasDeliveryLocation(): bool
    {
        return !is_null($this->deliveryLatitude) && !is_null($this->deliveryLongitude);
    }

    public function getDeliveryLocationCoordinates(): ?array
    {
        if (!$this->hasDeliveryLocation()) {
            return null;
        }

        return [
            'lat' => $this->deliveryLatitude,
            'lng' => $this->deliveryLongitude,
        ];
    }

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenantId,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'address' => $this->address,
            'tags' => $this->tags,
            'photo_url' => $this->photoUrl,
            'photo_thumb_url' => $this->photoThumbUrl,
            'has_photo' => $this->hasPhoto(),
            'delivery_latitude' => $this->deliveryLatitude,
            'delivery_longitude' => $this->deliveryLongitude,
            'delivery_address' => $this->deliveryAddress,
            'has_delivery_location' => $this->hasDeliveryLocation(),
            'delivery_location_coordinates' => $this->getDeliveryLocationCoordinates(),
            'created_at' => $this->createdAt?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updatedAt?->format('Y-m-d H:i:s'),
        ];
    }
}