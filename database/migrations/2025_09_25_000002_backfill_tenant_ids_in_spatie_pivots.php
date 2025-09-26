<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Backfill tenant_id in model_has_roles and model_has_permissions from users table
        // model_has_roles
        // Ensure model_has_roles.tenant_id is UUID before backfill (drop PK/unique if needed)
        DB::statement('ALTER TABLE "model_has_roles" DROP CONSTRAINT IF EXISTS model_has_roles_role_model_type_primary');
        DB::statement('ALTER TABLE "model_has_roles" DROP CONSTRAINT IF EXISTS model_has_roles_pkey');
        DB::statement('ALTER TABLE "model_has_roles" DROP CONSTRAINT IF EXISTS mhr_role_model_type_tenant_unique');
        DB::statement('ALTER TABLE "model_has_roles" ALTER COLUMN "tenant_id" TYPE uuid USING (tenant_id::text)::uuid');
        DB::statement('ALTER TABLE "model_has_roles" ADD CONSTRAINT model_has_roles_role_model_type_primary PRIMARY KEY ("tenant_id","role_id","model_uuid","model_type")');

        DB::statement(<<<SQL
            UPDATE model_has_roles m
               SET tenant_id = u.tenant_id
              FROM users u
             WHERE m.model_type = 'Src\\Pms\\Infrastructure\\Models\\User'
               AND m.model_uuid = u.id::text
               AND m.tenant_id IS NULL
        SQL);

        // Some older rows might have App\\Models\\User (unlikely here, but safe to include)
        DB::statement(<<<SQL
            UPDATE model_has_roles m
               SET tenant_id = u.tenant_id
              FROM users u
             WHERE m.model_type = 'App\\Models\\User'
               AND m.model_uuid = u.id::text
               AND m.tenant_id IS NULL
        SQL);

        // model_has_permissions
        // Ensure model_has_permissions.tenant_id is UUID before backfill (drop PK/unique if needed)
        DB::statement('ALTER TABLE "model_has_permissions" DROP CONSTRAINT IF EXISTS model_has_permissions_permission_model_type_primary');
        DB::statement('ALTER TABLE "model_has_permissions" DROP CONSTRAINT IF EXISTS model_has_permissions_pkey');
        DB::statement('ALTER TABLE "model_has_permissions" DROP CONSTRAINT IF EXISTS mhp_perm_model_type_tenant_unique');
        DB::statement('ALTER TABLE "model_has_permissions" ALTER COLUMN "tenant_id" TYPE uuid USING (tenant_id::text)::uuid');
        DB::statement('ALTER TABLE "model_has_permissions" ADD CONSTRAINT model_has_permissions_permission_model_type_primary PRIMARY KEY ("tenant_id","permission_id","model_uuid","model_type")');

        DB::statement(<<<SQL
            UPDATE model_has_permissions m
               SET tenant_id = u.tenant_id
              FROM users u
             WHERE m.model_type = 'Src\\Pms\\Infrastructure\\Models\\User'
               AND m.model_uuid = u.id::text
               AND m.tenant_id IS NULL
        SQL);

        DB::statement(<<<SQL
            UPDATE model_has_permissions m
               SET tenant_id = u.tenant_id
              FROM users u
             WHERE m.model_type = 'App\\Models\\User'
               AND m.model_uuid = u.id::text
               AND m.tenant_id IS NULL
        SQL);
    }

    public function down(): void
    {
        // No-op: we won't null tenant_id again.
    }
};