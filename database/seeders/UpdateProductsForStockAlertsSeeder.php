<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Product;

/**
 * Update existing products with reorder points and alert settings
 * This seeder fixes products that were created before stock alert feature
 */
class UpdateProductsForStockAlertsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Updating products for stock alerts...');

        // Get all products that don't have reorder_point set
        $products = Product::where('reorder_point', 0)
            ->orWhereNull('reorder_point')
            ->get();

        $this->command->info("Found {$products->count()} products to update");

        $updated = 0;
        foreach ($products as $product) {
            // Set reorder point based on current stock
            // - If stock > 50: reorder_point = 30-50
            // - If stock 20-50: reorder_point = 20-30
            // - If stock < 20: reorder_point = stock + 10 to 30
            
            $stock = $product->stock;
            if ($stock > 50) {
                $reorderPoint = rand(30, 50);
            } elseif ($stock >= 20) {
                $reorderPoint = rand(20, 30);
            } elseif ($stock >= 10) {
                $reorderPoint = rand(15, 25);
            } else {
                // For low/zero stock, set higher reorder point
                $reorderPoint = rand(20, 40);
            }

            $product->update([
                'reorder_point' => $reorderPoint,
                'reorder_quantity' => rand(50, 100),
                'low_stock_alert_enabled' => rand(1, 100) <= 85, // 85% enabled
            ]);

            $updated++;
        }

        $this->command->info("✅ Updated {$updated} products");
        
        // Show stats
        $lowStockCount = Product::whereColumn('stock', '<=', 'reorder_point')
            ->where('reorder_point', '>', 0)
            ->where('low_stock_alert_enabled', true)
            ->count();
        
        $outOfStockCount = Product::where('stock', 0)
            ->where('reorder_point', '>', 0)
            ->where('low_stock_alert_enabled', true)
            ->count();

        $this->command->info("📊 Products needing alerts:");
        $this->command->info("   - Low stock: {$lowStockCount}");
        $this->command->info("   - Out of stock: {$outOfStockCount}");
        $this->command->info("💡 Run 'php artisan stock:check-low-alerts' to create alerts");
    }
}