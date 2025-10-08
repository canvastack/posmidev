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
        Schema::table('products', function (Blueprint $table) {
            // Add unique constraint on (tenant_id, id) if not exists
            // This is required for foreign key references from other tables (product_tags, etc.)
            $table->unique(['tenant_id', 'id'], 'products_tenant_id_id_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop unique constraint
            $table->dropUnique('products_tenant_id_id_unique');
        });
    }
};
