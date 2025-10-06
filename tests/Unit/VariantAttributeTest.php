<?php

namespace Tests\Unit;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\VariantAttribute;
use Src\Pms\Infrastructure\Models\Tenant;

/**
 * Unit tests for VariantAttribute model
 * 
 * Tests: Fillable fields, casts, scopes, helper methods
 */
class VariantAttributeTest extends TestCase
{
    use RefreshDatabase;

    protected $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create();
    }

    /** @test */
    public function it_has_correct_fillable_fields()
    {
        $fillable = (new VariantAttribute())->getFillable();

        $expectedFields = [
            'tenant_id',
            'name',
            'slug',
            'description',
            'values',
            'display_type',
            'sort_order',
            'is_active',
            'price_modifiers',
            'visual_settings'
        ];

        foreach ($expectedFields as $field) {
            $this->assertContains($field, $fillable, "Field {$field} should be fillable");
        }
    }

    /** @test */
    public function it_casts_values_to_array()
    {
        $attribute = VariantAttribute::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Size',
            'slug' => 'size',
            'values' => ['S', 'M', 'L', 'XL']
        ]);

        $this->assertIsArray($attribute->values);
        $this->assertCount(4, $attribute->values);
    }

    /** @test */
    public function it_filters_by_tenant_scope()
    {
        $tenant2 = Tenant::factory()->create();

        VariantAttribute::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Size'
        ]);

        VariantAttribute::factory()->create([
            'tenant_id' => $tenant2->id,
            'name' => 'Color'
        ]);

        $attributes = VariantAttribute::forTenant($this->tenant->id)->get();

        $this->assertCount(1, $attributes);
        $this->assertEquals($this->tenant->id, $attributes->first()->tenant_id);
    }

    /** @test */
    public function it_adds_value_to_attribute()
    {
        $attribute = VariantAttribute::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Size',
            'slug' => 'size',
            'values' => ['S', 'M', 'L']
        ]);

        $attribute->addValue('XL');

        $this->assertContains('XL', $attribute->fresh()->values);
        $this->assertCount(4, $attribute->fresh()->values);
    }

    /** @test */
    public function it_removes_value_from_attribute()
    {
        $attribute = VariantAttribute::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Size',
            'slug' => 'size',
            'values' => ['S', 'M', 'L', 'XL']
        ]);

        $attribute->removeValue('XL');

        $this->assertNotContains('XL', $attribute->fresh()->values);
        $this->assertCount(3, $attribute->fresh()->values);
    }
}