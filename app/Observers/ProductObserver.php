<?php

namespace App\Observers;

use App\Models\ProductPriceHistory;
use App\Models\ProductStockHistory;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Product;

class ProductObserver
{
    /**
     * Handle the Product "updating" event.
     * Track price and stock changes before they are saved.
     */
    public function updating(Product $product): void
    {
        // Track price changes
        if ($product->isDirty('price') || $product->isDirty('cost_price')) {
            $this->trackPriceChange($product);
        }

        // Track stock changes
        if ($product->isDirty('stock')) {
            $this->trackStockChange($product);
        }
    }

    /**
     * Track price changes.
     */
    protected function trackPriceChange(Product $product): void
    {
        ProductPriceHistory::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $product->tenant_id,
            'product_id' => $product->id,
            'old_price' => $product->getOriginal('price'),
            'new_price' => $product->price,
            'old_cost_price' => $product->getOriginal('cost_price'),
            'new_cost_price' => $product->cost_price,
            'changed_by' => auth()->id(), // nullable for system/seeder changes
            'changed_at' => now(),
        ]);
    }

    /**
     * Track stock changes.
     */
    protected function trackStockChange(Product $product): void
    {
        $oldStock = $product->getOriginal('stock');
        $newStock = $product->stock;

        ProductStockHistory::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $product->tenant_id,
            'product_id' => $product->id,
            'old_stock' => $oldStock,
            'new_stock' => $newStock,
            'change_amount' => $newStock - $oldStock,
            'change_type' => 'manual', // default for direct updates
            'changed_by' => auth()->id(), // nullable for system/seeder changes
            'changed_at' => now(),
        ]);
    }
}