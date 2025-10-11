<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Src\Pms\Infrastructure\Models\Customer;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class CustomerImageLocationTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    private Tenant $hqTenant;
    private Tenant $tenant1;
    private Tenant $tenant2;
    private User $superAdmin;
    private User $tenantAdmin;
    private User $tenantUser;
    private User $tenant2Admin;
    private Customer $customer;
    private Customer $customer2;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        // Create HQ tenant (Super Admin tenant)
        $this->hqTenant = Tenant::create([
            'id' => config('tenancy.hq_tenant_id'),
            'name' => 'HQ Tenant',
            'domain' => 'hq.test',
        ]);

        // Create regular tenants
        $this->tenant1 = Tenant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'name' => 'Tenant 1',
            'domain' => 'tenant1.test',
        ]);

        $this->tenant2 = Tenant::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'name' => 'Tenant 2',
            'domain' => 'tenant2.test',
        ]);

        // Create permissions
        Permission::create(['name' => 'customers.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'customers.create', 'guard_name' => 'api']);
        Permission::create(['name' => 'customers.update', 'guard_name' => 'api']);
        Permission::create(['name' => 'customers.delete', 'guard_name' => 'api']);

        // Create Super Admin (HQ tenant)
        $this->superAdmin = User::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->hqTenant->id,
            'name' => 'Super Admin',
            'email' => 'superadmin@test.com',
            'password' => bcrypt('password'),
        ]);

        // Create Super Admin role and assign to super admin user
        $superAdminRole = Role::create(['name' => 'Super Admin', 'guard_name' => 'api', 'tenant_id' => $this->hqTenant->id]);
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($this->hqTenant->id);
        $this->superAdmin->assignRole($superAdminRole);

        // Create roles and assign permissions for Tenant 1
        $adminRole1 = Role::create(['name' => 'Admin', 'guard_name' => 'api', 'tenant_id' => $this->tenant1->id]);
        $adminRole1->givePermissionTo(['customers.view', 'customers.create', 'customers.update', 'customers.delete']);

        $userRole1 = Role::create(['name' => 'User', 'guard_name' => 'api', 'tenant_id' => $this->tenant1->id]);
        $userRole1->givePermissionTo(['customers.view']);

        // Create Tenant 1 users
        $this->tenantAdmin = User::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant1->id,
            'name' => 'Tenant 1 Admin',
            'email' => 'admin@tenant1.test',
            'password' => bcrypt('password'),
        ]);

        $this->tenantUser = User::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant1->id,
            'name' => 'Tenant 1 User',
            'email' => 'user@tenant1.test',
            'password' => bcrypt('password'),
        ]);

        // Assign roles
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($this->tenant1->id);
        $this->tenantAdmin->assignRole($adminRole1);
        $this->tenantUser->assignRole($userRole1);

        // Create roles for Tenant 2
        $adminRole2 = Role::create(['name' => 'Admin', 'guard_name' => 'api', 'tenant_id' => $this->tenant2->id]);
        $adminRole2->givePermissionTo(['customers.view', 'customers.create', 'customers.update', 'customers.delete']);

        $this->tenant2Admin = User::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant2->id,
            'name' => 'Tenant 2 Admin',
            'email' => 'admin@tenant2.test',
            'password' => bcrypt('password'),
        ]);

        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($this->tenant2->id);
        $this->tenant2Admin->assignRole($adminRole2);

        // Create test customers
        $this->customer = Customer::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant1->id,
            'name' => 'Test Customer 1',
            'email' => 'customer1@test.com',
            'phone' => '123456789',
            'address' => '123 Test St',
        ]);

        $this->customer2 = Customer::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id' => $this->tenant2->id,
            'name' => 'Test Customer 2',
            'email' => 'customer2@test.com',
            'phone' => '987654321',
            'address' => '456 Test Ave',
        ]);
    }

    /** @test */
    public function super_admin_can_upload_photo_to_any_customer(): void
    {
        $file = UploadedFile::fake()->image('customer.jpg');

        $response = $this->actingAs($this->superAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'photo_url',
                'photo_thumb_url',
            ]);

        $this->customer->refresh();
        $this->assertNotNull($this->customer->photo_url);
        $this->assertNotNull($this->customer->photo_thumb_url);
    }

    /** @test */
    public function tenant_admin_can_upload_photo_for_customers_in_same_tenant(): void
    {
        $file = UploadedFile::fake()->image('customer.jpg');

        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'photo_url',
                'photo_thumb_url',
            ]);
    }

    /** @test */
    public function user_cannot_upload_photo_without_permission(): void
    {
        $file = UploadedFile::fake()->image('customer.jpg');

        $response = $this->actingAs($this->tenantUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function user_cannot_upload_photo_for_customers_in_different_tenant(): void
    {
        $file = UploadedFile::fake()->image('customer.jpg');

        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant2->id}/customers/{$this->customer2->id}/upload-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function upload_validates_file_type_and_size(): void
    {
        // Test invalid file type
        $file = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);

        // Test file too large (>5MB)
        $largeFile = UploadedFile::fake()->image('large.jpg')->size(6000);

        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $largeFile,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);
    }

    /** @test */
    public function uploading_new_photo_deletes_old_photo(): void
    {
        // Upload first photo
        $file1 = UploadedFile::fake()->image('first.jpg');
        $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file1,
            ]);

        $this->customer->refresh();
        $oldPhotoUrl = $this->customer->photo_url;
        $oldThumbUrl = $this->customer->photo_thumb_url;

        // Upload second photo
        $file2 = UploadedFile::fake()->image('second.jpg');
        $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file2,
            ]);

        $this->customer->refresh();
        $this->assertNotEquals($oldPhotoUrl, $this->customer->photo_url);
        $this->assertNotEquals($oldThumbUrl, $this->customer->photo_thumb_url);
    }

    /** @test */
    public function super_admin_can_delete_any_customer_photo(): void
    {
        // Upload photo first
        $file = UploadedFile::fake()->image('customer.jpg');
        $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file,
            ]);

        $this->customer->refresh();
        $this->assertNotNull($this->customer->photo_url);

        // Delete as super admin
        $response = $this->actingAs($this->superAdmin, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/photo");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Customer photo deleted successfully.']);

        $this->customer->refresh();
        $this->assertNull($this->customer->photo_url);
        $this->assertNull($this->customer->photo_thumb_url);
    }

    /** @test */
    public function tenant_admin_can_delete_customer_photo_in_same_tenant(): void
    {
        // Upload photo first
        $file = UploadedFile::fake()->image('customer.jpg');
        $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file,
            ]);

        $this->customer->refresh();
        $this->assertNotNull($this->customer->photo_url);

        // Delete photo
        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/photo");

        $response->assertStatus(200);

        $this->customer->refresh();
        $this->assertNull($this->customer->photo_url);
    }

    /** @test */
    public function user_cannot_delete_customer_photo_without_permission(): void
    {
        // Upload photo first as admin
        $file = UploadedFile::fake()->image('customer.jpg');
        $this->actingAs($this->tenantAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/upload-photo", [
                'photo' => $file,
            ]);

        // Try to delete as regular user
        $response = $this->actingAs($this->tenantUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}/photo");

        $response->assertStatus(403);
    }

    /** @test */
    public function get_customer_includes_photo_fields(): void
    {
        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id',
                'name',
                'email',
                'phone',
                'address',
                'tags',
                'photo_url',
                'photo_thumb_url',
                'has_photo',
                'delivery_latitude',
                'delivery_longitude',
                'delivery_address',
                'has_delivery_location',
                'delivery_location_coordinates',
                'created_at',
                'updated_at',
            ]);
    }

    /** @test */
    public function customer_with_delivery_location_returns_coordinates(): void
    {
        $this->customer->update([
            'delivery_latitude' => -6.2088,
            'delivery_longitude' => 106.8456,
            'delivery_address' => 'Jakarta, Indonesia',
        ]);

        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}");

        $response->assertStatus(200)
            ->assertJson([
                'has_delivery_location' => true,
                'delivery_location_coordinates' => [
                    'lat' => -6.2088,
                    'lng' => 106.8456,
                ],
            ]);
    }

    /** @test */
    public function update_customer_accepts_delivery_location_fields(): void
    {
        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}", [
                'name' => 'Updated Customer',
                'email' => 'updated@test.com',
                'delivery_latitude' => -6.2088,
                'delivery_longitude' => 106.8456,
                'delivery_address' => 'Jakarta, Indonesia',
            ]);

        $response->assertStatus(200);

        $this->customer->refresh();
        $this->assertEquals(-6.2088, (float) $this->customer->delivery_latitude);
        $this->assertEquals(106.8456, (float) $this->customer->delivery_longitude);
        $this->assertEquals('Jakarta, Indonesia', $this->customer->delivery_address);
    }

    /** @test */
    public function customer_list_includes_photo_and_location_fields(): void
    {
        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant1->id}/customers");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'photo_url',
                        'photo_thumb_url',
                        'has_photo',
                        'delivery_latitude',
                        'delivery_longitude',
                        'delivery_address',
                        'has_delivery_location',
                        'delivery_location_coordinates',
                    ],
                ],
                'current_page',
                'last_page',
                'per_page',
                'total',
            ]);
    }

    /** @test */
    public function delivery_location_validation_enforces_lat_lng_ranges(): void
    {
        // Invalid latitude (> 90)
        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}", [
                'name' => 'Test Customer',
                'delivery_latitude' => 95,
                'delivery_longitude' => 100,
            ]);

        $response->assertStatus(422);

        // Invalid longitude (> 180)
        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}", [
                'name' => 'Test Customer',
                'delivery_latitude' => 50,
                'delivery_longitude' => 185,
            ]);

        $response->assertStatus(422);

        // Valid ranges
        $response = $this->actingAs($this->tenantAdmin, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenant1->id}/customers/{$this->customer->id}", [
                'name' => 'Test Customer',
                'delivery_latitude' => -6.2088,
                'delivery_longitude' => 106.8456,
            ]);

        $response->assertStatus(200);
    }
}