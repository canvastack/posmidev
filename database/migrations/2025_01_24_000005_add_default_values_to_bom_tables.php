<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Menambahkan default values untuk kolom yang tidak memiliki default
     * sesuai dengan analisis unit test failures
     * Compatible dengan PostgreSQL dan SQLite
     */
    public function up(): void
    {
        // Fix recipes.yield_unit - tambah default value 'pcs'
        if (Schema::hasTable('recipes')) {
            $connection = config('database.default');

            if ($connection === 'pgsql') {
                // PostgreSQL syntax
                DB::statement("ALTER TABLE recipes ALTER COLUMN yield_unit SET DEFAULT 'pcs'");
            } elseif ($connection === 'sqlite') {
                // SQLite approach: recreate table with new structure
                $this->recreateRecipesTableWithDefaults();
            }
        }

        // Fix recipe_materials.unit - tambah default value 'pcs'
        if (Schema::hasTable('recipe_materials')) {
            $connection = config('database.default');

            if ($connection === 'pgsql') {
                // PostgreSQL syntax
                DB::statement("ALTER TABLE recipe_materials ALTER COLUMN unit SET DEFAULT 'pcs'");
            } elseif ($connection === 'sqlite') {
                // SQLite approach: recreate table with new structure
                $this->recreateRecipeMaterialsTableWithDefaults();
            }
        }
    }

    /**
     * Recreate recipes table with default values for SQLite
     */
    private function recreateRecipesTableWithDefaults(): void
    {
        // Create new table with correct structure
        Schema::create('recipes_new', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('yield_quantity', 10, 3);
            $table->enum('yield_unit', ['pcs', 'kg', 'L', 'serving', 'batch'])->default('pcs');
            $table->boolean('is_active')->default(false);
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');

            // Indexes
            $table->index(['tenant_id', 'product_id', 'is_active']);
            $table->index(['tenant_id', 'deleted_at']);
        });

        // Copy data from old table to new table
        DB::statement("INSERT INTO recipes_new (id, tenant_id, product_id, name, description, yield_quantity, yield_unit, is_active, notes, deleted_at, created_at, updated_at)
                      SELECT id, tenant_id, product_id, name, description, yield_quantity, COALESCE(yield_unit, 'pcs'), is_active, notes, deleted_at, created_at, updated_at
                      FROM recipes");

        // Drop old table and rename new table
        Schema::dropIfExists('recipes');
        Schema::rename('recipes_new', 'recipes');
    }

    /**
     * Recreate recipe_materials table with default values for SQLite
     */
    private function recreateRecipeMaterialsTableWithDefaults(): void
    {
        // Create new table with correct structure
        Schema::create('recipe_materials_new', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('recipe_id');
            $table->uuid('material_id');
            $table->decimal('quantity_required', 10, 3);
            $table->string('unit')->default('pcs');
            $table->decimal('waste_percentage', 5, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('recipe_id')->references('id')->on('recipes')->onDelete('cascade');
            $table->foreign('material_id')->references('id')->on('materials')->onDelete('restrict');

            // Indexes
            $table->index(['tenant_id', 'recipe_id']);
            $table->index(['tenant_id', 'material_id']);

            // Unique constraint: one material per recipe
            $table->unique(['recipe_id', 'material_id']);
        });

        // Copy data from old table to new table
        DB::statement("INSERT INTO recipe_materials_new (id, tenant_id, recipe_id, material_id, quantity_required, unit, waste_percentage, notes, created_at, updated_at)
                      SELECT id, tenant_id, recipe_id, material_id, quantity_required, COALESCE(unit, 'pcs'), COALESCE(waste_percentage, 0), notes, created_at, updated_at
                      FROM recipe_materials");

        // Drop old table and rename new table
        Schema::dropIfExists('recipe_materials');
        Schema::rename('recipe_materials_new', 'recipe_materials');
    }

    /**
     * Reverse the migrations.
     * Menghapus default values jika diperlukan rollback
     * Compatible dengan PostgreSQL dan SQLite
     */
    public function down(): void
    {
        $connection = config('database.default');

        if ($connection === 'pgsql') {
            // PostgreSQL syntax
            if (Schema::hasTable('recipes')) {
                DB::statement("ALTER TABLE recipes ALTER COLUMN yield_unit DROP DEFAULT");
            }

            if (Schema::hasTable('recipe_materials')) {
                DB::statement("ALTER TABLE recipe_materials ALTER COLUMN unit DROP DEFAULT");
            }
        } elseif ($connection === 'sqlite') {
            // SQLite approach: recreate tables without defaults
            $this->recreateRecipesTableWithoutDefaults();
            $this->recreateRecipeMaterialsTableWithoutDefaults();
        }
    }

    /**
     * Recreate recipes table without default values for SQLite rollback
     */
    private function recreateRecipesTableWithoutDefaults(): void
    {
        // Create new table without defaults
        Schema::create('recipes_new', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('product_id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('yield_quantity', 10, 3);
            $table->enum('yield_unit', ['pcs', 'kg', 'L', 'serving', 'batch'])->nullable();
            $table->boolean('is_active')->default(false);
            $table->text('notes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');

            // Indexes
            $table->index(['tenant_id', 'product_id', 'is_active']);
            $table->index(['tenant_id', 'deleted_at']);
        });

        // Copy data from current table to new table
        DB::statement("INSERT INTO recipes_new (id, tenant_id, product_id, name, description, yield_quantity, yield_unit, is_active, notes, deleted_at, created_at, updated_at)
                      SELECT id, tenant_id, product_id, name, description, yield_quantity, yield_unit, is_active, notes, deleted_at, created_at, updated_at
                      FROM recipes");

        // Drop old table and rename new table
        Schema::dropIfExists('recipes');
        Schema::rename('recipes_new', 'recipes');
    }

    /**
     * Recreate recipe_materials table without default values for SQLite rollback
     */
    private function recreateRecipeMaterialsTableWithoutDefaults(): void
    {
        // Create new table without defaults
        Schema::create('recipe_materials_new', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->uuid('recipe_id');
            $table->uuid('material_id');
            $table->decimal('quantity_required', 10, 3);
            $table->string('unit')->nullable();
            $table->decimal('waste_percentage', 5, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('recipe_id')->references('id')->on('recipes')->onDelete('cascade');
            $table->foreign('material_id')->references('id')->on('materials')->onDelete('restrict');

            // Indexes
            $table->index(['tenant_id', 'recipe_id']);
            $table->index(['tenant_id', 'material_id']);

            // Unique constraint: one material per recipe
            $table->unique(['recipe_id', 'material_id']);
        });

        // Copy data from current table to new table
        DB::statement("INSERT INTO recipe_materials_new (id, tenant_id, recipe_id, material_id, quantity_required, unit, waste_percentage, notes, created_at, updated_at)
                      SELECT id, tenant_id, recipe_id, material_id, quantity_required, unit, COALESCE(waste_percentage, 0), notes, created_at, updated_at
                      FROM recipe_materials");

        // Drop old table and rename new table
        Schema::dropIfExists('recipe_materials');
        Schema::rename('recipe_materials_new', 'recipe_materials');
    }
};