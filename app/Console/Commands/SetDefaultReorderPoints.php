<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;

/**
 * Set Default Reorder Points Command
 * 
 * This command sets sensible default reorder points for existing products
 * that have reorder_point = 0 or NULL.
 * 
 * Default strategy:
 * - If stock > 100: reorder_point = 20% of stock
 * - If stock 51-100: reorder_point = 25% of stock  
 * - If stock 21-50: reorder_point = 30% of stock
 * - If stock 11-20: reorder_point = 5
 * - If stock 0-10: reorder_point = 10
 * 
 * Usage:
 *   php artisan stock:set-default-reorder-points
 *   php artisan stock:set-default-reorder-points --tenant=uuid
 *   php artisan stock:set-default-reorder-points --dry-run
 */
class SetDefaultReorderPoints extends Command
{
    protected $signature = 'stock:set-default-reorder-points
                            {--tenant= : Process only specific tenant UUID}
                            {--dry-run : Show what would be done without making changes}
                            {--force : Update even if reorder_point is already set}';

    protected $description = 'Set sensible default reorder points for products with reorder_point = 0';

    protected array $stats = [
        'tenants_processed' => 0,
        'products_checked' => 0,
        'products_updated' => 0,
        'products_skipped' => 0,
    ];

    public function handle(): int
    {
        $this->info('🔧 Setting Default Reorder Points...');
        $this->newLine();

        $dryRun = $this->option('dry-run');
        $force = $this->option('force');
        $specificTenant = $this->option('tenant');

        if ($dryRun) {
            $this->warn('🔸 DRY RUN MODE - No changes will be made');
            $this->newLine();
        }

        try {
            // Get tenants to process
            $tenants = $specificTenant 
                ? Tenant::where('id', $specificTenant)->get()
                : Tenant::all();

            if ($tenants->isEmpty()) {
                $this->error('❌ No tenants found to process');
                return self::FAILURE;
            }

            $this->info("📊 Processing {$tenants->count()} tenant(s)...");
            $this->newLine();

            // Process each tenant
            foreach ($tenants as $tenant) {
                $this->processTenant($tenant, $dryRun, $force);
            }

            // Display summary
            $this->displaySummary($dryRun);

            return self::SUCCESS;

        } catch (\Exception $e) {
            $this->error('❌ Error: ' . $e->getMessage());
            $this->error($e->getTraceAsString());
            return self::FAILURE;
        }
    }

    protected function processTenant(Tenant $tenant, bool $dryRun, bool $force): void
    {
        $this->line("🏢 Tenant: {$tenant->name} ({$tenant->id})");

        try {
            // Get products with reorder_point = 0
            $query = Product::where('tenant_id', $tenant->id);
            
            if (!$force) {
                $query->where(function ($q) {
                    $q->where('reorder_point', 0)
                      ->orWhereNull('reorder_point');
                });
            }

            $products = $query->get();

            $this->stats['tenants_processed']++;
            $this->stats['products_checked'] += $products->count();

            if ($products->isEmpty()) {
                $this->line('   ✅ No products need reorder point updates');
                $this->newLine();
                return;
            }

            $this->line("   📦 Found {$products->count()} product(s) to update");

            $updated = 0;
            $skipped = 0;

            foreach ($products as $product) {
                $newReorderPoint = $this->calculateReorderPoint($product->stock);
                $newReorderQuantity = $this->calculateReorderQuantity($product->stock);

                if ($newReorderPoint === $product->reorder_point && !$force) {
                    $skipped++;
                    continue;
                }

                if (!$dryRun) {
                    $product->update([
                        'reorder_point' => $newReorderPoint,
                        'reorder_quantity' => $newReorderQuantity,
                        'low_stock_alert_enabled' => true,
                    ]);
                }

                $this->line("   ✏️  {$product->name} (SKU: {$product->sku}): reorder_point={$newReorderPoint}, reorder_qty={$newReorderQuantity} (stock: {$product->stock})");
                $updated++;
            }

            $this->stats['products_updated'] += $updated;
            $this->stats['products_skipped'] += $skipped;

            $this->line("   📝 Updated: {$updated}, Skipped: {$skipped}");
            $this->newLine();

        } catch (\Exception $e) {
            $this->error("   ❌ Error processing tenant: {$e->getMessage()}");
            $this->newLine();
        }
    }

    /**
     * Calculate sensible reorder point based on current stock
     */
    protected function calculateReorderPoint(int $stock): int
    {
        if ($stock > 100) {
            return (int) ceil($stock * 0.20); // 20% of stock
        }
        
        if ($stock >= 51) {
            return (int) ceil($stock * 0.25); // 25% of stock
        }
        
        if ($stock >= 21) {
            return (int) ceil($stock * 0.30); // 30% of stock
        }
        
        if ($stock >= 11) {
            return 5;
        }
        
        // For very low stock or out of stock, set minimum reorder point
        return 10;
    }

    /**
     * Calculate sensible reorder quantity based on current stock
     */
    protected function calculateReorderQuantity(int $stock): int
    {
        if ($stock > 100) {
            return (int) ceil($stock * 0.50); // Restock to 50% of current
        }
        
        if ($stock >= 51) {
            return (int) ceil($stock * 0.75); // Restock to 75% of current
        }
        
        if ($stock >= 21) {
            return $stock; // Restock to same level
        }
        
        // For low stock, order enough to reach at least 20 units
        return max(20, $stock * 2);
    }

    protected function displaySummary(bool $dryRun): void
    {
        $this->newLine();
        $this->info('═══════════════════════════════════════════════');
        $this->info('📊 EXECUTION SUMMARY');
        $this->info('═══════════════════════════════════════════════');
        
        $this->table(
            ['Metric', 'Count'],
            [
                ['Tenants Processed', $this->stats['tenants_processed']],
                ['Products Checked', $this->stats['products_checked']],
                ['Products Updated', $this->stats['products_updated'] . ($dryRun ? ' (dry run)' : '')],
                ['Products Skipped', $this->stats['products_skipped']],
            ]
        );

        if ($dryRun) {
            $this->newLine();
            $this->info('💡 This was a dry run. Run without --dry-run to apply changes.');
        } else {
            $this->newLine();
            $this->info('✅ Default reorder points set successfully!');
            $this->info('💡 Run: php artisan stock:check-low-alerts to create alerts for low stock products');
        }
    }
}