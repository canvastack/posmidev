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
     * Adds reorder point, reorder quantity, and low stock alert fields
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Reorder Point Configuration
            $table->integer('reorder_point')->default(0)->after('stock')
                ->comment('Minimum stock level before reorder alert');
            
            $table->integer('reorder_quantity')->default(0)->after('reorder_point')
                ->comment('Quantity to order when stock reaches reorder point');
            
            // Alert Configuration
            $table->boolean('low_stock_alert_enabled')->default(true)->after('reorder_quantity')
                ->comment('Enable/disable low stock alerts for this product');
            
            // Timestamps for tracking
            $table->timestamp('last_alerted_at')->nullable()->after('low_stock_alert_enabled')
                ->comment('Last time low stock alert was sent');
            
            // Indexes for efficient low stock queries
            $table->index(['tenant_id', 'stock', 'reorder_point'], 'idx_products_low_stock');
            $table->index(['tenant_id', 'low_stock_alert_enabled'], 'idx_products_alerts_enabled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop indexes first
            $table->dropIndex('idx_products_low_stock');
            $table->dropIndex('idx_products_alerts_enabled');
            
            // Drop columns
            $table->dropColumn([
                'reorder_point',
                'reorder_quantity',
                'low_stock_alert_enabled',
                'last_alerted_at'
            ]);
        });
    }
};
