<?php

namespace Tests\Feature;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\VariantAttribute;
use Tests\TestCase;

class VariantAttributesApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        // Create tenant
        $this->tenant = Tenant::factory()->create();

        // Create permissions
        Permission::findOrCreate('products.view', 'api');
        Permission::findOrCreate('products.create', 'api');
        Permission::findOrCreate('products.update', 'api');
        Permission::findOrCreate('products.delete', 'api');

        // Set Spatie team context for this tenant
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId((string) $this->tenant->id);

        // Create admin role with permissions for this tenant
        $adminRole = Role::create([
            'name' => 'Admin',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        
        $adminRole->givePermissionTo(['products.view', 'products.create', 'products.update', 'products.delete']);

        // Create user with admin role
        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $this->user->assignRole($adminRole);
    }

    /** @test */
    public function can_list_variant_attributes_with_pagination()
    {
        // Create multiple attributes
        VariantAttribute::factory()->size()->create(['tenant_id' => $this->tenant->id]);
        VariantAttribute::factory()->color()->create(['tenant_id' => $this->tenant->id]);
        VariantAttribute::factory()->material()->create(['tenant_id' => $this->tenant->id]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variant-attributes");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'slug',
                        'values',
                        'display_type',
                        'is_active',
                    ]
                ],
                'current_page',
                'last_page',
                'per_page',
                'total',
            ])
            ->assertJsonCount(3, 'data');
    }

    /** @test */
    public function can_create_variant_attribute()
    {
        $attributeData = [
            'name' => 'Size',
            'slug' => 'size',
            'description' => 'Product size options',
            'values' => ['XS', 'S', 'M', 'L', 'XL'],
            'display_type' => 'select',
            'sort_order' => 1,
            'is_active' => true,
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variant-attributes",
                $attributeData
            );

        $response->assertStatus(201)
            ->assertJsonFragment([
                'name' => 'Size',
                'slug' => 'size',
            ]);

        // Verify it's saved with correct tenant_id
        $this->assertDatabaseHas('variant_attributes', [
            'tenant_id' => $this->tenant->id,
            'slug' => 'size',
            'name' => 'Size',
        ]);
    }

    /** @test */
    public function can_show_single_variant_attribute()
    {
        $attribute = VariantAttribute::factory()->color()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variant-attributes/{$attribute->id}");

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $attribute->id,
                'name' => 'Color',
                'slug' => 'color',
            ]);
    }

    /** @test */
    public function can_update_variant_attribute()
    {
        $attribute = VariantAttribute::factory()->size()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $updateData = [
            'values' => ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
            'description' => 'Updated size options',
        ];

        $response = $this->actingAs($this->user, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/variant-attributes/{$attribute->id}",
                $updateData
            );

        $response->assertStatus(200);

        $this->assertDatabaseHas('variant_attributes', [
            'id' => $attribute->id,
            'description' => 'Updated size options',
        ]);
    }

    /** @test */
    public function can_delete_variant_attribute()
    {
        $attribute = VariantAttribute::factory()->material()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/variant-attributes/{$attribute->id}");

        $response->assertStatus(200);

        // Variant attributes use soft deletes
        $this->assertSoftDeleted('variant_attributes', [
            'id' => $attribute->id,
        ]);
    }

    /** @test */
    public function cannot_access_attribute_from_different_tenant()
    {
        // Create another tenant with attribute
        $otherTenant = Tenant::factory()->create();
        $otherAttribute = VariantAttribute::factory()->size()->create([
            'tenant_id' => $otherTenant->id,
        ]);

        // Try to access other tenant's attribute
        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variant-attributes/{$otherAttribute->id}");

        // Should get 404 because attribute doesn't exist in current tenant
        $response->assertStatus(404);
    }

    /** @test */
    public function cannot_update_attribute_from_different_tenant()
    {
        // Create another tenant with attribute
        $otherTenant = Tenant::factory()->create();
        $otherAttribute = VariantAttribute::factory()->color()->create([
            'tenant_id' => $otherTenant->id,
        ]);

        // Try to update other tenant's attribute
        $response = $this->actingAs($this->user, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/variant-attributes/{$otherAttribute->id}",
                ['description' => 'Should fail']
            );

        // Should get 404
        $response->assertStatus(404);

        // Verify it was NOT updated
        $this->assertDatabaseMissing('variant_attributes', [
            'id' => $otherAttribute->id,
            'description' => 'Should fail',
        ]);
    }

    /** @test */
    public function can_add_value_to_attribute()
    {
        $attribute = VariantAttribute::factory()->size()->create([
            'tenant_id' => $this->tenant->id,
            'values' => ['S', 'M', 'L'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variant-attributes/{$attribute->id}/values",
                ['value' => 'XL']
            );

        $response->assertStatus(200);

        $attribute->refresh();
        $this->assertContains('XL', $attribute->values);
    }

    /** @test */
    public function can_remove_value_from_attribute()
    {
        $attribute = VariantAttribute::factory()->size()->create([
            'tenant_id' => $this->tenant->id,
            'values' => ['S', 'M', 'L', 'XL'],
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->deleteJson(
                "/api/v1/tenants/{$this->tenant->id}/variant-attributes/{$attribute->id}/values",
                ['value' => 'XL']
            );

        $response->assertStatus(200);

        $attribute->refresh();
        $this->assertNotContains('XL', $attribute->values);
    }

    /** @test */
    public function can_get_popular_attributes()
    {
        // Create attributes with different usage counts
        VariantAttribute::factory()->size()->create([
            'tenant_id' => $this->tenant->id,
            'usage_count' => 100,
        ]);
        VariantAttribute::factory()->color()->create([
            'tenant_id' => $this->tenant->id,
            'usage_count' => 50,
        ]);
        VariantAttribute::factory()->material()->create([
            'tenant_id' => $this->tenant->id,
            'usage_count' => 25,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variant-attributes/popular?limit=2");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');

        // Verify they're ordered by usage_count desc
        $data = $response->json('data');
        $this->assertEquals('Size', $data[0]['name']); // highest usage_count
        $this->assertEquals('Color', $data[1]['name']); // second highest
    }

    /** @test */
    public function tenant_can_have_duplicate_slugs_across_different_tenants()
    {
        // Create attribute in first tenant
        VariantAttribute::factory()->size()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        // Create another tenant
        $otherTenant = Tenant::factory()->create();

        // Should be able to create same slug in different tenant
        $otherAttribute = VariantAttribute::factory()->size()->create([
            'tenant_id' => $otherTenant->id,
        ]);

        // Verify both exist
        $this->assertDatabaseHas('variant_attributes', [
            'tenant_id' => $this->tenant->id,
            'slug' => 'size',
        ]);

        $this->assertDatabaseHas('variant_attributes', [
            'tenant_id' => $otherTenant->id,
            'slug' => 'size',
        ]);
    }

    /** @test */
    public function unauthorized_user_cannot_access_attributes()
    {
        $response = $this->withHeaders([
            'Accept' => 'application/json',
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/variant-attributes");

        $response->assertStatus(401);
    }

    /** @test */
    public function can_filter_attributes_by_display_type()
    {
        VariantAttribute::factory()->size()->create([
            'tenant_id' => $this->tenant->id,
            'display_type' => 'select',
        ]);
        VariantAttribute::factory()->color()->create([
            'tenant_id' => $this->tenant->id,
            'display_type' => 'swatch',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variant-attributes?display_type=swatch");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }
}