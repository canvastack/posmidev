<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Check if resource is Domain Entity or Model
        $isDomainEntity = method_exists($this->resource, 'getId');

        return [
            'id' => $isDomainEntity ? $this->resource->getId() : $this->resource->id,
            'name' => $isDomainEntity ? $this->resource->getName() : $this->resource->name,
            'sku' => $isDomainEntity ? $this->resource->getSku() : $this->resource->sku,
            'price' => $isDomainEntity ? $this->resource->getPrice() : $this->resource->price,
            'stock' => $isDomainEntity ? $this->resource->getStock() : $this->resource->stock,
            'tenant_id' => $isDomainEntity ? $this->resource->getTenantId() : $this->resource->tenant_id,
            'category_id' => $isDomainEntity ? $this->resource->getCategoryId() : $this->resource->category_id,
            'description' => $isDomainEntity ? $this->resource->getDescription() : $this->resource->description,
            'cost_price' => $isDomainEntity ? $this->resource->getCostPrice() : $this->resource->cost_price,
            'created_at' => $isDomainEntity
                ? $this->resource->getCreatedAt()?->format('Y-m-d H:i:s')
                : $this->resource->created_at?->format('Y-m-d H:i:s'),
        ];
    }
}