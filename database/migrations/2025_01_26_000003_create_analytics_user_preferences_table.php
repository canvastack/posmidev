<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 5: Backend Analytics - User Preferences
     * Stores user-configurable analytics settings (thresholds, notifications, etc).
     */
    public function up(): void
    {
        Schema::create('analytics_user_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('user_id')->nullable();
            
            $table->integer('anomaly_window_days')->default(7);
            $table->decimal('anomaly_threshold_low', 5, 2)->default(1.5);
            $table->decimal('anomaly_threshold_medium', 5, 2)->default(2.0);
            $table->decimal('anomaly_threshold_high', 5, 2)->default(2.5);
            $table->decimal('anomaly_threshold_critical', 5, 2)->default(3.0);
            
            $table->integer('forecast_days_ahead')->default(30);
            $table->string('forecast_algorithm', 50)->default('linear_regression');
            
            $table->boolean('email_notifications_enabled')->default(true);
            $table->jsonb('notification_severity_filter')->default('["high", "critical"]');
            $table->string('notification_digest_frequency', 20)->default('daily');
            
            $table->integer('benchmark_baseline_days')->default(30);
            
            $table->timestamps();
            
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            $table->unique(['tenant_id', 'user_id'], 'prefs_tenant_user_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analytics_user_preferences');
    }
};