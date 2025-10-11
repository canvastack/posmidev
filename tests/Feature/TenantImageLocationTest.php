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
 * Feature tests for Tenant Image & Location Enhancement
 * 
 * Tests cover:
 * - Logo upload (multipart/form-data)
 * - Logo delete
 * - Location fields in GET requests
 * - Computed accessors (has_logo, has_location, location_coordinates)
 * - Tenant isolation
 * - Permission enforcement
 */
class TenantImageLocationTest extends TestCase
{
    use RefreshDatabase;

    protected string $hqTenantId;
    protected Tenant $hqTenant;
    protected Tenant $tenantA;
    protected Tenant $tenantB;
    protected User $superAdmin;
    protected User $tenantAAdmin;
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
        Permission::create(['name' => 'tenants.view', 'guard_name' => 'api']);
        Permission::create(['name' => 'tenants.update', 'guard_name' => 'api']);

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

        // Create Tenant A Admin Role
        $tenantAAdminRole = Role::create([
            'name' => 'admin',
            'guard_name' => 'api',
            'tenant_id' => $this->tenantA->id,
        ]);
        
        // Set tenant context for permissions BEFORE giving permissions to role
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId($this->tenantA->id);
        $tenantAAdminRole->givePermissionTo(['tenants.view', 'tenants.update']);
        
        // Assign role to user
        $this->tenantAAdmin->assignRole($tenantAAdminRole);
        
        // Reset team context (ProductPermissionsTest pattern)
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId(null);

        // Create Tenant B User (no permissions)
        $this->tenantBUser = User::create([
            'id' => \Ramsey\Uuid\Uuid::uuid4()->toString(),
            'tenant_id' => $this->tenantB->id,
            'name' => 'User B',
            'email' => 'user@tenantb.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
    }

    /** @test */
    public function super_admin_can_upload_logo_to_any_tenant(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        $file = UploadedFile::fake()->image('logo.jpg', 800, 600);

        $response = $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $file,
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'message',
                'logo_url',
                'logo_thumb_url',
            ]);

        // Verify database
        $this->tenantA->refresh();
        $this->assertNotNull($this->tenantA->logo_url);
        $this->assertNotNull($this->tenantA->logo_thumb_url);
        $this->assertTrue($this->tenantA->has_logo);

        // Verify files were created
        $logoPath = str_replace('/storage/', '', parse_url($this->tenantA->logo_url, PHP_URL_PATH));
        $thumbPath = str_replace('/storage/', '', parse_url($this->tenantA->logo_thumb_url, PHP_URL_PATH));
        
        Storage::disk('public')->assertExists($logoPath);
        Storage::disk('public')->assertExists($thumbPath);
    }

    /** @test */
    public function tenant_admin_can_upload_logo_to_own_tenant(): void
    {
        $this->actingAs($this->tenantAAdmin, 'api');

        $file = UploadedFile::fake()->image('logo.png', 1000, 1000);

        $response = $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $file,
        ]);

        $response->assertStatus(200);

        $this->tenantA->refresh();
        $this->assertTrue($this->tenantA->has_logo);
    }

    /** @test */
    public function user_without_permission_cannot_upload_logo(): void
    {
        $this->actingAs($this->tenantBUser, 'api');

        $file = UploadedFile::fake()->image('logo.jpg');

        $response = $this->postJson("/api/v1/tenants/{$this->tenantB->id}/upload-logo", [
            'logo' => $file,
        ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function upload_validates_file_type_and_size(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        // Test invalid file type
        $pdfFile = UploadedFile::fake()->create('document.pdf', 100);
        $response = $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $pdfFile,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['logo']);

        // Test file too large (> 5MB)
        $largeFile = UploadedFile::fake()->create('logo.jpg', 6000); // 6MB
        $response = $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $largeFile,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['logo']);
    }

    /** @test */
    public function uploading_new_logo_deletes_old_logo(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        // Upload first logo
        $file1 = UploadedFile::fake()->image('logo1.jpg');
        $response1 = $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $file1,
        ]);
        $response1->assertStatus(200);

        $this->tenantA->refresh();
        $oldLogoUrl = $this->tenantA->logo_url;
        $oldThumbUrl = $this->tenantA->logo_thumb_url;

        $oldLogoPath = str_replace('/storage/', '', parse_url($oldLogoUrl, PHP_URL_PATH));
        $oldThumbPath = str_replace('/storage/', '', parse_url($oldThumbUrl, PHP_URL_PATH));

        // Upload second logo (should delete first)
        $file2 = UploadedFile::fake()->image('logo2.jpg');
        $response2 = $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $file2,
        ]);
        $response2->assertStatus(200);

        $this->tenantA->refresh();
        $newLogoUrl = $this->tenantA->logo_url;
        $newThumbUrl = $this->tenantA->logo_thumb_url;

        // Verify old files deleted
        Storage::disk('public')->assertMissing($oldLogoPath);
        Storage::disk('public')->assertMissing($oldThumbPath);

        // Verify new files exist
        $newLogoPath = str_replace('/storage/', '', parse_url($newLogoUrl, PHP_URL_PATH));
        $newThumbPath = str_replace('/storage/', '', parse_url($newThumbUrl, PHP_URL_PATH));
        Storage::disk('public')->assertExists($newLogoPath);
        Storage::disk('public')->assertExists($newThumbPath);
    }

    /** @test */
    public function super_admin_can_delete_logo(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        // Upload logo first
        $file = UploadedFile::fake()->image('logo.jpg');
        $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $file,
        ]);

        $this->tenantA->refresh();
        $logoPath = str_replace('/storage/', '', parse_url($this->tenantA->logo_url, PHP_URL_PATH));
        $thumbPath = str_replace('/storage/', '', parse_url($this->tenantA->logo_thumb_url, PHP_URL_PATH));

        // Delete logo
        $response = $this->deleteJson("/api/v1/tenants/{$this->tenantA->id}/logo");
        $response->assertStatus(200)
            ->assertJson(['message' => 'Logo deleted successfully.']);

        // Verify database
        $this->tenantA->refresh();
        $this->assertNull($this->tenantA->logo_url);
        $this->assertNull($this->tenantA->logo_thumb_url);
        $this->assertFalse($this->tenantA->has_logo);

        // Verify files deleted
        Storage::disk('public')->assertMissing($logoPath);
        Storage::disk('public')->assertMissing($thumbPath);
    }

    /** @test */
    public function tenant_admin_can_delete_own_logo(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        // Upload logo first
        $file = UploadedFile::fake()->image('logo.jpg');
        $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $file,
        ]);

        // Switch to tenant admin
        $this->actingAs($this->tenantAAdmin, 'api');

        $response = $this->deleteJson("/api/v1/tenants/{$this->tenantA->id}/logo");
        $response->assertStatus(200);

        $this->tenantA->refresh();
        $this->assertFalse($this->tenantA->has_logo);
    }

    /** @test */
    public function get_tenant_includes_image_fields(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        $response = $this->getJson("/api/v1/tenants/{$this->tenantA->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id',
                'name',
                'logo_url',
                'logo_thumb_url',
                'has_logo',
                'latitude',
                'longitude',
                'location_address',
                'has_location',
                'location_coordinates',
            ]);

        $response->assertJson([
            'has_logo' => false,
            'has_location' => false,
            'location_coordinates' => null,
        ]);
    }

    /** @test */
    public function tenant_with_location_returns_coordinates(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        // Update tenant with location
        $this->tenantA->update([
            'latitude' => -6.200000,
            'longitude' => 106.816666,
            'location_address' => 'Jakarta, Indonesia',
        ]);

        $response = $this->getJson("/api/v1/tenants/{$this->tenantA->id}");

        $response->assertStatus(200)
            ->assertJson([
                'has_location' => true,
                'latitude' => -6.200000,
                'longitude' => 106.816666,
                'location_address' => 'Jakarta, Indonesia',
                'location_coordinates' => [
                    'lat' => -6.200000,
                    'lng' => 106.816666,
                ],
            ]);
    }

    /** @test */
    public function update_tenant_accepts_location_fields(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        $response = $this->patchJson("/api/v1/tenants/{$this->tenantA->id}", [
            'latitude' => -7.250445,
            'longitude' => 112.768845,
            'location_address' => 'Surabaya, Indonesia',
        ]);

        $response->assertStatus(200);

        $this->tenantA->refresh();
        $this->assertTrue($this->tenantA->has_location);
        $this->assertEquals(-7.250445, (float) $this->tenantA->latitude);
        $this->assertEquals(112.768845, (float) $this->tenantA->longitude);
        $this->assertEquals('Surabaya, Indonesia', $this->tenantA->location_address);
    }

    /** @test */
    public function tenant_list_includes_image_and_location_fields(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        // Add logo to tenant A
        $file = UploadedFile::fake()->image('logo.jpg');
        $this->postJson("/api/v1/tenants/{$this->tenantA->id}/upload-logo", [
            'logo' => $file,
        ]);

        // Add location to tenant B
        $this->tenantB->update([
            'latitude' => -8.670458,
            'longitude' => 115.212631,
            'location_address' => 'Bali, Indonesia',
        ]);

        $response = $this->getJson('/api/v1/tenants');

        $response->assertStatus(200);

        $data = $response->json('data');
        $this->assertNotEmpty($data);

        // Find tenant A and verify has_logo
        $tenantAData = collect($data)->firstWhere('id', $this->tenantA->id);
        $this->assertTrue($tenantAData['has_logo']);

        // Find tenant B and verify has_location
        $tenantBData = collect($data)->firstWhere('id', $this->tenantB->id);
        $this->assertTrue($tenantBData['has_location']);
    }

    /** @test */
    public function location_validation_enforces_lat_lng_ranges(): void
    {
        $this->actingAs($this->superAdmin, 'api');

        // Invalid latitude (> 90) should be REJECTED
        $response = $this->patchJson("/api/v1/tenants/{$this->tenantA->id}", [
            'name' => 'Tenant A Updated',
            'latitude' => 100,
            'longitude' => 50,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['latitude']);

        // Invalid longitude (> 180) should be REJECTED
        $response = $this->patchJson("/api/v1/tenants/{$this->tenantA->id}", [
            'name' => 'Tenant A Updated',
            'latitude' => 50,
            'longitude' => 200,
        ]);
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['longitude']);

        // Valid coordinates should be ACCEPTED
        $response = $this->patchJson("/api/v1/tenants/{$this->tenantA->id}", [
            'name' => 'Tenant A Updated',
            'latitude' => -6.200000,
            'longitude' => 106.816666,
            'location_address' => 'Jakarta, Indonesia',
        ]);
        $response->assertStatus(200);

        $this->tenantA->refresh();
        $this->assertEquals(-6.200000, $this->tenantA->latitude);
        $this->assertEquals(106.816666, $this->tenantA->longitude);
        $this->assertTrue($this->tenantA->has_location);
    }
}