<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VariantAttributeResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'display_type' => $this->display_type,
            
            // Values with price modifiers
            'values' => $this->values ?? [],
            'value_count' => count($this->values ?? []),
            
            // Price modifiers
            'price_modifiers' => $this->price_modifiers ?? [],
            'has_price_modifiers' => !empty($this->price_modifiers),
            
            // Visual settings (colors, images for swatches)
            'visual_settings' => $this->visual_settings ?? [],
            
            // Sort and status
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            
            // Usage tracking
            'usage_count' => $this->usage_count,
            
            // Timestamps
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
            
            // Computed fields
            'total_combinations' => $this->calculateCombinations(),
        ];
    }
}