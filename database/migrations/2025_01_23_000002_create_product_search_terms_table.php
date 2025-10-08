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
        Schema::create('product_search_terms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id');
            $table->string('search_term', 255);
            $table->uuid('user_id')->nullable(); // NULL for anonymous searches
            $table->integer('results_count')->default(0);
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('searched_at')->useCurrent();
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')
                ->references('id')
                ->on('tenants')
                ->onDelete('cascade');

            $table->foreign('user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            // Indexes for analytics queries
            $table->index(['tenant_id', 'search_term'], 'idx_search_terms_tenant_term');
            $table->index(['tenant_id', 'searched_at'], 'idx_search_terms_tenant_searched');
            $table->index(['tenant_id', 'results_count'], 'idx_search_terms_tenant_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_search_terms');
    }
};