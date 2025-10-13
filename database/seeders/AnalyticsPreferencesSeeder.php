<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\AnalyticsUserPreference;

/**
 * AnalyticsPreferencesSeeder
 * 
 * Phase 5: Backend Analytics - Default Preferences
 * Seeds default analytics preferences for all tenants.
 */
class AnalyticsPreferencesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenants = Tenant::all();

        foreach ($tenants as $tenant) {
            AnalyticsUserPreference::updateOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'user_id' => null,
                ],
                [
                    'id' => Str::uuid(),
                    'anomaly_window_days' => 7,
                    'anomaly_threshold_low' => 1.5,
                    'anomaly_threshold_medium' => 2.0,
                    'anomaly_threshold_high' => 2.5,
                    'anomaly_threshold_critical' => 3.0,
                    'forecast_days_ahead' => 30,
                    'forecast_algorithm' => 'linear_regression',
                    'email_notifications_enabled' => true,
                    'notification_severity_filter' => ['high', 'critical'],
                    'notification_digest_frequency' => 'daily',
                    'benchmark_baseline_days' => 30,
                ]
            );
        }

        $this->command->info('Analytics preferences seeded for ' . $tenants->count() . ' tenants');
    }
}