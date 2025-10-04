<?php

namespace Tests\Feature;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;

class ProductPermissionsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Tenant $otherTenant;
    private User $adminUser;
    private User $managerUser;
    private User $cashierUser;
    private User $noPermissionUser;
    private User $otherTenantUser;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        // Create tenants
        $this->tenant = Tenant::factory()->create(['name' => 'Test Tenant']);
        $this->otherTenant = Tenant::factory()->create(['name' => 'Other Tenant']);

        // Create permissions
        $guard = 'api';
        Permission::findOrCreate('products.view', $guard);
        Permission::findOrCreate('products.create', $guard);
        Permission::findOrCreate('products.update', $guard);
        Permission::findOrCreate('products.delete', $guard);

        // Set team context for this tenant
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId((string) $this->tenant->id);

        // Create roles with different permission sets
        $adminRole = Role::create(['name' => 'admin', 'guard_name' => $guard, 'tenant_id' => (string) $this->tenant->id]);
        $adminRole->givePermissionTo(['products.view', 'products.create', 'products.update', 'products.delete']);

        $managerRole = Role::create(['name' => 'manager', 'guard_name' => $guard, 'tenant_id' => (string) $this->tenant->id]);
        $managerRole->givePermissionTo(['products.view', 'products.create', 'products.update']);

        $cashierRole = Role::create(['name' => 'cashier', 'guard_name' => $guard, 'tenant_id' => (string) $this->tenant->id]);
        $cashierRole->givePermissionTo(['products.view']);

        $noPermRole = Role::create(['name' => 'viewer', 'guard_name' => $guard, 'tenant_id' => (string) $this->tenant->id]);
        // No permissions assigned

        // Create users
        $this->adminUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->adminUser->assignRole($adminRole);

        $this->managerUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->managerUser->assignRole($managerRole);

        $this->cashierUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->cashierUser->assignRole($cashierRole);

        $this->noPermissionUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->noPermissionUser->assignRole($noPermRole);

        // Create user in other tenant
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId((string) $this->otherTenant->id);
        $otherAdminRole = Role::create(['name' => 'admin', 'guard_name' => $guard, 'tenant_id' => (string) $this->otherTenant->id]);
        $otherAdminRole->givePermissionTo(['products.view', 'products.create', 'products.update', 'products.delete']);
        
        $this->otherTenantUser = User::factory()->create(['tenant_id' => $this->otherTenant->id]);
        $this->otherTenantUser->assignRole($otherAdminRole);

        // Reset team context
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId(null);

        // Create a product for testing
        $this->product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'sku' => 'TEST-001',
            'price' => 10000,
            'stock' => 100,
        ]);
    }

    /** @test */
    public function admin_can_view_products()
    {
        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/products");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'name', 'sku', 'price', 'stock']
                ]
            ]);
    }

    /** @test */
    public function cashier_can_view_products()
    {
        $response = $this->actingAs($this->cashierUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/products");

        $response->assertOk();
    }

    /** @test */
    public function user_without_view_permission_cannot_view_products()
    {
        $response = $this->actingAs($this->noPermissionUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/products");

        $response->assertForbidden();
    }

    /** @test */
    public function admin_can_create_product()
    {
        $productData = [
            'name' => 'New Product',
            'sku' => 'NEW-001',
            'price' => 15000,
            'stock' => 50,
        ];

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products", $productData);

        $response->assertCreated()
            ->assertJsonFragment(['name' => 'New Product']);

        $this->assertDatabaseHas('products', [
            'tenant_id' => $this->tenant->id,
            'name' => 'New Product',
            'sku' => 'NEW-001',
        ]);
    }

    /** @test */
    public function manager_can_create_product()
    {
        $productData = [
            'name' => 'Manager Product',
            'sku' => 'MGR-001',
            'price' => 12000,
            'stock' => 30,
        ];

        $response = $this->actingAs($this->managerUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products", $productData);

        $response->assertCreated();
    }

    /** @test */
    public function cashier_cannot_create_product()
    {
        $productData = [
            'name' => 'Cashier Product',
            'sku' => 'CSH-001',
            'price' => 10000,
            'stock' => 20,
        ];

        $response = $this->actingAs($this->cashierUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products", $productData);

        $response->assertForbidden();

        $this->assertDatabaseMissing('products', [
            'sku' => 'CSH-001',
        ]);
    }

    /** @test */
    public function admin_can_update_product()
    {
        $response = $this->actingAs($this->adminUser, 'api')
            ->putJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}", [
                'name' => 'Updated Product',
                'sku' => 'TEST-001',
                'price' => 20000,
                'stock' => 150,
            ]);

        $response->assertOk()
            ->assertJsonFragment(['name' => 'Updated Product']);

        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
            'name' => 'Updated Product',
            'price' => 20000,
        ]);
    }

    /** @test */
    public function manager_can_update_product()
    {
        $response = $this->actingAs($this->managerUser, 'api')
            ->putJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}", [
                'name' => 'Manager Updated',
                'sku' => 'TEST-001',
                'price' => 15000,
                'stock' => 120,
            ]);

        $response->assertOk();
    }

    /** @test */
    public function cashier_cannot_update_product()
    {
        $response = $this->actingAs($this->cashierUser, 'api')
            ->putJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}", [
                'name' => 'Cashier Updated',
                'sku' => 'TEST-001',
                'price' => 15000,
                'stock' => 120,
            ]);

        $response->assertForbidden();

        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
            'name' => 'Test Product', // Original name unchanged
        ]);
    }

    /** @test */
    public function admin_can_delete_product()
    {
        $response = $this->actingAs($this->adminUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}");

        $response->assertOk();

        $this->assertDatabaseMissing('products', [
            'id' => $this->product->id,
        ]);
    }

    /** @test */
    public function manager_cannot_delete_product()
    {
        $response = $this->actingAs($this->managerUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}");

        $response->assertForbidden();

        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
        ]);
    }

    /** @test */
    public function cashier_cannot_delete_product()
    {
        $response = $this->actingAs($this->cashierUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}");

        $response->assertForbidden();

        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
        ]);
    }

    /** @test */
    public function user_cannot_access_product_from_different_tenant()
    {
        // Try to view product from other tenant
        $response = $this->actingAs($this->otherTenantUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/products");

        $response->assertForbidden();
    }

    /** @test */
    public function user_cannot_create_product_in_different_tenant()
    {
        $productData = [
            'name' => 'Cross Tenant Product',
            'sku' => 'CROSS-001',
            'price' => 10000,
            'stock' => 10,
        ];

        $response = $this->actingAs($this->otherTenantUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant->id}/products", $productData);

        $response->assertForbidden();

        $this->assertDatabaseMissing('products', [
            'sku' => 'CROSS-001',
        ]);
    }

    /** @test */
    public function user_cannot_update_product_from_different_tenant()
    {
        $response = $this->actingAs($this->otherTenantUser, 'api')
            ->putJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}", [
                'name' => 'Hacked Product',
                'sku' => 'TEST-001',
                'price' => 99999,
                'stock' => 1,
            ]);

        $response->assertForbidden();

        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
            'name' => 'Test Product', // Original name unchanged
        ]);
    }

    /** @test */
    public function user_cannot_delete_product_from_different_tenant()
    {
        $response = $this->actingAs($this->otherTenantUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/{$this->product->id}");

        $response->assertForbidden();

        $this->assertDatabaseHas('products', [
            'id' => $this->product->id,
        ]);
    }

    /** @test */
    public function unauthenticated_user_cannot_access_products()
    {
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products");

        $response->assertUnauthorized();
    }

    /** @test */
    public function user_resource_includes_permissions()
    {
        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson('/api/v1/user');

        $response->assertOk()
            ->assertJsonStructure([
                'id',
                'name',
                'email',
                'tenant_id',
                'roles',
                'permissions' // Check that permissions are included
            ])
            ->assertJsonFragment([
                'permissions' => [
                    'products.view',
                    'products.create',
                    'products.update',
                    'products.delete',
                ]
            ]);
    }

    /** @test */
    public function cashier_has_limited_permissions_in_user_resource()
    {
        $response = $this->actingAs($this->cashierUser, 'api')
            ->getJson('/api/v1/user');

        $response->assertOk()
            ->assertJsonFragment([
                'permissions' => [
                    'products.view',
                ]
            ]);
    }
}