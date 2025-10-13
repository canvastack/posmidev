<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 5: Backend Analytics - Anomaly Detection Storage
     * Stores detected anomalies for historical tracking and notifications.
     */
    public function up(): void
    {
        Schema::create('analytics_anomalies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->date('detected_date');
            $table->string('metric_type', 50);
            $table->string('anomaly_type', 20);
            $table->string('severity', 20);
            $table->decimal('actual_value', 15, 2);
            $table->decimal('expected_value', 15, 2);
            $table->decimal('variance_percent', 10, 2);
            $table->decimal('z_score', 10, 4);
            $table->text('context_data')->nullable();
            $table->boolean('acknowledged')->default(false);
            $table->uuid('acknowledged_by')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
            
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('acknowledged_by')->references('id')->on('users')->onDelete('set null');
            
            $table->index(['tenant_id', 'detected_date'], 'idx_anomalies_tenant_date');
            $table->index(['tenant_id', 'severity'], 'idx_anomalies_tenant_severity');
            $table->index(['tenant_id', 'acknowledged'], 'idx_anomalies_tenant_ack');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analytics_anomalies');
    }
};