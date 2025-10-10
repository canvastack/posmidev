<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates product_search_terms table for tracking product search queries.
     * Supports analytics for popular search terms, zero-result searches, and trends.
     */
    public function up(): void
    {
        Schema::create('product_search_terms', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('search_term')->index();
            $table->uuid('user_id')->nullable()->index();
            $table->integer('results_count')->default(0)->index();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('searched_at')->index();
            $table->timestamps();

            // Foreign keys
            $table->foreign('tenant_id')->references('id')->on('tenants')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');

            // Indexes for analytics queries
            $table->index(['tenant_id', 'search_term', 'searched_at']);
            $table->index(['tenant_id', 'searched_at']);
            $table->index(['tenant_id', 'results_count']);
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