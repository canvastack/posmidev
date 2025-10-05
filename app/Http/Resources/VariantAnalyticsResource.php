<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VariantAnalyticsResource extends JsonResource
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
            'variant_id' => $this->variant_id,
            'tenant_id' => $this->tenant_id,
            
            // Time period
            'period_type' => $this->period_type,
            'period_start' => $this->period_start?->format('Y-m-d H:i:s'),
            'period_end' => $this->period_end?->format('Y-m-d H:i:s'),
            
            // Sales metrics
            'total_orders' => $this->total_orders,
            'quantity_sold' => $this->quantity_sold,
            'revenue' => $this->revenue,
            'profit' => $this->profit,
            'profit_margin_percent' => $this->getProfitMarginPercent(),
            
            // Stock metrics
            'stock_start' => $this->stock_start,
            'stock_end' => $this->stock_end,
            'stock_change' => $this->stock_end - $this->stock_start,
            'turnover_rate' => $this->turnover_rate,
            'days_of_stock' => $this->getDaysOfStock(),
            
            // Performance metrics
            'view_count' => $this->view_count,
            'add_to_cart_count' => $this->add_to_cart_count,
            'conversion_rate' => $this->getConversionRate(),
            'cart_abandonment_rate' => $this->getCartAbandonmentRate(),
            
            // Rankings (percentiles)
            'revenue_percentile' => $this->revenue_percentile,
            'profit_percentile' => $this->profit_percentile,
            'turnover_percentile' => $this->turnover_percentile,
            
            // Performance status
            'performance_status' => $this->getPerformanceStatus(),
            
            // Timestamps
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
            
            // Relationships (when loaded)
            'variant' => $this->whenLoaded('variant', function () {
                return [
                    'id' => $this->variant->id,
                    'sku' => $this->variant->sku,
                    'name' => $this->variant->name,
                    'display_name' => $this->variant->display_name,
                ];
            }),
        ];
    }
}