<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds image and location fields to tenants table for:
     * - Logo upload (full-size and thumbnail)
     * - Business location (latitude, longitude, address)
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            // Image fields
            $table->string('logo_url')->nullable()->after('logo');
            $table->string('logo_thumb_url')->nullable()->after('logo_url');
            
            // Location fields
            $table->decimal('latitude', 10, 8)->nullable()->after('address');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            $table->string('location_address', 500)->nullable()->after('longitude');
            
            // Index for location queries
            $table->index(['latitude', 'longitude'], 'idx_tenant_location');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex('idx_tenant_location');
            $table->dropColumn([
                'logo_url',
                'logo_thumb_url',
                'latitude',
                'longitude',
                'location_address',
            ]);
        });
    }
};
