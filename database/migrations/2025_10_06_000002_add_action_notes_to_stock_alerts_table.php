<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 5: Stock Management Enhancements - Action Notes Fix
     * Adds separate notes fields for each action (acknowledge, resolve, dismiss)
     * to preserve history of actions taken on alerts.
     * 
     * CORE IMMUTABLE RULES: Enforced through existing tenant_id
     */
    public function up(): void
    {
        Schema::table('stock_alerts', function (Blueprint $table) {
            // Add action-specific notes fields
            $table->text('acknowledged_notes')->nullable()
                ->after('acknowledged_at')
                ->comment('Notes when alert was acknowledged');
            
            $table->text('resolved_notes')->nullable()
                ->after('resolved_at')
                ->comment('Notes when alert was resolved');
            
            $table->text('dismissed_notes')->nullable()
                ->after('notes')
                ->comment('Notes when alert was dismissed');
            
            // User who dismissed the alert (currently using resolved_by incorrectly)
            $table->uuid('dismissed_by')->nullable()
                ->after('resolved_at');
            $table->foreign('dismissed_by')->references('id')->on('users')
                ->onDelete('set null');
            
            $table->timestamp('dismissed_at')->nullable()
                ->after('dismissed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_alerts', function (Blueprint $table) {
            // Drop foreign keys first
            $table->dropForeign(['dismissed_by']);
            
            // Drop columns
            $table->dropColumn([
                'acknowledged_notes',
                'resolved_notes',
                'dismissed_notes',
                'dismissed_by',
                'dismissed_at',
            ]);
        });
    }
};