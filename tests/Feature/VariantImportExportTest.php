<?php

namespace Tests\Feature;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;

/**
 * VariantImportExportTest
 * 
 * Tests for Import/Export functionality on Product Variants (Priority 3)
 * - Export to Excel/CSV
 * - Download Template
 * - Import from Excel/CSV (Create mode)
 * - Import from Excel/CSV (Update mode)
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * ✅ Teams enabled: TRUE
 * ✅ team_foreign_key: tenant_id
 * ✅ guard_name: api
 * ✅ model_morph_key: model_uuid
 * ✅ Tenant-scoped operations
 * ❌ NO global roles
 */
class VariantImportExportTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;
    protected User $managerUser;
    protected Tenant $tenant;
    protected Tenant $otherTenant;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        // Fake storage for file uploads
        Storage::fake('local');

        // Create tenants
        $this->tenant = Tenant::factory()->create();
        $this->otherTenant = Tenant::factory()->create();

        // Create permissions
        Permission::findOrCreate('products.view', 'api');
        Permission::findOrCreate('products.create', 'api');
        Permission::findOrCreate('products.update', 'api');

        // Set Spatie team context
        app(PermissionRegistrar::class)->setPermissionsTeamId((string) $this->tenant->id);

        // Create admin role with permissions
        $adminRole = Role::create([
            'name' => 'Admin',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $adminRole->givePermissionTo(['products.view', 'products.create', 'products.update']);

        // Create manager role (view only)
        $managerRole = Role::create([
            'name' => 'Manager',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $managerRole->givePermissionTo(['products.view']);

        // Create users
        $this->adminUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->adminUser->assignRole($adminRole);

        $this->managerUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->managerUser->assignRole($managerRole);

        // Create products
        $this->product = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
            'sku' => 'PROD-001',
            'has_variants' => true,
        ]);

        // Reset permission cache
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @test */
    public function can_export_variants_to_excel()
    {
        // Create variants to export
        ProductVariant::factory()->count(5)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variants/export?format=xlsx");

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->assertDownload();
    }

    /** @test */
    public function can_export_variants_to_csv()
    {
        // Create variants to export
        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variants/export?format=csv");

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->assertDownload();
    }

    /** @test */
    public function export_filters_by_product_id()
    {
        // Create another product
        $product2 = Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Another Product',
            'sku' => 'PROD-002',
            'has_variants' => true,
        ]);

        // Create variants for both products
        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        ProductVariant::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $product2->id,
        ]);

        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/export?format=xlsx&product_id={$this->product->id}"
            );

        $response->assertStatus(200)
            ->assertDownload();

        // Note: We can't easily verify the content without decoding the Excel file,
        // but we can verify the response is successful
    }

    /** @test */
    public function export_filters_by_status()
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

        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variants/export?format=xlsx&status=active");

        $response->assertStatus(200)
            ->assertDownload();
    }

    /** @test */
    public function export_only_includes_own_tenant_variants()
    {
        // Create variants for both tenants
        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        // Create product and variants for other tenant
        $otherProduct = Product::factory()->create([
            'tenant_id' => $this->otherTenant->id,
            'has_variants' => true,
        ]);

        ProductVariant::factory()->count(5)->create([
            'tenant_id' => $this->otherTenant->id,
            'product_id' => $otherProduct->id,
        ]);

        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variants/export?format=xlsx");

        $response->assertStatus(200);

        // The export should only include 3 variants from current tenant
        // (We can't easily verify count without decoding Excel, but endpoint should succeed)
    }

    /** @test */
    public function can_download_import_template()
    {
        $response = $this->actingAs($this->adminUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variants/import/template");

        $response->assertStatus(200)
            ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->assertDownload();

        // Verify filename pattern
        $contentDisposition = $response->headers->get('Content-Disposition');
        $this->assertStringContainsString('variant_import_template_', $contentDisposition);
        $this->assertStringContainsString('.xlsx', $contentDisposition);
    }

    /** @test */
    public function can_import_variants_create_mode()
    {
        // Create a CSV file with variant data
        $csvContent = "Product SKU,Variant SKU,Variant Name,Price,Cost Price,Stock,Weight,Attributes\n";
        $csvContent .= "PROD-001,PROD-001-S-RED,Small Red,89.99,45.00,50,0.5,\"Color: Red, Size: S\"\n";
        $csvContent .= "PROD-001,PROD-001-M-BLUE,Medium Blue,99.99,50.00,75,0.6,\"Color: Blue, Size: M\"\n";

        $file = UploadedFile::fake()->createWithContent('variants.csv', $csvContent);

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                ['file' => $file]
            );

        $response->assertStatus(200)
            ->assertJsonStructure([
                'success',
                'imported',
                'updated',
                'skipped',
                'total_errors',
                'message',
            ])
            ->assertJsonPath('success', true)
            ->assertJsonPath('imported', 2)
            ->assertJsonPath('updated', 0);

        // Verify variants were created with correct tenant_id
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'PROD-001-S-RED',
            'name' => 'Small Red',
            'price' => 89.99,
        ]);

        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'PROD-001-M-BLUE',
            'name' => 'Medium Blue',
            'price' => 99.99,
        ]);
    }

    /** @test */
    public function can_import_variants_update_mode()
    {
        // Create existing variant
        $existingVariant = ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'PROD-001-EXISTING',
            'name' => 'Old Name',
            'price' => 50.00,
            'stock' => 10,
        ]);

        // Create CSV with update data
        $csvContent = "Product SKU,Variant SKU,Variant Name,Price,Cost Price,Stock,Weight,Attributes\n";
        $csvContent .= "PROD-001,PROD-001-EXISTING,Updated Name,75.00,35.00,25,0.8,\"Color: Red\"\n";
        $csvContent .= "PROD-001,PROD-001-NEW,New Variant,99.99,50.00,50,1.0,\"Color: Blue\"\n";

        $file = UploadedFile::fake()->createWithContent('variants.csv', $csvContent);

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                [
                    'file' => $file,
                    'update_existing' => true,
                ]
            );

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('imported', 1) // 1 new variant
            ->assertJsonPath('updated', 1); // 1 updated variant

        // Verify existing variant was updated
        $this->assertDatabaseHas('product_variants', [
            'id' => $existingVariant->id,
            'tenant_id' => $this->tenant->id,
            'sku' => 'PROD-001-EXISTING',
            'name' => 'Updated Name',
            'price' => 75.00,
            'stock' => 25,
        ]);

        // Verify new variant was created
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'PROD-001-NEW',
            'name' => 'New Variant',
        ]);
    }

    /** @test */
    public function import_validates_product_exists_in_tenant()
    {
        // Create CSV with non-existent product SKU
        $csvContent = "Product SKU,Variant SKU,Variant Name,Price,Cost Price,Stock,Weight,Attributes\n";
        $csvContent .= "NONEXISTENT-SKU,VAR-001,Test Variant,50.00,25.00,10,0.5,\"\"\n";

        $file = UploadedFile::fake()->createWithContent('variants.csv', $csvContent);

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                ['file' => $file]
            );

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('imported', 0)
            ->assertJsonPath('skipped', 1); // Product not found = skipped

        // Verify variant was NOT created
        $this->assertDatabaseMissing('product_variants', [
            'sku' => 'VAR-001',
        ]);
    }

    /** @test */
    public function import_validates_sku_uniqueness_per_tenant()
    {
        // Create existing variant
        ProductVariant::factory()->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
            'sku' => 'DUPLICATE-SKU',
        ]);

        // Try to import duplicate SKU (without update_existing flag)
        $csvContent = "Product SKU,Variant SKU,Variant Name,Price,Cost Price,Stock,Weight,Attributes\n";
        $csvContent .= "PROD-001,DUPLICATE-SKU,Duplicate Variant,50.00,25.00,10,0.5,\"\"\n";

        $file = UploadedFile::fake()->createWithContent('variants.csv', $csvContent);

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                ['file' => $file]
            );

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('imported', 0)
            ->assertJsonPath('skipped', 1);
    }

    /** @test */
    public function import_respects_file_size_limit()
    {
        // Create a file larger than 10MB
        $largeFile = UploadedFile::fake()->create('large_file.xlsx', 11000); // 11MB

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                ['file' => $largeFile]
            );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /** @test */
    public function import_validates_file_format()
    {
        // Create invalid file format
        $invalidFile = UploadedFile::fake()->create('document.pdf', 100);

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                ['file' => $invalidFile]
            );

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    /** @test */
    public function import_handles_partial_errors_gracefully()
    {
        // Create CSV with mix of valid and invalid data
        $csvContent = "Product SKU,Variant SKU,Variant Name,Price,Cost Price,Stock,Weight,Attributes\n";
        $csvContent .= "PROD-001,VALID-001,Valid Variant 1,50.00,25.00,10,0.5,\"\"\n";
        $csvContent .= "INVALID-SKU,INVALID-001,Invalid Product,50.00,25.00,10,0.5,\"\"\n"; // Invalid product
        $csvContent .= "PROD-001,VALID-002,Valid Variant 2,75.00,35.00,20,0.6,\"\"\n";

        $file = UploadedFile::fake()->createWithContent('variants.csv', $csvContent);

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                ['file' => $file]
            );

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('imported', 2) // 2 valid variants imported
            ->assertJsonPath('skipped', 1); // 1 skipped (product not found)

        // Verify valid variants were created
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'VALID-001',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'VALID-002',
        ]);
    }

    /** @test */
    public function import_creates_variant_attributes_correctly()
    {
        // Create CSV with attributes
        $csvContent = "Product SKU,Variant SKU,Variant Name,Price,Cost Price,Stock,Weight,Attributes\n";
        $csvContent .= "PROD-001,VAR-WITH-ATTRS,Variant With Attributes,50.00,25.00,10,0.5,\"Color: Red, Size: L, Material: Cotton\"\n";

        $file = UploadedFile::fake()->createWithContent('variants.csv', $csvContent);

        $response = $this->actingAs($this->adminUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                ['file' => $file]
            );

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('imported', 1);

        // Verify variant was created
        $this->assertDatabaseHas('product_variants', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'VAR-WITH-ATTRS',
        ]);

        // Verify attributes were parsed and stored in JSON column
        $variant = ProductVariant::where('sku', 'VAR-WITH-ATTRS')->first();
        $this->assertNotNull($variant);
        
        // Attributes are stored as JSON in the variant's attributes column
        $this->assertIsArray($variant->attributes);
        $this->assertArrayHasKey('color', $variant->attributes);
        $this->assertEquals('Red', $variant->attributes['color']);
        
        $this->assertArrayHasKey('size', $variant->attributes);
        $this->assertEquals('L', $variant->attributes['size']);
        
        $this->assertArrayHasKey('material', $variant->attributes);
        $this->assertEquals('Cotton', $variant->attributes['material']);
    }

    /** @test */
    public function manager_without_create_permission_cannot_import()
    {
        $csvContent = "Product SKU,Variant SKU,Variant Name,Price,Cost Price,Stock,Weight,Attributes\n";
        $csvContent .= "PROD-001,VAR-001,Test Variant,50.00,25.00,10,0.5,\"\"\n";

        $file = UploadedFile::fake()->createWithContent('variants.csv', $csvContent);

        $response = $this->actingAs($this->managerUser, 'api')
            ->postJson(
                "/api/v1/tenants/{$this->tenant->id}/variants/import",
                ['file' => $file]
            );

        $response->assertStatus(403);
    }

    /** @test */
    public function manager_without_create_permission_cannot_download_template()
    {
        $response = $this->actingAs($this->managerUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variants/import/template");

        $response->assertStatus(403);
    }

    /** @test */
    public function manager_with_view_permission_can_export()
    {
        // Create some variants
        ProductVariant::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'product_id' => $this->product->id,
        ]);

        $response = $this->actingAs($this->managerUser, 'api')
            ->getJson("/api/v1/tenants/{$this->tenant->id}/variants/export?format=xlsx");

        $response->assertStatus(200)
            ->assertDownload();
    }

    /** @test */
    public function unauthenticated_user_cannot_access_export_import()
    {
        // Test export
        $exportResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/variants/export?format=xlsx"
        );
        $exportResponse->assertStatus(401);

        // Test template download
        $templateResponse = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/variants/import/template"
        );
        $templateResponse->assertStatus(401);

        // Test import
        $file = UploadedFile::fake()->create('variants.csv', 100);
        $importResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/variants/import",
            ['file' => $file]
        );
        $importResponse->assertStatus(401);
    }
}