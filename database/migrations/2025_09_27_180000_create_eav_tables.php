<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eav_blueprints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->string('target_entity'); // e.g., 'customer'
            $table->string('name');
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('eav_fields', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('tenant_id')->index();
            $table->uuid('blueprint_id');
            $table->string('key');
            $table->string('label');
            $table->string('type'); // enum enforced in code: string|text|number|boolean|date|enum|json
            $table->boolean('required')->default(false);
            $table->json('options')->nullable(); // enum list or extra constraints
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('blueprint_id')->references('id')->on('eav_blueprints')->onDelete('cascade');
            $table->unique(['tenant_id','blueprint_id','key']);
        });

        Schema::create('eav_values', function (Blueprint $table) {
            $table->uuid('tenant_id');
            $table->uuid('blueprint_id');
            $table->string('entity_type'); // 'customer'
            $table->uuid('entity_id');
            $table->uuid('field_id');
            $table->text('value_text')->nullable();
            $table->decimal('value_number', 20, 4)->nullable();
            $table->boolean('value_boolean')->nullable();
            $table->date('value_date')->nullable();
            $table->json('value_jsonb')->nullable();
            $table->timestamps();

            $table->primary(['tenant_id','entity_type','entity_id','field_id']);
            $table->index(['tenant_id', 'entity_type', 'entity_id']);
            $table->index(['tenant_id', 'field_id']);
            $table->foreign('blueprint_id')->references('id')->on('eav_blueprints')->onDelete('cascade');
            $table->foreign('field_id')->references('id')->on('eav_fields')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eav_values');
        Schema::dropIfExists('eav_fields');
        Schema::dropIfExists('eav_blueprints');
    }
};