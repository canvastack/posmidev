<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 6: Product Variants - Attribute Definitions
     * This table stores the master list of variant attributes (Size, Color, Material, etc.)
     * and their possible values per tenant
     */
    public function up(): void
    {
        Schema::create('variant_attributes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            
            // Attribute definition
            $table->string('name'); // e.g., "Size", "Color", "Material"
            $table->string('slug')->nullable(); // e.g., "size", "color", "material" (for API/code use)
            $table->text('description')->nullable();
            
            // Attribute values (JSONB array)
            // Example: ["S", "M", "L", "XL", "XXL"]
            // Example: ["Red", "Blue", "Green", "Yellow"]
            $table->jsonb('values')->nullable();
            
            // Display settings
            $table->string('display_type')->default('select'); // select, swatch, button, radio
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            
            // Pricing impact (optional)
            // Example: {"S": 0, "M": 0, "L": 5, "XL": 10, "XXL": 15}
            // This allows automatic price modifiers based on attribute values
            $table->jsonb('price_modifiers')->nullable();
            
            // Visual settings for swatches (for colors, materials, etc.)
            // Example: {"Red": "#FF0000", "Blue": "#0000FF", "Green": "#00FF00"}
            $table->jsonb('visual_settings')->nullable();
            
            // Usage tracking
            $table->integer('usage_count')->default(0); // How many products use this attribute
            
            // Timestamps
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            
            // Indexes
            $table->index(['tenant_id', 'name']); // Common queries
            $table->index(['tenant_id', 'slug']); // Slug lookups
            $table->index(['tenant_id', 'is_active']); // Active attributes
            
            // Unique constraints
            $table->unique(['tenant_id', 'name']); // Attribute name unique per tenant
            $table->unique(['tenant_id', 'slug'], 'va_tenant_slug_unique'); // Slug unique per tenant (if provided)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('variant_attributes');
    }
};