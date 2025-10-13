<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations - Many-to-many relationship for products and categories
     */
    public function up(): void
    {
        Schema::create('category_product', function (Blueprint $table) {
            $table->uuid('category_id');
            $table->uuid('product_id');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
            
            // Foreign keys
            $table->foreign('category_id')
                ->references('id')
                ->on('categories')
                ->onDelete('cascade');
            
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
            
            // Composite primary key (category_id + product_id)
            $table->primary(['category_id', 'product_id'], 'category_product_pk');
            
            // Index for performance
            $table->index('product_id', 'idx_category_product_product');
            $table->index('category_id', 'idx_category_product_category');
            $table->index('is_primary', 'idx_category_product_primary');
        });
    }

    /**
     * Reverse the migrations
     */
    public function down(): void
    {
        Schema::dropIfExists('category_product');
    }
};