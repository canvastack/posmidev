<?php

namespace App\Console\Commands;

use App\Services\VariantAnalyticsService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Src\Pms\Infrastructure\Models\Tenant;

class CalculateVariantAnalyticsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'variants:calculate-analytics
                            {--date= : The date to calculate analytics for (Y-m-d format, defaults to yesterday)}
                            {--tenant= : Calculate for specific tenant ID only}
                            {--aggregate= : Aggregate period (weekly|monthly)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Calculate daily analytics for all variants or aggregate into weekly/monthly';

    protected VariantAnalyticsService $analyticsService;

    /**
     * Create a new command instance.
     */
    public function __construct(VariantAnalyticsService $analyticsService)
    {
        parent::__construct();
        $this->analyticsService = $analyticsService;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $date = $this->option('date') 
            ? Carbon::parse($this->option('date')) 
            : Carbon::yesterday();

        $tenantId = $this->option('tenant');
        $aggregatePeriod = $this->option('aggregate');

        $this->info("🔄 Starting variant analytics calculation for {$date->toDateString()}");

        // If aggregate option is provided, run aggregation instead
        if ($aggregatePeriod) {
            return $this->runAggregation($aggregatePeriod, $date, $tenantId);
        }

        // Run daily analytics calculation
        return $this->runDailyCalculation($date, $tenantId);
    }

    /**
     * Run daily analytics calculation
     */
    protected function runDailyCalculation(Carbon $date, ?string $tenantId): int
    {
        $tenants = $tenantId 
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::all();

        if ($tenants->isEmpty()) {
            $this->error('❌ No tenants found');
            return self::FAILURE;
        }

        $totalCalculated = 0;
        $failedTenants = [];

        $progressBar = $this->output->createProgressBar($tenants->count());
        $progressBar->setFormat('debug');
        $progressBar->start();

        foreach ($tenants as $tenant) {
            try {
                $results = $this->analyticsService->calculateDailyAnalyticsForTenant(
                    $tenant->id,
                    $date->toDateString()
                );

                $totalCalculated += $results->count();
                $progressBar->advance();
            } catch (\Exception $e) {
                $failedTenants[] = [
                    'tenant_id' => $tenant->id,
                    'tenant_name' => $tenant->name,
                    'error' => $e->getMessage(),
                ];
                $this->error("\n❌ Failed for tenant {$tenant->name}: {$e->getMessage()}");
                $progressBar->advance();
            }
        }

        $progressBar->finish();
        $this->newLine(2);

        // Summary
        $this->info("✅ Daily analytics calculation completed!");
        $this->table(
            ['Metric', 'Value'],
            [
                ['Date', $date->toDateString()],
                ['Tenants Processed', $tenants->count()],
                ['Variants Calculated', $totalCalculated],
                ['Failed Tenants', count($failedTenants)],
            ]
        );

        if (!empty($failedTenants)) {
            $this->warn("\n⚠️  Failed Tenants:");
            $this->table(
                ['Tenant ID', 'Tenant Name', 'Error'],
                collect($failedTenants)->map(fn($f) => [$f['tenant_id'], $f['tenant_name'], substr($f['error'], 0, 50) . '...'])->toArray()
            );
        }

        return count($failedTenants) > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Run aggregation (weekly or monthly)
     */
    protected function runAggregation(string $period, Carbon $date, ?string $tenantId): int
    {
        if (!in_array($period, ['weekly', 'monthly'])) {
            $this->error("❌ Invalid aggregate period: {$period}. Must be 'weekly' or 'monthly'");
            return self::FAILURE;
        }

        $this->info("📊 Aggregating {$period} analytics...");

        $tenants = $tenantId 
            ? Tenant::where('id', $tenantId)->get()
            : Tenant::all();

        $periodStart = $period === 'weekly' 
            ? $date->copy()->startOfWeek()
            : $date->copy()->startOfMonth();

        $totalAggregated = 0;
        $failedCount = 0;

        foreach ($tenants as $tenant) {
            $this->info("\n  Processing tenant: {$tenant->name}");
            
            $variants = \Src\Pms\Infrastructure\Models\ProductVariant::forTenant($tenant->id)->get();
            
            $progressBar = $this->output->createProgressBar($variants->count());
            $progressBar->start();

            foreach ($variants as $variant) {
                try {
                    if ($period === 'weekly') {
                        $this->analyticsService->aggregateWeeklyAnalytics($tenant->id, $variant->id, $periodStart);
                    } else {
                        $this->analyticsService->aggregateMonthlyAnalytics($tenant->id, $variant->id, $periodStart);
                    }
                    
                    $totalAggregated++;
                    $progressBar->advance();
                } catch (\Exception $e) {
                    $failedCount++;
                    $progressBar->advance();
                }
            }

            $progressBar->finish();
        }

        $this->newLine(2);
        $this->info("✅ Aggregation completed!");
        $this->table(
            ['Metric', 'Value'],
            [
                ['Period', ucfirst($period)],
                ['Period Start', $periodStart->toDateString()],
                ['Tenants Processed', $tenants->count()],
                ['Variants Aggregated', $totalAggregated],
                ['Failed', $failedCount],
            ]
        );

        return $failedCount > 0 ? self::FAILURE : self::SUCCESS;
    }
}