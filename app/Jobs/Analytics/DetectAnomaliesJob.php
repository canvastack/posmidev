<?php

namespace App\Jobs\Analytics;

use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Src\Pms\Core\Services\Analytics\AnomalyDetectionService;

/**
 * Background job to detect anomalies in sales data for all tenants.
 * 
 * This job runs every 5 minutes and analyzes the previous day's sales data
 * for anomalies using Z-Score statistical analysis.
 * 
 * When critical anomalies are detected, a notification job is dispatched.
 * 
 * @see AnomalyDetectionService
 * @see SendAnomalyAlertJob
 */
class DetectAnomaliesJob implements ShouldQueue
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
    public $backoff = 30;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 300; // 5 minutes

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
     * @param AnomalyDetectionService $anomalyService
     * @return void
     */
    public function handle(AnomalyDetectionService $anomalyService): void
    {
        Log::info('DetectAnomaliesJob: Starting anomaly detection for all tenants');

        $startTime = microtime(true);
        $tenants = Tenant::all();
        $totalAnomalies = 0;
        $criticalAnomalies = 0;
        $failedTenants = 0;

        // Analyze yesterday's data
        $yesterday = Carbon::yesterday()->toDateString();
        $startDate = Carbon::yesterday()->subDays(30)->toDateString(); // 30-day window

        foreach ($tenants as $tenant) {
            try {
                Log::info("DetectAnomaliesJob: Processing tenant {$tenant->id} ({$tenant->name})");

                // Detect anomalies for the date range
                $anomalies = $anomalyService->detectAnomalies(
                    tenantId: $tenant->id,
                    startDate: $startDate,
                    endDate: $yesterday
                );

                if (count($anomalies) > 0) {
                    $totalAnomalies += count($anomalies);
                    
                    Log::info("DetectAnomaliesJob: Detected anomalies for tenant {$tenant->id}", [
                        'anomalies_count' => count($anomalies),
                    ]);

                    // Dispatch notification job for critical anomalies
                    foreach ($anomalies as $anomaly) {
                        if ($anomaly->severity === 'critical') {
                            $criticalAnomalies++;
                            
                            Log::info("DetectAnomaliesJob: Dispatching alert for critical anomaly", [
                                'tenant_id' => $tenant->id,
                                'anomaly_id' => $anomaly->id,
                                'detected_date' => $anomaly->detected_date,
                                'metric_type' => $anomaly->metric_type,
                                'variance_percent' => $anomaly->variance_percent,
                            ]);

                            // Dispatch email notification job
                            SendAnomalyAlertJob::dispatch($anomaly->id);
                        }
                    }
                } else {
                    Log::info("DetectAnomaliesJob: No anomalies detected for tenant {$tenant->id}");
                }
            } catch (\Exception $e) {
                $failedTenants++;
                Log::error("DetectAnomaliesJob: Failed to process tenant {$tenant->id}", [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString(),
                ]);
            }
        }

        $executionTime = round(microtime(true) - $startTime, 2);

        Log::info('DetectAnomaliesJob: Completed', [
            'tenants_processed' => $tenants->count(),
            'tenants_failed' => $failedTenants,
            'total_anomalies_detected' => $totalAnomalies,
            'critical_anomalies' => $criticalAnomalies,
            'date_range' => "{$startDate} to {$yesterday}",
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
        Log::error('DetectAnomaliesJob: Job failed after all retry attempts', [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }
}