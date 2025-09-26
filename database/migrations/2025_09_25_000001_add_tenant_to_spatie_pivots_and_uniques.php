<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Ensure roles has unique by (tenant_id, name, guard_name)
        Schema::table('roles', function (Blueprint $table) {
            // add tenant_id if missing (kept nullable for now to allow backfill)
            if (!Schema::hasColumn('roles', 'tenant_id')) {
                $table->uuid('tenant_id')->nullable()->after('guard_name');
                $table->index('tenant_id');
            }
            // Drop existing unique on (name, guard_name) if exists, then add new (Postgres-safe)
            try { \Illuminate\Support\Facades\DB::statement('ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_guard_name_unique"'); } catch (\Throwable $e) {}
            try { $table->unique(['tenant_id','name','guard_name'], 'roles_name_guard_tenant_unique'); } catch (\Throwable $e) {}
        });

        // model_has_roles: add tenant_id and composite unique
        Schema::table('model_has_roles', function (Blueprint $table) {
            if (!Schema::hasColumn('model_has_roles', 'tenant_id')) {
                $table->uuid('tenant_id')->nullable()->after('role_id');
                $table->index('tenant_id');
            }
            // Primary key may exist; ensure composite uniqueness including tenant
            // We'll add a covering unique to enforce tenancy scoping
            if (!Schema::hasIndex('model_has_roles', 'mhr_role_model_type_tenant_unique')) {
                $table->unique(['tenant_id', 'role_id', 'model_uuid', 'model_type'], 'mhr_role_model_type_tenant_unique');
            }
        });

        // model_has_permissions: add tenant_id and composite unique
        Schema::table('model_has_permissions', function (Blueprint $table) {
            if (!Schema::hasColumn('model_has_permissions', 'tenant_id')) {
                $table->uuid('tenant_id')->nullable()->after('permission_id');
                $table->index('tenant_id');
            }
            if (!Schema::hasIndex('model_has_permissions', 'mhp_perm_model_type_tenant_unique')) {
                $table->unique(['tenant_id', 'permission_id', 'model_uuid', 'model_type'], 'mhp_perm_model_type_tenant_unique');
            }
        });

        // Ensure tenant_id types are UUID even if created as BIGINT by earlier tables
        try { \Illuminate\Support\Facades\DB::statement('ALTER TABLE "roles" ALTER COLUMN "tenant_id" TYPE uuid USING (tenant_id::text)::uuid'); } catch (\Throwable $e) {}
        try { \Illuminate\Support\Facades\DB::statement('ALTER TABLE "model_has_roles" ALTER COLUMN "tenant_id" TYPE uuid USING (tenant_id::text)::uuid'); } catch (\Throwable $e) {}
        try { \Illuminate\Support\Facades\DB::statement('ALTER TABLE "model_has_permissions" ALTER COLUMN "tenant_id" TYPE uuid USING (tenant_id::text)::uuid'); } catch (\Throwable $e) {}
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            try { \Illuminate\Support\Facades\DB::statement('ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_guard_tenant_unique"'); } catch (\Throwable $e) {}
            // Postgres-safe: drop index only if exists
            try { \Illuminate\Support\Facades\DB::statement('DROP INDEX IF EXISTS roles_tenant_id_index'); } catch (\Throwable $e) {}
            try { $table->dropColumn('tenant_id'); } catch (\Throwable $e) {}
        });
        Schema::table('model_has_roles', function (Blueprint $table) {
            // Postgres-safe: drop constraint/index only if exists
            try { \Illuminate\Support\Facades\DB::statement('ALTER TABLE "model_has_roles" DROP CONSTRAINT IF EXISTS "mhr_role_model_type_tenant_unique"'); } catch (\Throwable $e) {}
            try { \Illuminate\Support\Facades\DB::statement('DROP INDEX IF EXISTS model_has_roles_tenant_id_index'); } catch (\Throwable $e) {}
            try { $table->dropColumn('tenant_id'); } catch (\Throwable $e) {}
        });
        Schema::table('model_has_permissions', function (Blueprint $table) {
            // Postgres-safe: drop constraint/index only if exists
            try { \Illuminate\Support\Facades\DB::statement('ALTER TABLE "model_has_permissions" DROP CONSTRAINT IF EXISTS "mhp_perm_model_type_tenant_unique"'); } catch (\Throwable $e) {}
            try { \Illuminate\Support\Facades\DB::statement('DROP INDEX IF EXISTS model_has_permissions_tenant_id_index'); } catch (\Throwable $e) {}
            try { $table->dropColumn('tenant_id'); } catch (\Throwable $e) {}
        });
    }
};