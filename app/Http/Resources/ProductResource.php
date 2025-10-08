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
            'status' => $isDomainEntity ? $this->resource->getStatus() : ($this->resource->status ?? 'active'),
            'created_at' => $isDomainEntity
                ? $this->resource->getCreatedAt()?->format('Y-m-d H:i:s')
                : $this->resource->created_at?->format('Y-m-d H:i:s'),
            'image_url' => $isDomainEntity
                ? null
                : ($this->resource->image_path ? asset('storage/' . $this->resource->image_path) : null),
            'thumbnail_url' => $isDomainEntity
                ? null
                : ($this->resource->thumbnail_path ? asset('storage/' . $this->resource->thumbnail_path) : null),
            // Include category relation if loaded
            'category' => $isDomainEntity 
                ? null 
                : ($this->whenLoaded('category', function () {
                    return $this->resource->category ? [
                        'id' => $this->resource->category->id,
                        'name' => $this->resource->category->name,
                    ] : null;
                })),
            // Variant-related fields
            'has_variants' => $isDomainEntity 
                ? false 
                : ($this->resource->has_variants ?? false),
            'manage_stock_by_variant' => $isDomainEntity 
                ? false 
                : ($this->resource->manage_stock_by_variant ?? false),
            'variant_count' => $isDomainEntity 
                ? 0 
                : ($this->resource->variants_count ?? $this->resource->variants()->count() ?? 0),
            
            // Phase 9: Additional Business Features
            // Supplier
            'supplier_id' => $isDomainEntity ? null : $this->resource->supplier_id,
            'supplier' => $isDomainEntity 
                ? null 
                : ($this->whenLoaded('supplier', function () {
                    return $this->resource->supplier ? [
                        'id' => $this->resource->supplier->id,
                        'name' => $this->resource->supplier->name,
                        'contact_person' => $this->resource->supplier->contact_person,
                        'email' => $this->resource->supplier->email,
                        'phone' => $this->resource->supplier->phone,
                    ] : null;
                })),
            
            // Unit of Measurement
            'uom' => $isDomainEntity ? null : $this->resource->uom,
            'formatted_uom' => $isDomainEntity ? null : $this->resource->formatted_uom,
            'stock_with_uom' => $isDomainEntity ? null : $this->resource->stock_with_uom,
            
            // Tax Configuration
            'tax_rate' => $isDomainEntity ? null : $this->resource->tax_rate,
            'tax_inclusive' => $isDomainEntity ? null : $this->resource->tax_inclusive,
            'price_without_tax' => $isDomainEntity ? null : $this->resource->price_without_tax,
            'price_with_tax' => $isDomainEntity ? null : $this->resource->price_with_tax,
            'tax_amount' => $isDomainEntity ? null : $this->resource->tax_amount,
            
            // Product Tags
            'tags' => $isDomainEntity 
                ? [] 
                : ($this->whenLoaded('tags', function () {
                    return $this->resource->tags->map(function ($tag) {
                        return [
                            'id' => $tag->id,
                            'name' => $tag->name,
                            'slug' => $tag->slug,
                            'color' => $tag->color,
                        ];
                    });
                })),
        ];
    }
}