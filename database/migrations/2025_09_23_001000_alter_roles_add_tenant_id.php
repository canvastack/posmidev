<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (!Schema::hasColumn('roles', 'tenant_id')) {
                $table->uuid('tenant_id')->nullable()->after('guard_name');
                $table->index('tenant_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            if (Schema::hasColumn('roles', 'tenant_id')) {
                // Postgres-safe: drop index only if exists
                try { \Illuminate\Support\Facades\DB::statement('DROP INDEX IF EXISTS roles_tenant_id_index'); } catch (\Throwable $e) {}
                try { $table->dropColumn('tenant_id'); } catch (\Throwable $e) {}
            }
        });
    }
};