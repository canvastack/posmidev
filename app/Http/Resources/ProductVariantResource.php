<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
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
            'product_id' => $this->product_id,
            'tenant_id' => $this->tenant_id,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'name' => $this->name,
            'display_name' => $this->display_name,
            
            // Attributes
            'attributes' => $this->attributes ?? [],
            
            // Pricing
            'price' => $this->price,
            'cost_price' => $this->cost_price,
            'price_modifier' => $this->price_modifier,
            'profit_margin' => $this->getProfitMargin(),
            
            // Stock
            'stock' => $this->stock,
            'reserved_stock' => $this->reserved_stock,
            'available_stock' => $this->available_stock,
            'manage_stock' => $this->manage_stock,
            'reorder_level' => $this->reorder_level,
            'reorder_quantity' => $this->reorder_quantity,
            'is_low_stock' => $this->isLowStock(),
            'is_critical_stock' => $this->isCriticalStock(),
            
            // Images
            'images' => $this->images ?? [],
            'image_url' => $this->image_url,
            'primary_image_url' => $this->images && isset($this->images[0]) 
                ? asset('storage/' . $this->images[0]) 
                : null,
            
            // Status
            'is_active' => $this->is_active,
            'is_default' => $this->is_default,
            'sort_order' => $this->sort_order,
            
            // Timestamps
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
            
            // Relationships (when loaded)
            'product' => $this->whenLoaded('product', function () {
                return [
                    'id' => $this->product->id,
                    'name' => $this->product->name,
                    'sku' => $this->product->sku,
                ];
            }),
            
            'analytics' => $this->whenLoaded('analytics', function () {
                return VariantAnalyticsResource::collection($this->analytics);
            }),
            
            'latest_analytics' => $this->whenLoaded('latestAnalytics', function () {
                return $this->latestAnalytics ? new VariantAnalyticsResource($this->latestAnalytics) : null;
            }),
        ];
    }
}