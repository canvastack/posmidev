<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 6: Product Variants - Core variant storage
     * This table stores individual product variants with their unique attributes
     */
    public function up(): void
    {
        Schema::create('product_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            
            // Variant identification
            $table->string('sku')->index(); // Unique SKU per variant
            $table->string('name')->nullable(); // Optional variant name (e.g., "Red - Large")
            
            // Variant attributes (flexible JSONB for PostgreSQL)
            // Example: {"size": "L", "color": "Red", "material": "Cotton"}
            $table->jsonb('attributes')->nullable();
            
            // Pricing
            $table->decimal('price', 15, 2); // Variant-specific price
            $table->decimal('cost_price', 15, 2)->nullable(); // Variant-specific cost
            $table->decimal('price_modifier', 10, 2)->default(0.00); // Price difference from base product
            
            // Stock management
            $table->integer('stock')->default(0);
            $table->integer('reserved_stock')->default(0); // Stock reserved for orders
            $table->integer('available_stock')->storedAs('stock - reserved_stock'); // Computed column
            
            // Reorder settings (can differ per variant)
            $table->integer('reorder_point')->nullable();
            $table->integer('reorder_quantity')->nullable();
            $table->boolean('low_stock_alert_enabled')->default(true);
            
            // Images
            $table->string('image_path')->nullable(); // Variant-specific image
            $table->string('thumbnail_path')->nullable();
            
            // Barcode
            $table->string('barcode')->nullable()->index();
            
            // Visibility & Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_default')->default(false); // Is this the default variant?
            $table->integer('sort_order')->default(0); // Display order
            
            // Metadata
            $table->text('notes')->nullable();
            $table->jsonb('metadata')->nullable(); // Extra flexible data
            
            // Timestamps
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            
            $table->foreign('product_id')
                ->references('id')
                ->on('products')
                ->onDelete('cascade');
            
            // Indexes for performance
            $table->index(['tenant_id', 'product_id']); // Most common query
            $table->index(['tenant_id', 'sku']); // SKU lookups
            $table->index(['tenant_id', 'is_active']); // Active variants
            $table->index(['tenant_id', 'product_id', 'is_default']); // Default variant
            
            // Unique constraints
            $table->unique(['tenant_id', 'sku']); // SKU unique per tenant
            $table->unique(['tenant_id', 'product_id', 'barcode'], 'pv_tenant_product_barcode_unique'); // Barcode unique per product
        });

        // GIN index for JSONB attributes (PostgreSQL-specific for fast attribute searches)
        // This allows efficient queries like: WHERE attributes @> '{"color": "Red"}'
        // Must be created after the table exists
        DB::statement('CREATE INDEX product_variants_attributes_gin ON product_variants USING gin (attributes)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_variants');
    }
};