<?php

namespace App\Jobs\Analytics;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Src\Pms\Core\Services\Analytics\ForecastingService;

/**
 * Background job to generate daily forecasts for all tenants.
 * 
 * This job runs daily at midnight and generates forecasts for:
 * - Revenue
 * - Transaction count
 * - Average ticket size
 * 
 * Forecasts are stored in the analytics_forecasts table for 30 days ahead.
 * 
 * @see ForecastingService
 */
class GenerateDailyForecastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public $backoff = 60;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 600; // 10 minutes

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     *
     * @param ForecastingService $forecastingService
     * @return void
     */
    public function handle(ForecastingService $forecastingService): void
    {
        Log::info('GenerateDailyForecastJob: Starting forecast generation for all tenants');

        $startTime = microtime(true);
        $tenants = Tenant::all();
        $totalForecasts = 0;
        $failedTenants = 0;

        foreach ($tenants as $tenant) {
            try {
                Log::info("GenerateDailyForecastJob: Processing tenant {$tenant->id} ({$tenant->name})");

                // Generate forecasts for all metric types
                $metrics = ['revenue', 'transactions', 'average_ticket'];
                
                foreach ($metrics as $metricType) {
                    try {
                        // Generate 30-day forecast using linear regression
                        $result = $forecastingService->linearRegressionForecast(
                            tenantId: $tenant->id,
                            metricType: $metricType,
                            daysAhead: 30,
                            algorithm: 'linear_regression'
                        );

                        if (isset($result['forecasts']) && count($result['forecasts']) > 0) {
                            // Store forecasts in database
                            $forecastingService->storeForecast(
                                tenantId: $tenant->id,
                                metricType: $metricType,
                                forecasts: $result['forecasts'],
                                algorithm: 'linear_regression',
                                rSquared: $result['r_squared'] ?? null
                            );

                            $totalForecasts += count($result['forecasts']);
                            
                            Log::info("GenerateDailyForecastJob: Generated {$metricType} forecast for tenant {$tenant->id}", [
                                'metric' => $metricType,
                                'forecasts_count' => count($result['forecasts']),
                                'r_squared' => $result['r_squared'] ?? null,
                            ]);
                        } else {
                            Log::warning("GenerateDailyForecastJob: No forecasts generated for {$metricType} (tenant {$tenant->id})");
                        }
                    } catch (\Exception $e) {
                        Log::error("GenerateDailyForecastJob: Failed to generate {$metricType} forecast for tenant {$tenant->id}", [
                            'error' => $e->getMessage(),
                            'trace' => $e->getTraceAsString(),
                        ]);
                    }
                }
            } catch (\Exception $e) {
                $failedTenants++;
                Log::error("GenerateDailyForecastJob: Failed to process tenant {$tenant->id}", [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $executionTime = round(microtime(true) - $startTime, 2);

        Log::info('GenerateDailyForecastJob: Completed', [
            'tenants_processed' => $tenants->count(),
            'tenants_failed' => $failedTenants,
            'total_forecasts_generated' => $totalForecasts,
            'execution_time_seconds' => $executionTime,
        ]);
    }

    /**
     * Handle a job failure.
     *
     * @param \Throwable $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('GenerateDailyForecastJob: Job failed after all retry attempts', [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}