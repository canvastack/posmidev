<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations - Migrate existing product->category relationships to new pivot table
     */
    public function up(): void
    {
        // Migrate existing category_id relationships to pivot table
        DB::statement("
            INSERT INTO category_product (category_id, product_id, is_primary, created_at, updated_at)
            SELECT 
                category_id,
                id as product_id,
                true as is_primary,
                NOW() as created_at,
                NOW() as updated_at
            FROM products
            WHERE category_id IS NOT NULL
        ");
        
        // Note: We keep category_id column for backward compatibility
        // It will be marked as deprecated but functional
    }

    /**
     * Reverse the migrations - Remove migrated data
     */
    public function down(): void
    {
        // Clear the pivot table (will be dropped by previous migration)
        DB::table('category_product')->truncate();
    }
};