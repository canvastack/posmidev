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
        Schema::table('products', function (Blueprint $table) {
            // Supplier relationship
            $table->uuid('supplier_id')->nullable()->after('category_id');

            // Unit of Measurement
            $table->string('uom', 50)->nullable()->after('stock');

            // Tax configuration
            $table->decimal('tax_rate', 5, 2)->nullable()->after('price');
            $table->boolean('tax_inclusive')->default(false)->after('tax_rate');

            // Indexes
            $table->index('supplier_id');
            $table->index('uom');

            // Foreign key (composite with tenant_id)
            // Note: suppliers table must exist first
            $table->foreign(['tenant_id', 'supplier_id'])
                ->references(['tenant_id', 'id'])
                ->on('suppliers')
                ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop foreign key first
            $table->dropForeign(['tenant_id', 'supplier_id']);

            // Drop columns
            $table->dropColumn([
                'supplier_id',
                'uom',
                'tax_rate',
                'tax_inclusive',
            ]);
        });
    }
};