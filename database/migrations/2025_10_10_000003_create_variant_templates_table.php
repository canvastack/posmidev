<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Phase 6: Product Variants - Templates System
     * This table stores pre-defined variant templates for quick setup
     * (e.g., "Clothing Standard", "Footwear", "Electronics")
     */
    public function up(): void
    {
        Schema::create('variant_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->nullable(); // NULL for system templates
            
            // Template identification
            $table->string('name'); // e.g., "Clothing - Standard Sizes"
            $table->string('slug')->nullable();
            $table->text('description')->nullable();
            
            // Template category
            $table->string('category')->nullable(); // clothing, footwear, electronics, food_beverage, custom
            
            // Template configuration (JSONB)
            // Example structure:
            // {
            //   "attributes": [
            //     {"name": "Size", "values": ["XS", "S", "M", "L", "XL", "XXL"]},
            //     {"name": "Color", "values": ["Black", "White", "Red", "Blue"]}
            //   ],
            //   "sku_pattern": "{PRODUCT}-{SIZE}-{COLOR}",
            //   "price_modifiers": {
            //     "Size": {"XL": 5, "XXL": 10},
            //     "Color": {"Black": 2}
            //   },
            //   "default_values": {
            //     "stock": 100,
            //     "reorder_point": 20
            //   }
            // }
            $table->jsonb('configuration');
            
            // Template metadata
            $table->boolean('is_system')->default(false); // System templates are read-only
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false); // Show in featured templates
            
            // Preview/thumbnail
            $table->string('thumbnail_path')->nullable();
            $table->string('icon')->nullable(); // Icon name for UI (e.g., "shirt", "shoe", "laptop")
            
            // Usage tracking
            $table->integer('usage_count')->default(0); // How many times this template has been used
            $table->timestamp('last_used_at')->nullable();
            
            // Estimated variant count (for UX preview)
            $table->integer('estimated_variant_count')->default(0); // Calculated from configuration
            
            // Tags for search/filter
            $table->jsonb('tags')->nullable(); // ["popular", "apparel", "basic"]
            
            // Timestamps
            $table->timestamps();
            $table->softDeletes();
            
            // Foreign keys (tenant_id can be NULL for system templates)
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
            
            // Indexes
            $table->index(['tenant_id', 'category']); // Filter by category
            $table->index(['tenant_id', 'is_active']); // Active templates
            $table->index(['is_system', 'is_active']); // System templates
            $table->index(['tenant_id', 'is_featured']); // Featured templates
            
            // Unique constraints
            $table->unique(['tenant_id', 'name'], 'vt_tenant_name_unique'); // Template name unique per tenant
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('variant_templates');
    }
};