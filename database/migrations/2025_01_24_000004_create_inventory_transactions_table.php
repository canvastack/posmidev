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
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('material_id');
            $table->enum('transaction_type', ['adjustment', 'deduction', 'restock']);
            $table->decimal('quantity_before', 10, 3);
            $table->decimal('quantity_change', 10, 3);
            $table->decimal('quantity_after', 10, 3);
            $table->enum('reason', ['purchase', 'waste', 'damage', 'count_adjustment', 'production', 'sale', 'other']);
            $table->text('notes')->nullable();
            $table->uuid('user_id')->nullable();
            
            // Polymorphic relation (reference to Order, Recipe, etc.)
            $table->string('reference_type')->nullable();
            $table->uuid('reference_id')->nullable();
            
            $table->timestamp('created_at')->useCurrent();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('material_id')->references('id')->on('materials')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');

            // Indexes for performance
            $table->index(['tenant_id', 'material_id', 'created_at']);
            $table->index(['tenant_id', 'transaction_type', 'created_at']);
            $table->index(['tenant_id', 'reference_type', 'reference_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
    }
};