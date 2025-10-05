<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\StockAlert;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use App\Notifications\LowStockNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Spatie\Permission\Models\Permission;

/**
 * Check Low Stock Alerts Command
 * 
 * Phase 5 Sprint 3: Scheduled Jobs & Notifications
 * 
 * This command runs daily to check all products across all tenants
 * for low stock conditions and creates alerts accordingly.
 * 
 * CORE IMMUTABLE RULES ENFORCED:
 * - Processes each tenant separately (tenant isolation)
 * - Uses 'api' guard for permission checks
 * - All alerts are tenant-scoped
 * - Respects tenant boundaries (no cross-tenant access)
 * 
 * Schedule: Daily at 09:00 AM (Asia/Jakarta timezone)
 * 
 * Usage:
 *   php artisan stock:check-low-alerts
 *   php artisan stock:check-low-alerts --tenant=uuid
 *   php artisan stock:check-low-alerts --dry-run
 *   php artisan stock:check-low-alerts --notify
 */
class CheckLowStockAlerts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'stock:check-low-alerts
                            {--tenant= : Process only specific tenant UUID}
                            {--dry-run : Show what would be done without creating alerts}
                            {--notify : Send notifications to users (default: false)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for low stock products and create alerts across all tenants';

    /**
     * Statistics for the command execution
     */
    protected array $stats = [
        'tenants_processed' => 0,
        'products_checked' => 0,
        'alerts_created' => 0,
        'alerts_updated' => 0,
        'alerts_skipped' => 0,
        'notifications_sent' => 0,
        'errors' => 0,
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('🔍 Starting Low Stock Alert Check...');
        $this->newLine();

        $dryRun = $this->option('dry-run');
        $shouldNotify = $this->option('notify');
        $specificTenant = $this->option('tenant');

        if ($dryRun) {
            $this->warn('🔸 DRY RUN MODE - No changes will be made');
            $this->newLine();
        }

        try {
            // Get tenants to process
            $tenants = $this->getTenants($specificTenant);

            if ($tenants->isEmpty()) {
                $this->error('❌ No tenants found to process');
                return self::FAILURE;
            }

            $this->info("📊 Processing {$tenants->count()} tenant(s)...");
            $this->newLine();

            // Process each tenant
            foreach ($tenants as $tenant) {
                $this->processTenant($tenant, $dryRun, $shouldNotify);
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

    /**
     * Get tenants to process
     */
    protected function getTenants(?string $specificTenant)
    {
        if ($specificTenant) {
            return Tenant::where('id', $specificTenant)->get();
        }

        return Tenant::all();
    }

    /**
     * Process a single tenant
     */
    protected function processTenant(Tenant $tenant, bool $dryRun, bool $shouldNotify): void
    {
        $this->line("🏢 Tenant: {$tenant->name} ({$tenant->id})");
        
        try {
            // Get low stock products for this tenant
            // FIXED: Include products with reorder_point = 0 if they are out of stock
            // Include active and published products (archived products are excluded)
            $lowStockProducts = Product::where('tenant_id', $tenant->id)
                ->where('low_stock_alert_enabled', true)
                ->whereIn('status', ['active', 'published']) // Include active and published products
                ->where(function ($query) {
                    // Products with reorder_point set and stock below it
                    $query->where(function ($q) {
                        $q->whereRaw('stock <= reorder_point')
                          ->where('reorder_point', '>', 0);
                    })
                    // OR products that are out of stock (regardless of reorder_point)
                    ->orWhere(function ($q) {
                        $q->where('stock', '<=', 0);
                    });
                })
                ->with('category')
                ->get();

            $this->stats['tenants_processed']++;
            $this->stats['products_checked'] += Product::where('tenant_id', $tenant->id)->count();

            if ($lowStockProducts->isEmpty()) {
                $this->line('   ✅ No low stock products found');
                $this->newLine();
                return;
            }

            $this->line("   📦 Found {$lowStockProducts->count()} low stock product(s)");

            $alertsCreated = 0;
            $alertsUpdated = 0;
            $alertsSkipped = 0;

            foreach ($lowStockProducts as $product) {
                $result = $this->processProduct($product, $dryRun);
                
                if ($result === 'created') {
                    $alertsCreated++;
                    $this->stats['alerts_created']++;
                } elseif ($result === 'updated') {
                    $alertsUpdated++;
                    $this->stats['alerts_updated']++;
                } else {
                    $alertsSkipped++;
                    $this->stats['alerts_skipped']++;
                }
            }

            // Display tenant summary
            $this->line("   📝 Created: {$alertsCreated}, Updated: {$alertsUpdated}, Skipped: {$alertsSkipped}");

            // Send notifications if requested
            if ($shouldNotify && !$dryRun && ($alertsCreated > 0 || $alertsUpdated > 0)) {
                $this->sendNotifications($tenant, $lowStockProducts);
            }

            $this->newLine();

        } catch (\Exception $e) {
            $this->error("   ❌ Error processing tenant: {$e->getMessage()}");
            $this->stats['errors']++;
            $this->newLine();
        }
    }

    /**
     * Process a single product and create/update alert
     * 
     * @return string 'created', 'updated', or 'skipped'
     */
    protected function processProduct(Product $product, bool $dryRun): string
    {
        $severity = $product->getStockAlertSeverity();

        // Check if there's an existing pending/acknowledged alert for this product
        $existingAlert = StockAlert::where('tenant_id', $product->tenant_id)
            ->where('product_id', $product->id)
            ->whereIn('status', ['pending', 'acknowledged'])
            ->orderBy('created_at', 'desc')
            ->first();

        if ($existingAlert) {
            // Update existing alert if stock or severity changed
            if ($existingAlert->current_stock != $product->stock || 
                $existingAlert->severity != $severity) {
                
                if (!$dryRun) {
                    $existingAlert->update([
                        'current_stock' => $product->stock,
                        'severity' => $severity,
                    ]);
                }

                $this->line("   🔄 {$product->name}: Updated alert (Stock: {$product->stock}/{$product->reorder_point}, Severity: {$severity})");
                return 'updated';
            }

            // Alert exists and unchanged
            return 'skipped';
        }

        // Create new alert
        if (!$dryRun) {
            StockAlert::create([
                'tenant_id' => $product->tenant_id,
                'product_id' => $product->id,
                'current_stock' => $product->stock,
                'reorder_point' => $product->reorder_point,
                'severity' => $severity,
                'status' => 'pending',
                'notified' => false,
            ]);
        }

        $this->line("   ➕ {$product->name}: New alert created (Stock: {$product->stock}/{$product->reorder_point}, Severity: {$severity})");
        return 'created';
    }

    /**
     * Send notifications to users with inventory permissions
     */
    protected function sendNotifications(Tenant $tenant, $lowStockProducts): void
    {
        try {
            // Get users with inventory.view or products.view permission in this tenant
            $users = User::where('tenant_id', $tenant->id)
                ->where('status', 'active')
                ->get()
                ->filter(function ($user) {
                    return $user->can('inventory.view') || $user->can('products.view');
                });

            if ($users->isEmpty()) {
                $this->line('   ⚠️  No users with inventory permissions to notify');
                return;
            }

            // Send notification
            Notification::send($users, new LowStockNotification($lowStockProducts, $tenant));

            $this->line("   📧 Notifications sent to {$users->count()} user(s)");
            $this->stats['notifications_sent'] += $users->count();

            // Mark alerts as notified
            StockAlert::where('tenant_id', $tenant->id)
                ->whereIn('product_id', $lowStockProducts->pluck('id'))
                ->where('notified', false)
                ->update([
                    'notified' => true,
                    'notified_at' => now(),
                ]);

        } catch (\Exception $e) {
            $this->error("   ❌ Error sending notifications: {$e->getMessage()}");
            $this->stats['errors']++;
        }
    }

    /**
     * Display execution summary
     */
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
                ['Alerts Created', $this->stats['alerts_created'] . ($dryRun ? ' (dry run)' : '')],
                ['Alerts Updated', $this->stats['alerts_updated'] . ($dryRun ? ' (dry run)' : '')],
                ['Alerts Skipped', $this->stats['alerts_skipped']],
                ['Notifications Sent', $this->stats['notifications_sent']],
                ['Errors', $this->stats['errors']],
            ]
        );

        if ($dryRun) {
            $this->newLine();
            $this->info('💡 This was a dry run. Run without --dry-run to create actual alerts.');
        }

        if ($this->stats['errors'] > 0) {
            $this->newLine();
            $this->warn("⚠️  Completed with {$this->stats['errors']} error(s). Check logs for details.");
        } else {
            $this->newLine();
            $this->info('✅ Low stock alert check completed successfully!');
        }
    }
}