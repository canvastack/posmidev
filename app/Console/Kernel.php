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