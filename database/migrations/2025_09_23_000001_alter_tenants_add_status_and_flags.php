<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (!Schema::hasColumn('tenants', 'status')) {
                $table->string('status')->default('pending')->after('logo'); // active|inactive|pending|banned
            }
            if (!Schema::hasColumn('tenants', 'can_auto_activate_users')) {
                $table->boolean('can_auto_activate_users')->default(false)->after('status');
            }
            if (!Schema::hasColumn('tenants', 'auto_activate_request_pending')) {
                $table->boolean('auto_activate_request_pending')->default(false)->after('can_auto_activate_users');
            }
            if (!Schema::hasColumn('tenants', 'auto_activate_requested_at')) {
                $table->timestamp('auto_activate_requested_at')->nullable()->after('auto_activate_request_pending');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'auto_activate_requested_at')) {
                $table->dropColumn('auto_activate_requested_at');
            }
            if (Schema::hasColumn('tenants', 'auto_activate_request_pending')) {
                $table->dropColumn('auto_activate_request_pending');
            }
            if (Schema::hasColumn('tenants', 'can_auto_activate_users')) {
                $table->dropColumn('can_auto_activate_users');
            }
            if (Schema::hasColumn('tenants', 'status')) {
                $table->dropColumn('status');
            }
        });
    }
};