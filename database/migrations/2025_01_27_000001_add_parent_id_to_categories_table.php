<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations - Add parent_id for hierarchical categories
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->uuid('parent_id')->nullable()->after('tenant_id');
            
            // Foreign key to self for hierarchy
            $table->foreign('parent_id')
                ->references('id')
                ->on('categories')
                ->onDelete('cascade');
            
            // Index for performance (querying children)
            $table->index(['tenant_id', 'parent_id'], 'idx_categories_tenant_parent');
        });
    }

    /**
     * Reverse the migrations
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropForeign(['parent_id']);
            $table->dropIndex('idx_categories_tenant_parent');
            $table->dropColumn('parent_id');
        });
    }
};