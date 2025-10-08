<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('analytics_daily_summary', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->date('date');
            $table->string('metric_type', 50); // 'product_views', 'searches', 'sales'
            $table->uuid('product_id')->nullable(); // NULL for tenant-wide metrics
            $table->jsonb('metric_value'); // Flexible data structure
            $table->timestamps();

            // Foreign key
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            // Unique constraint: one summary per tenant, date, metric type, and product
            $table->unique(['tenant_id', 'date', 'metric_type', 'product_id'], 'analytics_summary_unique');

            // Indexes for query performance
            $table->index(['tenant_id', 'date'], 'idx_analytics_summary_tenant_date');
            $table->index(['tenant_id', 'metric_type'], 'idx_analytics_summary_tenant_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analytics_daily_summary');
    }
};