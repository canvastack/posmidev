<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;

/**
 * Feature tests for User Image & Location Enhancement
 * 
 * Tests cover:
 * - Profile photo upload (multipart/form-data)
 * - Profile photo delete
 * - Self-update pattern (users can update their own profile)
 * - Location fields in GET requests
 * - Computed accessors (has_profile_photo, has_home_location, home_location_coordinates)
 * - Tenant isolation
 * - Permission enforcement
 */
class UserImageLocationTest extends TestCase
{
    use RefreshDatabase;

    protected string $hqTenantId;
    protected Tenant $hqTenant;
    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $superAdmin;
    protected User $tenantAAdmin;
    protected User $tenantAUser;
    protected User $tenantBUser;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        // Create HQ tenant
        $this->hqTenantId = config('tenancy.hq_tenant_id');
        $this->hqTenant = Tenant::create([
            'id' => $this->hqTenantId,
            'name' => 'HQ Tenant',
            'status' => 'active',
        ]);

        // Create test tenants
        $this->tenantA = Tenant::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'name' => 'Tenant A',
            'status' => 'active',
        ]);

        $this->tenantB = Tenant::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'name' => 'Tenant B',
            'status' => 'active',
        ]);

        // Create permissions
        Permission::create(['name' => 'users.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'users.update', 'guard_name' => 'api']);

        // Create Super Admin role in HQ tenant
        $superAdminRole = Role::create([
            'name' => 'Super Admin',
            'guard_name' => 'api',
            'tenant_id' => $this->hqTenantId,
        ]);

        // Create Super Admin user
        $this->superAdmin = User::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->hqTenantId,
            'name' => 'Super Admin',
            'email' => 'superadmin@hq.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        
        // Set tenant context before assigning role
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($this->hqTenantId);
        $this->superAdmin->assignRole($superAdminRole);

        // Create Tenant A Admin User
        $this->tenantAAdmin = User::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenantA->id,
            'name' => 'Admin A',
            'email' => 'admin@tenanta.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        // Create Tenant A Admin Role with users.update permission
        $tenantAAdminRole = Role::create([
            'name' => 'admin',
            'guard_name' => 'api',
            'tenant_id' => $this->tenantA->id,
        ]);

        // Set tenant context and assign permissions
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($this->tenantA->id);
        $tenantAAdminRole->givePermissionTo(['users.view', 'users.update']);
        $this->tenantAAdmin->assignRole($tenantAAdminRole);

        // Create Tenant A regular user (no permissions)
        $this->tenantAUser = User::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenantA->id,
            'name' => 'User A',
            'email' => 'user@tenanta.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        // Create Tenant B user (different tenant)
        $this->tenantBUser = User::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenantB->id,
            'name' => 'User B',
            'email' => 'user@tenantb.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        $tenantBRole = Role::create([
            'name' => 'admin',
            'guard_name' => 'api',
            'tenant_id' => $this->tenantB->id,
        ]);

        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($this->tenantB->id);
        $tenantBRole->givePermissionTo(['users.view', 'users.update']);
        $this->tenantBUser->assignRole($tenantBRole);

        // Reset team context after setup
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId(null);
    }

    /** @test */
    public function super_admin_can_upload_profile_photo_to_any_user(): void
    {
        Storage::fake('public');
        
        $file = UploadedFile::fake()->image('profile.jpg', 800, 600);

        $response = $this->actingAs($this->superAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'profile_photo_url',
                'profile_photo_thumb_url',
            ]);

        $this->tenantAUser->refresh();
        $this->assertNotNull($this->tenantAUser->profile_photo_url);
        $this->assertNotNull($this->tenantAUser->profile_photo_thumb_url);

        Storage::disk('public')->assertExists("users/{$this->tenantAUser->id}/" . basename(parse_url($this->tenantAUser->profile_photo_url, PHP_URL_PATH)));
    }

    /** @test */
    public function tenant_admin_can_upload_profile_photo_for_users_in_same_tenant(): void
    {
        Storage::fake('public');
        
        $file = UploadedFile::fake()->image('profile.jpg', 800, 600);

        $response = $this->actingAs($this->tenantAAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'profile_photo_url',
                'profile_photo_thumb_url',
            ]);

        $this->tenantAUser->refresh();
        $this->assertNotNull($this->tenantAUser->profile_photo_url);
    }

    /** @test */
    public function user_can_upload_their_own_profile_photo(): void
    {
        Storage::fake('public');
        
        $file = UploadedFile::fake()->image('myprofile.jpg', 800, 600);

        $response = $this->actingAs($this->tenantAUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'profile_photo_url',
                'profile_photo_thumb_url',
            ]);

        $this->tenantAUser->refresh();
        $this->assertNotNull($this->tenantAUser->profile_photo_url);
        $this->assertNotNull($this->tenantAUser->profile_photo_thumb_url);
    }

    /** @test */
    public function user_cannot_upload_profile_photo_for_other_users_without_permission(): void
    {
        Storage::fake('public');
        
        $file = UploadedFile::fake()->image('profile.jpg', 800, 600);

        // Tenant A User trying to upload photo for Tenant A Admin (different user, no permission)
        $response = $this->actingAs($this->tenantAUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAAdmin->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function user_cannot_upload_profile_photo_for_users_in_different_tenant(): void
    {
        Storage::fake('public');
        
        $file = UploadedFile::fake()->image('profile.jpg', 800, 600);

        // Tenant A Admin trying to upload photo for Tenant B User
        $response = $this->actingAs($this->tenantAAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantB->id}/users/{$this->tenantBUser->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        // Expecting 403 (Forbidden) because policy check happens before tenant ownership check
        $response->assertStatus(403);
    }

    /** @test */
    public function upload_validates_file_type_and_size(): void
    {
        Storage::fake('public');
        
        // Test invalid file type
        $invalidFile = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->actingAs($this->tenantAUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $invalidFile,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['photo']);
    }

    /** @test */
    public function uploading_new_photo_deletes_old_photo(): void
    {
        Storage::fake('public');
        
        // Upload first photo
        $file1 = UploadedFile::fake()->image('profile1.jpg', 800, 600);
        $this->actingAs($this->tenantAUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file1,
            ]);

        $this->tenantAUser->refresh();
        $oldPhotoUrl = $this->tenantAUser->profile_photo_url;
        $oldThumbUrl = $this->tenantAUser->profile_photo_thumb_url;

        // Upload second photo
        $file2 = UploadedFile::fake()->image('profile2.jpg', 800, 600);
        $this->actingAs($this->tenantAUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file2,
            ]);

        $this->tenantAUser->refresh();
        
        // Old files should be deleted
        $oldPhotoPath = str_replace('/storage/', '', parse_url($oldPhotoUrl, PHP_URL_PATH));
        $oldThumbPath = str_replace('/storage/', '', parse_url($oldThumbUrl, PHP_URL_PATH));
        Storage::disk('public')->assertMissing($oldPhotoPath);
        Storage::disk('public')->assertMissing($oldThumbPath);

        // New files should exist
        $this->assertNotEquals($oldPhotoUrl, $this->tenantAUser->profile_photo_url);
        $this->assertNotNull($this->tenantAUser->profile_photo_url);
    }

    /** @test */
    public function super_admin_can_delete_any_user_profile_photo(): void
    {
        Storage::fake('public');
        
        // Upload photo first
        $file = UploadedFile::fake()->image('profile.jpg', 800, 600);
        $this->actingAs($this->superAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $this->tenantAUser->refresh();
        $this->assertNotNull($this->tenantAUser->profile_photo_url);

        // Delete photo
        $response = $this->actingAs($this->superAdmin, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/profile-photo");

        $response->assertStatus(200)
            ->assertJson(['message' => 'Profile photo deleted successfully.']);

        $this->tenantAUser->refresh();
        $this->assertNull($this->tenantAUser->profile_photo_url);
        $this->assertNull($this->tenantAUser->profile_photo_thumb_url);
    }

    /** @test */
    public function tenant_admin_can_delete_user_profile_photo_in_same_tenant(): void
    {
        Storage::fake('public');
        
        // Upload photo first
        $file = UploadedFile::fake()->image('profile.jpg', 800, 600);
        $this->actingAs($this->tenantAAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $this->tenantAUser->refresh();
        $this->assertNotNull($this->tenantAUser->profile_photo_url);

        // Delete photo
        $response = $this->actingAs($this->tenantAAdmin, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/profile-photo");

        $response->assertStatus(200);

        $this->tenantAUser->refresh();
        $this->assertNull($this->tenantAUser->profile_photo_url);
    }

    /** @test */
    public function user_can_delete_their_own_profile_photo(): void
    {
        Storage::fake('public');
        
        // Upload photo first
        $file = UploadedFile::fake()->image('myprofile.jpg', 800, 600);
        $this->actingAs($this->tenantAUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $this->tenantAUser->refresh();
        $this->assertNotNull($this->tenantAUser->profile_photo_url);

        // Delete own photo
        $response = $this->actingAs($this->tenantAUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/profile-photo");

        $response->assertStatus(200);

        $this->tenantAUser->refresh();
        $this->assertNull($this->tenantAUser->profile_photo_url);
    }

    /** @test */
    public function user_cannot_delete_other_users_profile_photo_without_permission(): void
    {
        Storage::fake('public');
        
        // Upload photo for Admin A
        $file = UploadedFile::fake()->image('admin.jpg', 800, 600);
        $this->actingAs($this->tenantAAdmin, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAAdmin->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $this->tenantAAdmin->refresh();
        $this->assertNotNull($this->tenantAAdmin->profile_photo_url);

        // Try to delete as regular user
        $response = $this->actingAs($this->tenantAUser, 'api')
            ->deleteJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAAdmin->id}/profile-photo");

        $response->assertStatus(403);

        // Photo should still exist
        $this->tenantAAdmin->refresh();
        $this->assertNotNull($this->tenantAAdmin->profile_photo_url);
    }

    /** @test */
    public function get_user_includes_profile_photo_fields(): void
    {
        Storage::fake('public');
        
        // Upload photo first
        $file = UploadedFile::fake()->image('profile.jpg', 800, 600);
        $this->actingAs($this->tenantAUser, 'api')
            ->postJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}/upload-profile-photo", [
                'photo' => $file,
            ]);

        $this->tenantAUser->refresh();

        $response = $this->actingAs($this->tenantAAdmin, 'api')
            ->getJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id',
                'name',
                'email',
                'profile_photo_url',
                'profile_photo_thumb_url',
                'has_profile_photo',
            ])
            ->assertJson([
                'has_profile_photo' => true,
            ]);
    }

    /** @test */
    public function user_with_home_location_returns_coordinates(): void
    {
        $this->tenantAUser->update([
            'home_latitude' => -6.2088,
            'home_longitude' => 106.8456,
            'home_address' => 'Jakarta, Indonesia',
        ]);

        $response = $this->actingAs($this->tenantAAdmin, 'api')
            ->getJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'home_latitude',
                'home_longitude',
                'home_address',
                'has_home_location',
                'home_location_coordinates',
            ])
            ->assertJson([
                'has_home_location' => true,
                'home_location_coordinates' => [
                    'lat' => -6.2088,
                    'lng' => 106.8456,
                ],
            ]);
    }

    /** @test */
    public function update_user_accepts_home_location_fields(): void
    {
        $response = $this->actingAs($this->tenantAAdmin, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}", [
                'home_latitude' => -6.2088,
                'home_longitude' => 106.8456,
                'home_address' => 'Jakarta, Indonesia',
            ]);

        $response->assertStatus(200);

        $this->tenantAUser->refresh();
        $this->assertEquals(-6.2088, (float) $this->tenantAUser->home_latitude);
        $this->assertEquals(106.8456, (float) $this->tenantAUser->home_longitude);
        $this->assertEquals('Jakarta, Indonesia', $this->tenantAUser->home_address);
    }

    /** @test */
    public function user_list_includes_profile_photo_and_location_fields(): void
    {
        // Add profile photo and location to one user
        $this->tenantAUser->update([
            'profile_photo_url' => 'https://example.com/photo.jpg',
            'profile_photo_thumb_url' => 'https://example.com/photo_thumb.jpg',
            'home_latitude' => -6.2088,
            'home_longitude' => 106.8456,
            'home_address' => 'Jakarta, Indonesia',
        ]);

        $response = $this->actingAs($this->tenantAAdmin, 'api')
            ->getJson("/api/v1/tenants/{$this->tenantA->id}/users");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'name',
                        'profile_photo_url',
                        'profile_photo_thumb_url',
                        'has_profile_photo',
                        'home_latitude',
                        'home_longitude',
                        'home_address',
                        'has_home_location',
                    ],
                ],
            ]);
    }

    /** @test */
    public function home_location_validation_enforces_lat_lng_ranges(): void
    {
        $response = $this->actingAs($this->tenantAAdmin, 'api')
            ->patchJson("/api/v1/tenants/{$this->tenantA->id}/users/{$this->tenantAUser->id}", [
                'home_latitude' => 95.0, // Invalid: > 90
                'home_longitude' => 200.0, // Invalid: > 180
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['home_latitude', 'home_longitude']);
    }
}