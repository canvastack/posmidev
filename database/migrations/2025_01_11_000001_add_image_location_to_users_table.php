<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Adds image and location fields to users table for:
     * - Profile photo with thumbnail
     * - Home/work location tracking for field staff, delivery drivers
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Profile Photo fields
            $table->text('profile_photo_url')->nullable()->after('photo');
            $table->text('profile_photo_thumb_url')->nullable()->after('profile_photo_url');
            
            // Location fields
            $table->decimal('home_latitude', 10, 8)->nullable()->after('phone_number');
            $table->decimal('home_longitude', 11, 8)->nullable()->after('home_latitude');
            $table->text('home_address')->nullable()->after('home_longitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'profile_photo_url',
                'profile_photo_thumb_url',
                'home_latitude',
                'home_longitude',
                'home_address',
            ]);
        });
    }
};