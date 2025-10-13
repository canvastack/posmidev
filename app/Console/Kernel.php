<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Phase 5: POS Analytics - Daily Forecast Generation
        // Runs daily at 00:00 AM (Asia/Jakarta timezone)
        // Generates revenue, transaction, and average ticket forecasts for all tenants
        // Forecasts are stored in analytics_forecasts table for 30 days ahead
        $schedule->job(new \App\Jobs\Analytics\GenerateDailyForecastJob)
            ->dailyAt('00:00')
            ->timezone('Asia/Jakarta')
            ->withoutOverlapping();

        // Phase 5: POS Analytics - Anomaly Detection
        // Runs every 5 minutes
        // Detects anomalies in sales data using Z-Score analysis
        // Critical anomalies trigger email notifications
        $schedule->job(new \App\Jobs\Analytics\DetectAnomaliesJob)
            ->everyFiveMinutes()
            ->withoutOverlapping();

        // Phase 5: Stock Management - Low Stock Alert Check
        // Runs daily at 09:00 AM (Asia/Jakarta timezone)
        // Checks all products across all tenants for low stock conditions
        // and creates alerts + sends notifications
        $schedule->command('stock:check-low-alerts --notify')
            ->dailyAt('09:00')
            ->timezone('Asia/Jakarta')
            ->withoutOverlapping()
            ->runInBackground()
            ->onSuccess(function () {
                \Log::info('Low stock alert check completed successfully');
            })
            ->onFailure(function () {
                \Log::error('Low stock alert check failed');
            });

        // Phase 6: Variant Analytics - Daily Calculation
        // Runs daily at 02:00 AM (Asia/Jakarta timezone)
        // Calculates daily analytics for all variants across all tenants
        // Includes sales, stock, conversion metrics, and performance ranks
        $schedule->command('variants:calculate-analytics')
            ->dailyAt('02:00')
            ->timezone('Asia/Jakarta')
            ->withoutOverlapping()
            ->runInBackground()
            ->onSuccess(function () {
                \Log::info('Variant analytics calculation completed successfully');
            })
            ->onFailure(function () {
                \Log::error('Variant analytics calculation failed');
            });

        // Phase 6: Variant Analytics - Weekly Aggregation
        // Runs every Monday at 03:00 AM (Asia/Jakarta timezone)
        // Aggregates daily analytics into weekly summaries
        $schedule->command('variants:calculate-analytics --aggregate=weekly')
            ->weeklyOn(1, '03:00')
            ->timezone('Asia/Jakarta')
            ->withoutOverlapping()
            ->runInBackground()
            ->onSuccess(function () {
                \Log::info('Weekly variant analytics aggregation completed');
            })
            ->onFailure(function () {
                \Log::error('Weekly variant analytics aggregation failed');
            });

        // Phase 6: Variant Analytics - Monthly Aggregation
        // Runs on the 1st day of each month at 04:00 AM (Asia/Jakarta timezone)
        // Aggregates daily analytics into monthly summaries
        $schedule->command('variants:calculate-analytics --aggregate=monthly')
            ->monthlyOn(1, '04:00')
            ->timezone('Asia/Jakarta')
            ->withoutOverlapping()
            ->runInBackground()
            ->onSuccess(function () {
                \Log::info('Monthly variant analytics aggregation completed');
            })
            ->onFailure(function () {
                \Log::error('Monthly variant analytics aggregation failed');
            });
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}