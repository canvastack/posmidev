<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 6: Product Variants - Update Products Table
     * Add fields to track whether a product has variants and variant count
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Variant tracking
            $table->boolean('has_variants')->default(false)->after('stock');
            $table->integer('variant_count')->default(0)->after('has_variants');
            
            // When a product has variants, the base product's stock becomes calculated
            // This flag helps determine whether to use product.stock or sum(variants.stock)
            $table->boolean('manage_stock_by_variant')->default(false)->after('variant_count');
            
            // Index for filtering products with variants
            $table->index(['tenant_id', 'has_variants']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'has_variants']);
            $table->dropColumn(['has_variants', 'variant_count', 'manage_stock_by_variant']);
        });
    }
};