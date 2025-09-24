<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            // Drop existing composite index if present
            DB::statement('DROP INDEX IF EXISTS personal_access_tokens_tokenable_type_tokenable_id_index');

            // Add a temporary UUID column
            DB::statement('ALTER TABLE personal_access_tokens ADD COLUMN tokenable_id_uuid uuid');

            // We cannot convert bigint to uuid; leave existing rows NULL (dev-safe)
            // Future inserts will use UUIDs from users

            // Drop the old bigint column
            DB::statement('ALTER TABLE personal_access_tokens DROP COLUMN tokenable_id');

            // Rename the UUID column to tokenable_id
            DB::statement('ALTER TABLE personal_access_tokens RENAME COLUMN tokenable_id_uuid TO tokenable_id');

            // Recreate composite index
            DB::statement('CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON personal_access_tokens (tokenable_type, tokenable_id)');
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            // Drop composite index if present
            DB::statement('DROP INDEX IF EXISTS personal_access_tokens_tokenable_type_tokenable_id_index');

            // Add back bigint column
            DB::statement('ALTER TABLE personal_access_tokens ADD COLUMN tokenable_id_bigint bigint');

            // Drop current uuid column
            DB::statement('ALTER TABLE personal_access_tokens DROP COLUMN tokenable_id');

            // Rename bigint back to tokenable_id
            DB::statement('ALTER TABLE personal_access_tokens RENAME COLUMN tokenable_id_bigint TO tokenable_id');

            // Recreate composite index
            DB::statement('CREATE INDEX personal_access_tokens_tokenable_type_tokenable_id_index ON personal_access_tokens (tokenable_type, tokenable_id)');
        }
    }
};