<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Category;
use Src\Pms\Infrastructure\Models\Tenant;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Database\Seeders\PermissionSeeder;

class ProductBulkOperationsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private User $managerUser;
    private User $cashierUser;
    private User $otherTenantUser;
    private Tenant $otherTenant;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear permission cache sebelum setup
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Buat permissions secara manual untuk test environment
        $this->createTestPermissions();

        // Create test tenants
        $this->tenant = Tenant::factory()->create();
        $this->otherTenant = Tenant::factory()->create();

        // Set permission team context for tenant 1
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

        // Create roles for this tenant
        $adminRole = Role::create([
            'name' => 'admin',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);

        $managerRole = Role::create([
            'name' => 'manager',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);

        $cashierRole = Role::create([
            'name' => 'cashier',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);

        // Assign permissions to roles
        $adminRole->givePermissionTo(['products.view', 'products.create', 'products.update', 'products.delete']);
        $managerRole->givePermissionTo(['products.view', 'products.create', 'products.update']);
        $cashierRole->givePermissionTo(['products.view']);

        // Create users with different permission levels
        $this->adminUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->adminUser->assignRole($adminRole);

        $this->managerUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->managerUser->assignRole($managerRole);

        $this->cashierUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->cashierUser->assignRole($cashierRole);

        // Create user from another tenant
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->otherTenant->id);

        $otherAdminRole = Role::create([
            'name' => 'admin',
            'guard_name' => 'api',
            'tenant_id' => $this->otherTenant->id,
        ]);
        $otherAdminRole->givePermissionTo(['products.view', 'products.create', 'products.update', 'products.delete']);

        $this->otherTenantUser = User::factory()->create(['tenant_id' => $this->otherTenant->id]);
        $this->otherTenantUser->assignRole($otherAdminRole);

        // Reset permission cache
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Set the permissions team context
     */
    protected function setPermissionsTeam(Tenant $tenant): void
    {
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
    }

    private function createTestPermissions(): void
    {
        $permissions = [
            // Product permissions
            'products.view', 'products.create', 'products.update', 'products.delete',
            'products.restore', 'products.delete.permanent', 'products.export', 'products.import',
            // Inventory permissions
            'inventory.adjust', 'products.stock.adjust',
            // Order permissions
            'orders.view', 'orders.create', 'orders.update', 'orders.delete',
            // Category permissions
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            // Customer permissions
            'customers.view', 'customers.create', 'customers.update', 'customers.delete',
            // Content pages permissions
            'content.view', 'content.create', 'content.update', 'content.delete',
            // User management permissions
            'users.view', 'users.create', 'users.update', 'users.delete',
            // Tenant management permissions
            'tenants.view', 'tenants.create', 'tenants.update', 'tenants.delete',
            'tenants.set-status', 'tenants.manage-auto-activation',
            // Role management permissions
            'roles.view', 'roles.create', 'roles.update', 'roles.delete',
            // Report permissions
            'reports.view', 'reports.export',
            // Settings permissions
            'settings.view', 'settings.update',
            // EAV permissions
            'blueprints.view', 'blueprints.create', 'blueprints.update',
            'customers.attributes.view', 'customers.attributes.update',
            // Testing/Diagnostics
            'testing.access',
        ];

        foreach ($permissions as $permission) {
            \Spatie\Permission\Models\Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'api',
            ]);
        }
    }

    /** @test */
    public function admin_can_bulk_delete_products()
    {
        $this->setPermissionsTeam($this->tenant);

        // Create 5 products
        $products = Product::factory()->count(5)->create(['tenant_id' => $this->tenant->id]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/bulk", [
                'ids' => $productIds,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'deleted_count' => 5,
            'requested_count' => 5,
        ]);

        // Verify products were soft deleted
        foreach ($productIds as $id) {
            $this->assertSoftDeleted('products', ['id' => $id]);
        }
    }

    /** @test */
    public function bulk_delete_works_with_large_number_of_products()
    {
        $this->setPermissionsTeam($this->tenant);

        // Create 100 products
        $products = Product::factory()->count(100)->create(['tenant_id' => $this->tenant->id]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/bulk", [
                'ids' => $productIds,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'deleted_count' => 100,
            'requested_count' => 100,
        ]);
    }

    /** @test */
    public function manager_cannot_bulk_delete_products()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->managerUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/bulk", [
                'ids' => $productIds,
            ]);

        $response->assertStatus(403);

        // Verify products were NOT deleted
        foreach ($productIds as $id) {
            $this->assertDatabaseHas('products', ['id' => $id]);
        }
    }

    /** @test */
    public function bulk_delete_respects_tenant_isolation()
    {
        $this->setPermissionsTeam($this->tenant);

        // Create products for current tenant
        $ownProducts = Product::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);
        
        // Create products for other tenant
        $otherProducts = Product::factory()->count(3)->create(['tenant_id' => $this->otherTenant->id]);

        // Try to delete both own and other tenant's products
        $allProductIds = $ownProducts->pluck('id')->merge($otherProducts->pluck('id'))->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/bulk", [
                'ids' => $allProductIds,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'deleted_count' => 3, // Only own products deleted
            'requested_count' => 6,
        ]);

        // Verify only own products were soft deleted
        foreach ($ownProducts as $product) {
            $this->assertSoftDeleted('products', ['id' => $product->id]);
        }

        // Verify other tenant's products were NOT deleted
        foreach ($otherProducts as $product) {
            $this->assertDatabaseHas('products', ['id' => $product->id]);
        }
    }

    /** @test */
    public function admin_can_bulk_update_status()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(5)->create([
            'tenant_id' => $this->tenant->id,
            'status' => 'active',
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/status", [
                'ids' => $productIds,
                'status' => 'inactive',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'updated_count' => 5,
            'requested_count' => 5,
            'status' => 'inactive',
        ]);

        // Verify all products have new status
        foreach ($productIds as $id) {
            $this->assertDatabaseHas('products', [
                'id' => $id,
                'status' => 'inactive',
            ]);
        }
    }

    /** @test */
    public function manager_can_bulk_update_status()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'status' => 'active',
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->managerUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/status", [
                'ids' => $productIds,
                'status' => 'discontinued',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'updated_count' => 3,
        ]);
    }

    /** @test */
    public function cashier_cannot_bulk_update_status()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'status' => 'active',
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->cashierUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/status", [
                'ids' => $productIds,
                'status' => 'inactive',
            ]);

        $response->assertStatus(403);

        // Verify status was NOT changed
        foreach ($productIds as $id) {
            $this->assertDatabaseHas('products', [
                'id' => $id,
                'status' => 'active',
            ]);
        }
    }

    /** @test */
    public function bulk_update_status_respects_tenant_isolation()
    {
        $this->setPermissionsTeam($this->tenant);

        $ownProducts = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'status' => 'active',
        ]);
        
        $otherProducts = Product::factory()->count(3)->create([
            'tenant_id' => $this->otherTenant->id,
            'status' => 'active',
        ]);

        $allProductIds = $ownProducts->pluck('id')->merge($otherProducts->pluck('id'))->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/status", [
                'ids' => $allProductIds,
                'status' => 'inactive',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'updated_count' => 3, // Only own products updated
        ]);

        // Verify only own products were updated
        foreach ($ownProducts as $product) {
            $this->assertDatabaseHas('products', [
                'id' => $product->id,
                'status' => 'inactive',
            ]);
        }

        // Verify other tenant's products were NOT updated
        foreach ($otherProducts as $product) {
            $this->assertDatabaseHas('products', [
                'id' => $product->id,
                'status' => 'active',
            ]);
        }
    }

    /** @test */
    public function admin_can_bulk_update_category()
    {
        $this->setPermissionsTeam($this->tenant);

        $category1 = Category::factory()->create(['tenant_id' => $this->tenant->id]);
        $category2 = Category::factory()->create(['tenant_id' => $this->tenant->id]);

        $products = Product::factory()->count(5)->create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $category1->id,
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/category", [
                'ids' => $productIds,
                'category_id' => $category2->id,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'updated_count' => 5,
            'requested_count' => 5,
            'category_id' => $category2->id,
        ]);

        // Verify all products have new category
        foreach ($productIds as $id) {
            $this->assertDatabaseHas('products', [
                'id' => $id,
                'category_id' => $category2->id,
            ]);
        }
    }

    /** @test */
    public function bulk_update_category_rejects_category_from_other_tenant()
    {
        $this->setPermissionsTeam($this->tenant);

        $ownCategory = Category::factory()->create(['tenant_id' => $this->tenant->id]);
        $otherCategory = Category::factory()->create(['tenant_id' => $this->otherTenant->id]);

        $products = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $ownCategory->id,
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/category", [
                'ids' => $productIds,
                'category_id' => $otherCategory->id,
            ]);

        $response->assertStatus(404);
        $response->assertJson([
            'message' => 'Category not found or does not belong to this tenant',
        ]);

        // Verify category was NOT changed
        foreach ($productIds as $id) {
            $this->assertDatabaseHas('products', [
                'id' => $id,
                'category_id' => $ownCategory->id,
            ]);
        }
    }

    /** @test */
    public function admin_can_bulk_increase_price_by_percentage()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'price' => 100.00,
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/price", [
                'ids' => $productIds,
                'type' => 'percentage',
                'operation' => 'increase',
                'value' => 10, // 10% increase
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'updated_count' => 3,
            'type' => 'percentage',
            'operation' => 'increase',
            'value' => 10,
        ]);

        // Verify prices increased by 10%
        foreach ($productIds as $id) {
            $product = Product::find($id);
            $this->assertEquals(110.00, $product->price);
        }
    }

    /** @test */
    public function admin_can_bulk_decrease_price_by_percentage()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'price' => 100.00,
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/price", [
                'ids' => $productIds,
                'type' => 'percentage',
                'operation' => 'decrease',
                'value' => 20, // 20% decrease
            ]);

        $response->assertStatus(200);

        // Verify prices decreased by 20%
        foreach ($productIds as $id) {
            $product = Product::find($id);
            $this->assertEquals(80.00, $product->price);
        }
    }

    /** @test */
    public function admin_can_bulk_increase_price_by_fixed_amount()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'price' => 100.00,
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/price", [
                'ids' => $productIds,
                'type' => 'fixed',
                'operation' => 'increase',
                'value' => 15.50,
            ]);

        $response->assertStatus(200);

        // Verify prices increased by fixed amount
        foreach ($productIds as $id) {
            $product = Product::find($id);
            $this->assertEquals(115.50, $product->price);
        }
    }

    /** @test */
    public function admin_can_bulk_set_price_to_fixed_value()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'price' => 100.00,
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/price", [
                'ids' => $productIds,
                'type' => 'fixed',
                'operation' => 'set',
                'value' => 49.99,
            ]);

        $response->assertStatus(200);

        // Verify all prices set to new value
        foreach ($productIds as $id) {
            $product = Product::find($id);
            $this->assertEquals(49.99, $product->price);
        }
    }

    /** @test */
    public function bulk_price_update_prevents_negative_prices()
    {
        $this->setPermissionsTeam($this->tenant);

        $products = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'price' => 10.00,
        ]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->actingAs($this->adminUser, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant->id}/products/bulk/price", [
                'ids' => $productIds,
                'type' => 'fixed',
                'operation' => 'decrease',
                'value' => 20.00, // Would result in negative price
            ]);

        $response->assertStatus(200);

        // Verify prices are set to 0 (minimum)
        foreach ($productIds as $id) {
            $product = Product::find($id);
            $this->assertEquals(0, $product->price);
        }
    }

    /** @test */
    public function bulk_operations_require_valid_uuid_array()
    {
        $this->setPermissionsTeam($this->tenant);

        $response = $this->actingAs($this->adminUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/bulk", [
                'ids' => ['not-a-uuid', 'invalid'],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ids.0', 'ids.1']);
    }

    /** @test */
    public function bulk_operations_require_at_least_one_id()
    {
        $this->setPermissionsTeam($this->tenant);

        $response = $this->actingAs($this->adminUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/bulk", [
                'ids' => [],
            ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['ids']);
    }

    /** @test */
    public function unauthenticated_user_cannot_perform_bulk_operations()
    {
        $products = Product::factory()->count(3)->create(['tenant_id' => $this->tenant->id]);
        $productIds = $products->pluck('id')->toArray();

        $response = $this->deleteJson("/api/v1/tenants/{$this->tenant->id}/products/bulk", [
            'ids' => $productIds,
        ]);

        $response->assertStatus(401);
    }
}