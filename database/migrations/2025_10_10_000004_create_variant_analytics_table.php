<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 6: Product Variants - Analytics & Performance Tracking
     * This table stores aggregated analytics data for variant performance
     */
    public function up(): void
    {
        Schema::create('variant_analytics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_variant_id');
            
            // Time period for this analytics snapshot
            $table->date('period_date'); // Daily snapshot
            $table->string('period_type')->default('daily'); // daily, weekly, monthly
            
            // Sales metrics
            $table->integer('total_orders')->default(0); // Number of orders containing this variant
            $table->integer('quantity_sold')->default(0); // Total units sold
            $table->decimal('revenue', 15, 2)->default(0.00); // Total revenue generated
            $table->decimal('profit', 15, 2)->default(0.00); // Total profit (revenue - cost)
            
            // Stock metrics
            $table->integer('stock_start')->default(0); // Stock at start of period
            $table->integer('stock_end')->default(0); // Stock at end of period
            $table->integer('stock_added')->default(0); // Stock added during period
            $table->integer('stock_removed')->default(0); // Stock removed (sold + adjustments)
            $table->integer('days_out_of_stock')->default(0); // Number of days out of stock in period
            
            // Performance indicators
            $table->decimal('conversion_rate', 5, 2)->default(0.00); // % of views that resulted in sales
            $table->integer('view_count')->default(0); // How many times variant was viewed
            $table->integer('add_to_cart_count')->default(0); // How many times added to cart
            
            // Comparisons (to help with ranking)
            $table->decimal('revenue_rank_percentile', 5, 2)->nullable(); // Top X% performer
            $table->decimal('quantity_rank_percentile', 5, 2)->nullable(); // Top X% by quantity
            
            // Velocity metrics
            $table->decimal('stock_turnover_rate', 8, 4)->nullable(); // How quickly stock is moving
            $table->decimal('avg_daily_sales', 10, 2)->default(0.00); // Average units sold per day
            
            // Predictions (optional - can be populated by ML models later)
            $table->integer('predicted_sales_next_period')->nullable();
            $table->date('predicted_stockout_date')->nullable();
            
            // Timestamps
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            
            $table->foreign('product_variant_id')
                ->references('id')
                ->on('product_variants')
                ->onDelete('cascade');
            
            // Indexes for analytics queries
            $table->index(['tenant_id', 'period_date']); // Date range queries
            $table->index(['tenant_id', 'product_variant_id', 'period_date']); // Variant timeline
            $table->index(['tenant_id', 'period_date', 'revenue']); // Top revenue performers
            $table->index(['tenant_id', 'period_date', 'quantity_sold']); // Top selling variants
            $table->index(['tenant_id', 'period_type', 'period_date']); // Period type queries
            
            // Unique constraint (one record per variant per period)
            $table->unique(['tenant_id', 'product_variant_id', 'period_date', 'period_type'], 'va_tenant_variant_period_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('variant_analytics');
    }
};