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
        Schema::create('product_stock_history', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->integer('old_stock');
            $table->integer('new_stock');
            $table->integer('change_amount'); // calculated: new - old
            $table->enum('change_type', ['adjustment', 'sale', 'purchase', 'return', 'manual'])->default('manual');
            $table->uuid('reference_id')->nullable(); // FK to order/adjustment
            $table->string('reference_type')->nullable(); // Order, StockAdjustment, etc.
            $table->text('notes')->nullable();
            $table->uuid('changed_by');
            $table->timestamp('changed_at');
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->foreign('changed_by')->references('id')->on('users')->onDelete('cascade');

            // Indexes
            $table->index(['tenant_id', 'product_id']);
            $table->index(['tenant_id', 'change_type']);
            $table->index(['tenant_id', 'changed_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_stock_history');
    }
};