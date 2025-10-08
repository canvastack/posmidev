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
            // Add soft deletes column
            $table->softDeletes();
            
            // Add index for performance (tenant_id + deleted_at queries)
            $table->index(['tenant_id', 'deleted_at'], 'products_tenant_deleted_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop index first
            $table->dropIndex('products_tenant_deleted_at_index');
            
            // Drop soft deletes column
            $table->dropSoftDeletes();
        });
    }
};
