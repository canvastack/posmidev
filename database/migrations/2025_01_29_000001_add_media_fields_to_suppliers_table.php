<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds media fields (image/photo) and map location fields to suppliers table
     * for Phase 1 MVP - Supplier Management Enhancement
     */
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            // Image/Photo fields
            $table->string('image_url', 500)->nullable()->after('address');
            $table->string('image_thumb_url', 500)->nullable()->after('image_url');
            
            // Map Location fields (storing coordinates)
            $table->decimal('latitude', 10, 8)->nullable()->after('image_thumb_url')
                ->comment('Latitude coordinate for supplier location');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude')
                ->comment('Longitude coordinate for supplier location');
            $table->string('location_address', 500)->nullable()->after('longitude')
                ->comment('Human-readable address from map');
            
            // Index for geospatial queries (optional, for future features)
            $table->index(['tenant_id', 'latitude', 'longitude'], 'suppliers_location_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            $table->dropIndex('suppliers_location_idx');
            $table->dropColumn([
                'image_url',
                'image_thumb_url',
                'latitude',
                'longitude',
                'location_address',
            ]);
        });
    }
};