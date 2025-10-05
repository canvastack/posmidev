<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VariantTemplateResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $configuration = $this->configuration ?? [];
        
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            
            // Configuration
            'configuration' => $configuration,
            'attributes' => $configuration['attributes'] ?? [],
            'sku_pattern' => $configuration['sku_pattern'] ?? null,
            'price_calculation' => $configuration['price_calculation'] ?? 'base',
            'stock_settings' => $configuration['stock_settings'] ?? [],
            
            // Metadata
            'is_system' => $this->is_system,
            'is_active' => $this->is_active,
            'usage_count' => $this->usage_count,
            
            // Timestamps
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
            'last_used_at' => $this->last_used_at?->format('Y-m-d H:i:s'),
            
            // Computed fields
            'total_combinations' => $this->calculateTotalCombinations(),
            'can_delete' => !$this->is_system,
        ];
    }
}