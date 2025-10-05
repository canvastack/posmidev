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
     * Phase 5 - CRITICAL FIX: Add tenant_id to stock_adjustments
     * 
     * 🔒 IMMUTABLE RULE ENFORCEMENT:
     * - All data MUST be tenant-scoped
     * - tenant_id is MANDATORY for multi-tenancy
     * - Backfill existing records with product's tenant_id
     */
    public function up(): void
    {
        // Check if we're using SQLite (tests) - handle differently to avoid Doctrine DBAL requirement
        $driver = DB::connection()->getDriverName();
        
        if ($driver === 'sqlite') {
            // SQLite: Recreate table with tenant_id (no ALTER COLUMN MODIFY support)
            $this->recreateTableForSqlite();
        } else {
            // PostgreSQL/MySQL: Standard ALTER TABLE approach
            Schema::table('stock_adjustments', function (Blueprint $table) {
                // Add tenant_id column (nullable first for backfill)
                $table->uuid('tenant_id')->nullable()->after('id');
            });

            // Backfill tenant_id from products table
            DB::statement('
                UPDATE stock_adjustments sa
                SET tenant_id = (
                    SELECT p.tenant_id 
                    FROM products p 
                    WHERE p.id = sa.product_id
                )
                WHERE sa.tenant_id IS NULL
            ');

            Schema::table('stock_adjustments', function (Blueprint $table) {
                // Make tenant_id NOT NULL after backfill
                $table->uuid('tenant_id')->nullable(false)->change();
                
                // Add foreign key constraint
                $table->foreign('tenant_id')->references('id')->on('tenants')
                    ->onDelete('cascade');
                
                // Add composite indexes for tenant-scoped queries
                $table->index(['tenant_id', 'product_id', 'created_at'], 'idx_stock_adj_tenant_product');
                $table->index(['tenant_id', 'created_at'], 'idx_stock_adj_tenant_date');
            });
        }
    }

    /**
     * SQLite-specific migration (recreate table with tenant_id)
     * SQLite doesn't support ALTER COLUMN MODIFY without Doctrine DBAL
     */
    private function recreateTableForSqlite(): void
    {
        // Create new table with tenant_id
        Schema::create('stock_adjustments_new', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->uuid('user_id')->nullable();
            $table->integer('quantity');
            $table->string('reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->index(['tenant_id', 'product_id', 'created_at'], 'idx_stock_adj_tenant_product');
            $table->index(['tenant_id', 'created_at'], 'idx_stock_adj_tenant_date');
        });

        // Copy data with tenant_id from products
        DB::statement('
            INSERT INTO stock_adjustments_new (id, tenant_id, product_id, user_id, quantity, reason, notes, created_at, updated_at)
            SELECT 
                sa.id,
                COALESCE(p.tenant_id, sa.product_id) as tenant_id,
                sa.product_id,
                sa.user_id,
                sa.quantity,
                sa.reason,
                sa.notes,
                sa.created_at,
                sa.updated_at
            FROM stock_adjustments sa
            LEFT JOIN products p ON p.id = sa.product_id
        ');

        // Drop old table
        Schema::dropIfExists('stock_adjustments');

        // Rename new table
        Schema::rename('stock_adjustments_new', 'stock_adjustments');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stock_adjustments', function (Blueprint $table) {
            // Drop indexes
            $table->dropIndex('idx_stock_adj_tenant_product');
            $table->dropIndex('idx_stock_adj_tenant_date');
            
            // Drop foreign key
            $table->dropForeign(['tenant_id']);
            
            // Drop column
            $table->dropColumn('tenant_id');
        });
    }
};