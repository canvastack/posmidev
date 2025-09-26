<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        // Fix duplicates by appending +suffix before adding a global unique index
        DB::transaction(function () {
            // Find duplicate emails (case-insensitive if DB is case-insensitive)
            $duplicates = DB::table('users')
                ->select('email', DB::raw('COUNT(*) as cnt'))
                ->groupBy('email')
                ->havingRaw('COUNT(*) > 1')
                ->get();

            foreach ($duplicates as $dup) {
                $users = DB::table('users')
                    ->where('email', $dup->email)
                    ->orderBy('created_at')
                    ->orderBy('id')
                    ->get();

                $keepFirst = true;
                $n = 1;
                foreach ($users as $u) {
                    if ($keepFirst) { $keepFirst = false; continue; }
                    // Rewrite email with +tenant suffix to ensure uniqueness
                    [$local, $domain] = array_pad(explode('@', $u->email, 2), 2, 'local.invalid');
                    $tenantCode = substr((string) $u->tenant_id, 0, 8);
                    $newEmail = sprintf('%s+%s%d@%s', $local, $tenantCode, $n, $domain);
                    $n++;
                    DB::table('users')->where('id', $u->id)->update(['email' => $newEmail]);
                }
            }

            // Drop existing composite unique if present and add global unique on email
            Schema::table('users', function (Blueprint $table) {
                // Best-effort drop of composite key; wrapped in try/catch via DB::statement if needed
                try { $table->dropUnique(['tenant_id', 'email']); } catch (\Throwable $e) {}
            });

            Schema::table('users', function (Blueprint $table) {
                $table->unique('email');
            });
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            try { $table->dropUnique(['email']); } catch (\Throwable $e) {}
            // Recreate the original composite unique
            $table->unique(['tenant_id', 'email']);
        });
    }
};