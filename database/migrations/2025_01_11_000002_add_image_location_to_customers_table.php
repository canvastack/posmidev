<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add photo and delivery location fields to customers table.
     * - photo_url: Original uploaded customer photo
     * - photo_thumb_url: Thumbnail version (300x300px)
     * - delivery_latitude: GPS latitude for delivery address
     * - delivery_longitude: GPS longitude for delivery address
     * - delivery_address: Full text delivery address
     */
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // Photo fields
            $table->text('photo_url')->nullable()->after('address');
            $table->text('photo_thumb_url')->nullable()->after('photo_url');
            
            // Delivery location fields
            $table->decimal('delivery_latitude', 10, 8)->nullable()->after('photo_thumb_url');
            $table->decimal('delivery_longitude', 11, 8)->nullable()->after('delivery_latitude');
            $table->text('delivery_address')->nullable()->after('delivery_longitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'photo_url',
                'photo_thumb_url',
                'delivery_latitude',
                'delivery_longitude',
                'delivery_address',
            ]);
        });
    }
};