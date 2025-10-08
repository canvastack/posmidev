<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('product_tags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('name', 100);
            $table->string('color', 20)->nullable();
            $table->timestamps();

            // Indexes
            $table->index('tenant_id');
            $table->unique(['tenant_id', 'name']);
            // Unique constraint for foreign key references
            $table->unique(['tenant_id', 'id'], 'product_tags_tenant_id_id_unique');

            // Foreign key
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');
        });

        // Pivot table
        Schema::create('product_tag_pivot', function (Blueprint $table) {
            $table->uuid('product_id');
            $table->uuid('tag_id');
            $table->uuid('tenant_id');

            // Composite primary key
            $table->primary(['product_id', 'tag_id', 'tenant_id'], 'product_tag_pivot_pk');

            // Indexes
            $table->index('tenant_id');
            $table->index('product_id');
            $table->index('tag_id');

            // Foreign keys
            $table->foreign(['tenant_id', 'product_id'])
                ->references(['tenant_id', 'id'])
                ->on('products')
                ->onDelete('cascade');

            $table->foreign(['tenant_id', 'tag_id'])
                ->references(['tenant_id', 'id'])
                ->on('product_tags')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_tag_pivot');
        Schema::dropIfExists('product_tags');
    }
};