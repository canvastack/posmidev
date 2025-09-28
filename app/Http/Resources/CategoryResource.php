<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Debug logging untuk memvalidasi diagnosis
        \Illuminate\Support\Facades\Log::info('CategoryResource::toArray called', [
            'resource_type' => get_class($this->resource),
            'resource_id' => method_exists($this->resource, 'getId') ? $this->resource->getId() : 'no_getId_method',
            'has_private_id' => property_exists($this->resource, 'id') && !$this->resource instanceof \Src\Pms\Core\Domain\Entities\Category,
        ]);

        // Check if this is a Domain Entity (has getter methods) or Model (has public properties)
        if ($this->resource instanceof \Src\Pms\Core\Domain\Entities\Category) {
            // Use getter methods for Domain Entity
            return [
                'id' => $this->resource->getId(),
                'name' => $this->resource->getName(),
                'description' => $this->resource->getDescription(),
                'tenant_id' => $this->resource->getTenantId(),
                'created_at' => $this->resource->getCreatedAt()?->format('Y-m-d H:i:s'),
            ];
        } else {
            // Use direct property access for Models
            return [
                'id' => $this->id,
                'name' => $this->name,
                'description' => $this->description,
                'tenant_id' => $this->tenant_id,
                'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            ];
        }
    }
}