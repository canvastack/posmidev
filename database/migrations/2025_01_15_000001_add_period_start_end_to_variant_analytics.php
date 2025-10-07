<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Fixes Bug: Missing period_start and period_end columns
     * Analytics queries were failing with "column period_start does not exist"
     */
    public function up(): void
    {
        // Check if columns already exist (migration safety)
        if (!Schema::hasColumn('variant_analytics', 'period_start')) {
            Schema::table('variant_analytics', function (Blueprint $table) {
                $table->date('period_start')->nullable()->after('period_date');
                $table->date('period_end')->nullable()->after('period_start');
            });

            // Backfill existing data: period_start = period_end = period_date
            DB::statement("
                UPDATE variant_analytics 
                SET period_start = period_date, 
                    period_end = period_date 
                WHERE period_start IS NULL
            ");

            // Make columns non-nullable after backfill
            Schema::table('variant_analytics', function (Blueprint $table) {
                $table->date('period_start')->nullable(false)->change();
                $table->date('period_end')->nullable(false)->change();
            });

            // Drop old unique constraint if exists
            try {
                Schema::table('variant_analytics', function (Blueprint $table) {
                    $table->dropUnique('va_tenant_variant_period_unique');
                });
            } catch (\Exception $e) {
                // Constraint might not exist, continue
            }

            // Create new unique constraint with period_start
            Schema::table('variant_analytics', function (Blueprint $table) {
                $table->unique(
                    ['tenant_id', 'product_variant_id', 'period_start', 'period_type'], 
                    'va_tenant_variant_period_unique'
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('variant_analytics', 'period_start')) {
            // Drop new unique constraint
            Schema::table('variant_analytics', function (Blueprint $table) {
                $table->dropUnique('va_tenant_variant_period_unique');
            });

            // Restore old unique constraint
            Schema::table('variant_analytics', function (Blueprint $table) {
                $table->unique(
                    ['tenant_id', 'product_variant_id', 'period_date', 'period_type'], 
                    'va_tenant_variant_period_unique'
                );
            });

            // Drop the new columns
            Schema::table('variant_analytics', function (Blueprint $table) {
                $table->dropColumn(['period_start', 'period_end']);
            });
        }
    }
};