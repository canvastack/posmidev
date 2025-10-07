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
            'product_variant_id' => $this->product_variant_id,
            'tenant_id' => $this->tenant_id,
            
            // Time period
            'period_type' => $this->period_type,
            'period_date' => $this->period_date?->format('Y-m-d'),
            'period_start' => $this->period_start?->format('Y-m-d'),
            'period_end' => $this->period_end?->format('Y-m-d'),
            
            // Sales metrics
            'total_orders' => $this->total_orders,
            'quantity_sold' => $this->quantity_sold,
            'revenue' => (float) $this->revenue,
            'profit' => (float) $this->profit,
            'profit_margin' => (float) $this->profit_margin,
            
            // Stock metrics
            'stock_start' => $this->stock_start,
            'stock_end' => $this->stock_end,
            'stock_added' => $this->stock_added,
            'stock_removed' => $this->stock_removed,
            'stock_turnover_rate' => (float) $this->stock_turnover_rate,
            'days_out_of_stock' => $this->days_out_of_stock,
            
            // Performance metrics
            'view_count' => $this->view_count,
            'add_to_cart_count' => $this->add_to_cart_count,
            'conversion_rate' => (float) $this->conversion_rate,
            
            // Rankings (percentiles)
            'revenue_rank_percentile' => (float) ($this->revenue_rank_percentile ?? 0),
            'quantity_rank_percentile' => (float) ($this->quantity_rank_percentile ?? 0),
            
            // Performance status
            'performance_status' => $this->getPerformanceStatus(),
            'performance_color' => $this->getPerformanceColor(),
            'is_top_performer' => $this->isTopPerformer(),
            'is_underperforming' => $this->isUnderperforming(),
            
            // Predictions
            'avg_daily_sales' => (float) ($this->avg_daily_sales ?? 0),
            'predicted_sales_next_period' => $this->predicted_sales_next_period,
            'predicted_stockout_date' => $this->predicted_stockout_date?->format('Y-m-d'),
            'days_of_stock_remaining' => $this->calculateDaysOfStockRemaining(),
            
            // Timestamps
            'created_at' => $this->created_at?->format('Y-m-d H:i:s'),
            'updated_at' => $this->updated_at?->format('Y-m-d H:i:s'),
            
            // Relationships (when loaded)
            'variant' => $this->whenLoaded('productVariant', function () {
                return [
                    'id' => $this->productVariant->id,
                    'sku' => $this->productVariant->sku,
                    'name' => $this->productVariant->name,
                    'display_name' => $this->productVariant->display_name,
                    'price' => (float) $this->productVariant->price,
                    'stock' => $this->productVariant->stock,
                ];
            }),
        ];
    }
}