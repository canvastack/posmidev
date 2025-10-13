<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 5: Backend Analytics - Forecast Storage
     * Stores pre-calculated forecasts for performance optimization.
     */
    public function up(): void
    {
        Schema::create('analytics_forecasts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->date('forecast_date');
            $table->date('predicted_date');
            $table->string('metric_type', 50);
            $table->string('algorithm', 50);
            $table->decimal('predicted_value', 15, 2);
            $table->decimal('confidence_lower', 15, 2)->nullable();
            $table->decimal('confidence_upper', 15, 2)->nullable();
            $table->decimal('r_squared', 5, 4)->nullable();
            $table->jsonb('algorithm_params')->nullable();
            $table->timestamps();
            
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            
            $table->unique(['tenant_id', 'forecast_date', 'predicted_date', 'metric_type', 'algorithm'], 'forecast_unique');
            
            $table->index(['tenant_id', 'predicted_date'], 'idx_forecasts_tenant_predicted');
            $table->index(['tenant_id', 'forecast_date'], 'idx_forecasts_tenant_generated');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analytics_forecasts');
    }
};