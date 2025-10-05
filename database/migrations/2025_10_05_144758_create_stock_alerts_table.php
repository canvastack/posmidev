<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 5: Stock Management Enhancements
     * Creates stock_alerts table for tracking low stock alerts
     * 
     * CORE IMMUTABLE RULES ENFORCED:
     * - UUID primary key
     * - tenant_id with foreign key (tenant-scoped)
     * - Composite indexes for efficient queries
     */
    public function up(): void
    {
        Schema::create('stock_alerts', function (Blueprint $table) {
            // Primary Key (IMMUTABLE RULE: UUID)
            $table->uuid('id')->primary();
            
            // Tenant Scoping (IMMUTABLE RULE: MUST HAVE tenant_id)
            $table->uuid('tenant_id')->index();
            $table->foreign('tenant_id')->references('id')->on('tenants')
                ->onDelete('cascade');
            
            // Product Reference
            $table->uuid('product_id');
            $table->foreign('product_id')->references('id')->on('products')
                ->onDelete('cascade');
            
            // Alert Data
            $table->integer('current_stock')->comment('Stock level when alert was generated');
            $table->integer('reorder_point')->comment('Reorder point at time of alert');
            $table->enum('severity', ['low', 'critical', 'out_of_stock'])
                ->default('low')
                ->comment('low: stock <= reorder_point, critical: stock <= reorder_point/2, out_of_stock: stock = 0');
            
            // Alert Status
            $table->enum('status', ['pending', 'acknowledged', 'resolved', 'dismissed'])
                ->default('pending')
                ->index();
            
            // Notification Tracking
            $table->boolean('notified')->default(false)->comment('Has notification been sent?');
            $table->timestamp('notified_at')->nullable();
            
            // User Actions - Acknowledged By
            $table->uuid('acknowledged_by')->nullable();
            $table->foreign('acknowledged_by')->references('id')->on('users')
                ->onDelete('set null');
            $table->timestamp('acknowledged_at')->nullable();
            
            // User Actions - Resolved By
            $table->uuid('resolved_by')->nullable();
            $table->foreign('resolved_by')->references('id')->on('users')
                ->onDelete('set null');
            $table->timestamp('resolved_at')->nullable();
            
            // Additional Notes
            $table->text('notes')->nullable();
            
            // Timestamps
            $table->timestamps();
            
            // Composite Indexes for tenant-scoped queries (IMMUTABLE RULE)
            $table->index(['tenant_id', 'status'], 'idx_alerts_tenant_status');
            $table->index(['tenant_id', 'product_id', 'status'], 'idx_alerts_tenant_product');
            $table->index(['tenant_id', 'created_at'], 'idx_alerts_tenant_date');
            $table->index(['tenant_id', 'severity'], 'idx_alerts_tenant_severity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_alerts');
    }
};
