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

    /** @test */
    public function can_search_variants_by_sku()
    {
        // Create variants with specific SKUs
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'SEARCH-001-RED',
            'name' => 'Red Variant',
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'SEARCH-002-BLUE',
            'name' => 'Blue Variant',
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'OTHER-003-GREEN',
            'name' => 'Green Variant',
        ]);

        // Search for 'SEARCH' in SKU
        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants?search=SEARCH"
            );

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    /** @test */
    public function can_search_variants_by_name()
    {
        // Create variants with specific names
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VAR-001',
            'name' => 'Large Red Shirt',
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VAR-002',
            'name' => 'Large Blue Shirt',
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VAR-003',
            'name' => 'Small Green Pants',
        ]);

        // Search for 'Shirt' in name
        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants?search=Shirt"
            );

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data');
    }

    /** @test */
    public function can_filter_variants_by_price_range()
    {
        // Create variants with different prices
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'price' => 50.00,
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'price' => 100.00,
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'price' => 150.00,
        ]);

        // Filter by price range (75-125)
        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants?min_price=75&max_price=125"
            );

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    /** @test */
    public function can_filter_variants_by_stock_level()
    {
        // Create variants with different stock levels
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 0, // Out of stock
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 5, // Low stock
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100, // In stock
        ]);

        // Filter for in-stock variants only
        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants?stock_status=in_stock"
            );

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data'); // Should return variants with stock > 0
    }

    /** @test */
    public function can_sort_variants_by_price()
    {
        // Create variants with different prices
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VAR-HIGH',
            'price' => 150.00,
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VAR-LOW',
            'price' => 50.00,
        ]);

        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'VAR-MID',
            'price' => 100.00,
        ]);

        // Sort by price ascending
        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants?sort_by=price&sort_order=asc"
            );

        $response->assertStatus(200);
        $data = $response->json('data');

        $this->assertEquals('VAR-LOW', $data[0]['sku']);
        $this->assertEquals('VAR-MID', $data[1]['sku']);
        $this->assertEquals('VAR-HIGH', $data[2]['sku']);
    }

    /** @test */
    public function cannot_create_variant_without_permission()
    {
        // Create user without create permission
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId((string) $this->tenant->id);

        $limitedRole = Role::create([
            'name' => 'Limited',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $limitedRole->givePermissionTo(['products.view']); // Only view permission

        $limitedUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
        $limitedUser->assignRole($limitedRole);

        $variantData = [
            'sku' => 'TEST-NO-PERM',
            'name' => 'No Permission',
            'price' => 50.00,
            'cost_price' => 25.00,
            'stock' => 10,
        ];

        $response = $this->actingAs($limitedUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants",
                $variantData
            );

        $response->assertStatus(403);
    }

    /** @test */
    public function cannot_update_variant_without_permission()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'price' => 50.00,
        ]);

        // Create user without update permission
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId((string) $this->tenant->id);

        $limitedRole = Role::create([
            'name' => 'ViewOnly',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $limitedRole->givePermissionTo(['products.view']);

        $limitedUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
        $limitedUser->assignRole($limitedRole);

        $response = $this->actingAs($limitedUser, 'api')
            ->patchJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}",
                ['price' => 75.00]
            );

        $response->assertStatus(403);
    }

    /** @test */
    public function cannot_delete_variant_without_permission()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        // Create user without delete permission
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId((string) $this->tenant->id);

        $limitedRole = Role::create([
            'name' => 'NoDelete',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $limitedRole->givePermissionTo(['products.view', 'products.update']);

        $limitedUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);
        $limitedUser->assignRole($limitedRole);

        $response = $this->actingAs($limitedUser, 'api')
            ->deleteJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}"
            );

        $response->assertStatus(403);
    }

    /** @test */
    public function can_update_variant_stock()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 100,
        ]);

        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}/stock",
                [
                    'adjustment' => -10,
                    'reason' => 'Sale',
                ]
            );

        $response->assertStatus(200);

        $this->assertDatabaseHas('product_variants', [
            'id' => $variant->id,
            'stock' => 90,
        ]);
    }

    /** @test */
    public function cannot_reserve_more_stock_than_available()
    {
        $variant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'stock' => 10,
            'reserved_stock' => 0,
        ]);

        // Try to reserve more than available
        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants/{$variant->id}/reserve",
                ['quantity' => 15] // More than stock
            );

        $response->assertStatus(422);
    }

    /** @test */
    public function pagination_works_correctly()
    {
        // Create 25 variants (more than default per_page)
        ProductVariant::factory()->count(25)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        // Get first page
        $response = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants?per_page=10"
            );

        $response->assertStatus(200)
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('per_page', 10)
            ->assertJsonPath('total', 25)
            ->assertJsonCount(10, 'data');

        // Get second page
        $response2 = $this->actingAs($this->user, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants?per_page=10&page=2"
            );

        $response2->assertStatus(200)
            ->assertJsonPath('current_page', 2)
            ->assertJsonCount(10, 'data');
    }

    /** @test */
    public function cannot_create_variant_for_product_without_has_variants_flag()
    {
        // Create product without variants enabled
        $nonVariantProduct = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'has_variants' => false,
        ]);

        $variantData = [
            'sku' => 'SHOULD-FAIL',
            'name' => 'Should Fail',
            'price' => 50.00,
            'cost_price' => 25.00,
            'stock' => 10,
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$nonVariantProduct->id}/variants",
                $variantData
            );

        $response->assertStatus(422);
    }

    /** @test */
    public function validates_required_fields_on_create()
    {
        $invalidData = [
            'name' => 'Missing Required Fields',
            // Missing: sku, price
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants",
                $invalidData
            );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['sku', 'price']);
    }

    /** @test */
    public function validates_price_is_numeric()
    {
        $invalidData = [
            'sku' => 'TEST-001',
            'name' => 'Test Variant',
            'price' => 'not-a-number', // Invalid
            'cost_price' => 25.00,
            'stock' => 10,
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants",
                $invalidData
            );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['price']);
    }

    /** @test */
    public function validates_stock_is_integer()
    {
        $invalidData = [
            'sku' => 'TEST-002',
            'name' => 'Test Variant',
            'price' => 50.00,
            'cost_price' => 25.00,
            'stock' => 'not-a-number', // Invalid
        ];

        $response = $this->actingAs($this->user, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}/variants",
                $invalidData
            );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['stock']);
    }
}