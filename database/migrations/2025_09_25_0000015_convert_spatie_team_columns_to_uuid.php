<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // ROLES: convert tenant_id to uuid and normalize constraints
        try { DB::statement('ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_guard_name_unique"'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_tenant_id_name_guard_name_unique"'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_name_guard_tenant_unique"'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS roles_team_foreign_key_index'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS roles_tenant_id_index'); } catch (\Throwable $e) {}

        // Ensure column exists before altering
        try { DB::statement('ALTER TABLE "roles" ALTER COLUMN "tenant_id" DROP NOT NULL'); } catch (\Throwable $e) {}
        try { DB::statement('UPDATE "roles" SET "tenant_id" = NULL'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "roles" ALTER COLUMN "tenant_id" TYPE uuid USING (tenant_id::text)::uuid'); } catch (\Throwable $e) {}
        try { DB::statement('CREATE INDEX IF NOT EXISTS roles_tenant_id_index ON "roles" ("tenant_id")'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "roles" ADD CONSTRAINT roles_name_guard_tenant_unique UNIQUE ("tenant_id","name","guard_name")'); } catch (\Throwable $e) {}

        // MODEL_HAS_ROLES: convert tenant_id to uuid
        try { DB::statement('ALTER TABLE "model_has_roles" DROP CONSTRAINT IF EXISTS model_has_roles_role_model_type_primary'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_roles" DROP CONSTRAINT IF EXISTS mhr_role_model_type_tenant_unique'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS model_has_roles_team_foreign_key_index'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS model_has_roles_tenant_id_index'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_roles" ALTER COLUMN "tenant_id" DROP NOT NULL'); } catch (\Throwable $e) {}
        try { DB::statement('UPDATE "model_has_roles" SET "tenant_id" = NULL'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_roles" ALTER COLUMN "tenant_id" TYPE uuid USING (tenant_id::text)::uuid'); } catch (\Throwable $e) {}
        try { DB::statement('CREATE INDEX IF NOT EXISTS model_has_roles_team_foreign_key_index ON "model_has_roles" ("tenant_id")'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_roles" ADD CONSTRAINT model_has_roles_role_model_type_primary PRIMARY KEY ("tenant_id","role_id","model_uuid","model_type")'); } catch (\Throwable $e) {}

        // MODEL_HAS_PERMISSIONS: convert tenant_id to uuid
        try { DB::statement('ALTER TABLE "model_has_permissions" DROP CONSTRAINT IF EXISTS model_has_permissions_permission_model_type_primary'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS model_has_permissions_team_foreign_key_index'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS model_has_permissions_tenant_id_index'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_permissions" ALTER COLUMN "tenant_id" DROP NOT NULL'); } catch (\Throwable $e) {}
        try { DB::statement('UPDATE "model_has_permissions" SET "tenant_id" = NULL'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_permissions" ALTER COLUMN "tenant_id" TYPE uuid USING (tenant_id::text)::uuid'); } catch (\Throwable $e) {}
        try { DB::statement('CREATE INDEX IF NOT EXISTS model_has_permissions_team_foreign_key_index ON "model_has_permissions" ("tenant_id")'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_permissions" ADD CONSTRAINT model_has_permissions_permission_model_type_primary PRIMARY KEY ("tenant_id","permission_id","model_uuid","model_type")'); } catch (\Throwable $e) {}
    }

    public function down(): void
    {
        // Best-effort rollback: revert to BIGINT columns (all set to NULL), re-create indexes/PKs
        try { DB::statement('ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS roles_name_guard_tenant_unique'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS roles_tenant_id_index'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "roles" ALTER COLUMN "tenant_id" TYPE bigint USING NULL'); } catch (\Throwable $e) {}
        try { DB::statement('CREATE INDEX IF NOT EXISTS roles_team_foreign_key_index ON "roles" ("tenant_id")'); } catch (\Throwable $e) {}

        try { DB::statement('ALTER TABLE "model_has_roles" DROP CONSTRAINT IF EXISTS model_has_roles_role_model_type_primary'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS model_has_roles_team_foreign_key_index'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_roles" ALTER COLUMN "tenant_id" TYPE bigint USING NULL'); } catch (\Throwable $e) {}
        try { DB::statement('CREATE INDEX IF NOT EXISTS model_has_roles_team_foreign_key_index ON "model_has_roles" ("tenant_id")'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_roles" ADD CONSTRAINT model_has_roles_role_model_type_primary PRIMARY KEY ("tenant_id","role_id","model_uuid","model_type")'); } catch (\Throwable $e) {}

        try { DB::statement('ALTER TABLE "model_has_permissions" DROP CONSTRAINT IF EXISTS model_has_permissions_permission_model_type_primary'); } catch (\Throwable $e) {}
        try { DB::statement('DROP INDEX IF EXISTS model_has_permissions_team_foreign_key_index'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_permissions" ALTER COLUMN "tenant_id" TYPE bigint USING NULL'); } catch (\Throwable $e) {}
        try { DB::statement('CREATE INDEX IF NOT EXISTS model_has_permissions_team_foreign_key_index ON "model_has_permissions" ("tenant_id")'); } catch (\Throwable $e) {}
        try { DB::statement('ALTER TABLE "model_has_permissions" ADD CONSTRAINT model_has_permissions_permission_model_type_primary PRIMARY KEY ("tenant_id","permission_id","model_uuid","model_type")'); } catch (\Throwable $e) {}
    }
};