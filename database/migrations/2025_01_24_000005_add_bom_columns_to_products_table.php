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
            $table->enum('inventory_management_type', ['simple', 'bom'])->default('simple')->after('stock');
            $table->uuid('active_recipe_id')->nullable()->after('inventory_management_type');
            
            // Foreign key to recipes table
            $table->foreign('active_recipe_id')->references('id')->on('recipes')->onDelete('set null');
            
            // Index for filtering by inventory management type
            $table->index(['tenant_id', 'inventory_management_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropForeign(['active_recipe_id']);
            $table->dropIndex(['tenant_id', 'inventory_management_type']);
            $table->dropColumn(['inventory_management_type', 'active_recipe_id']);
        });
    }
};