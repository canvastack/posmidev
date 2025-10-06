<?php

namespace Tests\Feature;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\VariantAttribute;
use Tests\TestCase;

class ProductVariantsApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Tenant $tenant;
    protected string $token;
    protected Product $product;

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

        // Create product with variants enabled
        $this->product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'has_variants' => true,
        ]);
    }

    /** @test */
    public function can_list_product_variants_with_pagination()
    {
        // Create multiple variants
        ProductVariant::factory()->count(5)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'sku',
                        'name',
                        'price',
                        'cost_price',
                        'stock',
                        'attributes',
                        'is_active',
                    ]
                ],
                'current_page',
                'last_page',
                'per_page',
                'total',
            ])
            ->assertJsonCount(5, 'data');
    }

    /** @test */
    public function can_create_product_variant()
    {
        $variantData = [
            'sku' => 'PROD-001-L-RED',
            'name' => 'Large Red',
            'price' => 99.99,
            'cost_price' => 50.00,
            'stock' => 100,
            'attributes' => [
                'size' => 'L',
                'color' => 'Red'
            ],
            'is_active' => true,
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants",
            $variantData
        );

        $response->assertStatus(201)
            ->assertJsonFragment([
                'sku' => 'PROD-001-L-RED',
                'name' => 'Large Red',
            ]);

        // Verify it's saved with correct tenant_id
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'PROD-001-L-RED',
        ]);
    }

    /** @test */
    public function can_show_single_variant()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'TEST-VARIANT-001',
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}"
            );

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $variant->id,
                'sku' => 'TEST-VARIANT-001',
            ]);
    }

    /** @test */
    public function can_update_variant()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VARIANT-001',
            'price' => 50.00,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}",
                [
                    'sku' => 'VARIANT-001',
                    'price' => 75.00
                ]
            );

        $response->assertStatus(200)
            ->assertJsonFragment(['price' => '75.00']);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'price' => 75.00,
        ]);
    }

    /** @test */
    public function can_delete_variant()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->deleteJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}"
            );

        $response->assertStatus(200);

        // Product variants use soft deletes
        $this->assertSoftDeleted('product_variants', [
            'id' => $variant->id,
        ]);
    }

    /** @test */
    public function cannot_access_variant_from_different_tenant()
    {
        // Create another tenant with product and variant
        $otherTenant = Tenant::factory()->create();
        $otherProduct = Product::factory()->create([
            'tenant_id' => $otherTenant->id,
            'has_variants' => true,
        ]);
        $otherVariant = ProductVariant::factory()->create([
            'tenant_id' => $otherTenant->id,
            'product_id' => $otherProduct->id,
        ]);

        // Try to access other tenant's variant
        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$otherProduct->id}/variants/{$otherVariant->id}"
            );

        // Should get 404 because product doesn't exist in current tenant
        $response->assertStatus(404);
    }

    /** @test */
    public function cannot_create_variant_for_product_in_different_tenant()
    {
        // Create another tenant with product
        $otherTenant = Tenant::factory()->create();
        $otherProduct = Product::factory()->create([
            'tenant_id' => $otherTenant->id,
            'has_variants' => true,
        ]);

        $variantData = [
            'sku' => 'CROSS-TENANT-ATTEMPT',
            'name' => 'Should Fail',
            'price' => 99.99,
            'cost_price' => 50.00,
            'stock' => 100,
        ];

        // Try to create variant for other tenant's product
        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$otherProduct->id}/variants",
                $variantData
            );

        // Should fail because product doesn't exist in current tenant
        $response->assertStatus(404);

        // Verify variant was NOT created
        $this->assertDatabaseMissing('product_variants', [
            'sku' => 'CROSS-TENANT-ATTEMPT',
        ]);
    }

    /** @test */
    public function can_reserve_and_release_variant_stock()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
            'reserved_stock' => 0,
        ]);

        // Reserve stock
        $reserveResponse = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}/reserve",
                ['quantity' => 10]
            );

        $reserveResponse->assertStatus(200);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'reserved_stock' => 10,
        ]);

        // Release stock
        $releaseResponse = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}/release",
                ['quantity' => 5]
            );

        $releaseResponse->assertStatus(200);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'reserved_stock' => 5,
        ]);
    }

    /** @test */
    public function unauthorized_user_cannot_access_variants()
    {
        $response = $this->withHeaders([
            'Accept' => 'application/json',
        ])->getJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants");

        $response->assertStatus(401);
    }

    /** @test */
    public function can_filter_variants_by_active_status()
    {
        // Create active and inactive variants
        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'is_active' => true,
        ]);

        ProductVariant::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'is_active' => false,
        ]);

        // Filter for active only
        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants?is_active=true"
            );

        $response->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }
}