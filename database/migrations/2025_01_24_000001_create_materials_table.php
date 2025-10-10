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
        Schema::create('materials', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name');
            $table->string('sku')->nullable();
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->enum('unit', ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'bottle', 'can', 'bag']);
            $table->decimal('stock_quantity', 10, 3)->default(0);
            $table->decimal('reorder_level', 10, 3)->default(0);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->string('supplier')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');

            // Indexes
            $table->index(['tenant_id', 'deleted_at']);
            $table->index(['tenant_id', 'category']);
            
            // Unique constraint: SKU unique per tenant (excluding soft-deleted)
            // Note: Unique constraint with soft deletes handled at application level
            // or via partial index in PostgreSQL
        });

        // Add unique constraint for PostgreSQL (supports partial indexes)
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE UNIQUE INDEX materials_tenant_sku_unique ON materials (tenant_id, sku) WHERE deleted_at IS NULL');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('materials');
    }
};