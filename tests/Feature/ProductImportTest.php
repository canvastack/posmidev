<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Category;
use Src\Pms\Infrastructure\Models\Tenant;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Database\Seeders\PermissionSeeder;

class ProductImportTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminUser;
    private User $managerUser;
    private User $cashierUser;
    private Tenant $otherTenant;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed permissions
        $this->seed(PermissionSeeder::class);

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

        // Reset permission cache
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @test */
    public function admin_can_download_import_template()
    {
        $this->actingAs($this->adminUser, 'api');

        $response = $this->get("/api/v1/tenants/{$this->tenant->id}/products/import/template");

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    /** @test */
    public function admin_can_import_valid_products()
    {
        $this->actingAs($this->adminUser, 'api');

        $category = Category::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Electronics',
        ]);

        // Create a CSV file with valid data
        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Description', 'Category', 'Price', 'Cost Price', 'Stock', 'Status'],
            ['LAPTOP-001', 'Gaming Laptop', 'High-performance laptop', 'Electronics', '1500.00', '1000.00', '10', 'active'],
            ['MOUSE-001', 'Wireless Mouse', 'Ergonomic mouse', 'Electronics', '25.00', '15.00', '50', 'active'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'imported' => 2,
            'skipped' => 0,
            'total_errors' => 0,
        ]);

        // Verify products were created
        $this->assertDatabaseHas('products', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'LAPTOP-001',
            'name' => 'Gaming Laptop',
            'price' => 1500.00,
        ]);

        $this->assertDatabaseHas('products', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'MOUSE-001',
            'name' => 'Wireless Mouse',
            'price' => 25.00,
        ]);
    }

    /** @test */
    public function import_skips_duplicate_sku_within_tenant()
    {
        $this->actingAs($this->adminUser, 'api');

        // Create existing product
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'sku' => 'EXISTING-001',
        ]);

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['EXISTING-001', 'Duplicate Product', '100.00'],
            ['NEW-001', 'New Product', '50.00'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('imported', 1); // Only new product
        $response->assertJsonPath('skipped', 1); // Duplicate skipped

        // Verify only the new product was imported
        $this->assertEquals(2, Product::where('tenant_id', $this->tenant->id)->count());
        $this->assertDatabaseHas('products', [
            'tenant_id' => $this->tenant->id,
            'sku' => 'NEW-001',
        ]);
    }

    /** @test */
    public function import_validates_required_fields()
    {
        $this->actingAs($this->adminUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['', 'Missing SKU', '100.00'], // Missing SKU
            ['VALID-001', '', '50.00'], // Missing Name
            ['VALID-002', 'Missing Price', ''], // Missing Price
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('total_errors'));
        
        // No products should be imported due to validation errors
        $this->assertEquals(0, Product::where('tenant_id', $this->tenant->id)->count());
    }

    /** @test */
    public function import_validates_numeric_fields()
    {
        $this->actingAs($this->adminUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price', 'Cost Price', 'Stock'],
            ['PROD-001', 'Product 1', 'invalid', '50.00', '10'], // Invalid price
            ['PROD-002', 'Product 2', '100.00', 'invalid', '20'], // Invalid cost price
            ['PROD-003', 'Product 3', '75.00', '50.00', 'invalid'], // Invalid stock
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        $this->assertGreaterThan(0, $response->json('total_errors'));
    }

    /** @test */
    public function import_validates_status_field()
    {
        $this->actingAs($this->adminUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price', 'Status'],
            ['PROD-001', 'Valid Active', '100.00', 'active'],
            ['PROD-002', 'Valid Inactive', '50.00', 'inactive'],
            ['PROD-003', 'Invalid Status', '75.00', 'invalid_status'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        
        // First two should succeed, third should fail
        $this->assertEquals(2, $response->json('imported'));
        $this->assertGreaterThan(0, $response->json('total_errors'));
    }

    /** @test */
    public function import_finds_category_by_name_within_tenant()
    {
        $this->actingAs($this->adminUser, 'api');

        $myCategory = Category::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Electronics',
        ]);

        // Create category with same name in different tenant
        $otherCategory = Category::factory()->create([
            'tenant_id' => $this->otherTenant->id,
            'name' => 'Electronics',
        ]);

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price', 'Category'],
            ['PROD-001', 'Product 1', '100.00', 'Electronics'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('imported', 1);

        // Verify product has correct tenant's category
        $product = Product::where('sku', 'PROD-001')->first();
        $this->assertEquals($myCategory->id, $product->category_id);
        $this->assertNotEquals($otherCategory->id, $product->category_id);
    }

    /** @test */
    public function import_handles_missing_category_gracefully()
    {
        $this->actingAs($this->adminUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price', 'Category'],
            ['PROD-001', 'Product 1', '100.00', 'NonExistentCategory'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        
        // Should still import but with null category
        $product = Product::where('sku', 'PROD-001')->first();
        $this->assertNotNull($product);
        $this->assertNull($product->category_id);
    }

    /** @test */
    public function import_products_are_scoped_to_correct_tenant()
    {
        $this->actingAs($this->adminUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['PROD-001', 'Product 1', '100.00'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);

        // Verify product has correct tenant_id
        $product = Product::where('sku', 'PROD-001')->first();
        $this->assertEquals($this->tenant->id, $product->tenant_id);
        
        // Verify it's not visible to other tenant
        $this->assertEquals(0, Product::where('tenant_id', $this->otherTenant->id)->count());
    }

    /** @test */
    public function manager_can_import_products()
    {
        $this->actingAs($this->managerUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['PROD-001', 'Product 1', '100.00'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('imported', 1);
    }

    /** @test */
    public function cashier_cannot_import_products_without_create_permission()
    {
        // Remove create permission from cashier
        $this->cashierUser->revokePermissionTo('products.create', $this->tenant->id);

        $this->actingAs($this->cashierUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['PROD-001', 'Product 1', '100.00'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function user_cannot_import_to_another_tenant()
    {
        $this->actingAs($this->adminUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['PROD-001', 'Product 1', '100.00'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->otherTenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(403);
    }

    /** @test */
    public function import_without_authentication_fails()
    {
        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['PROD-001', 'Product 1', '100.00'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(401);
    }

    /** @test */
    public function import_rejects_invalid_file_types()
    {
        $this->actingAs($this->adminUser, 'api');

        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $file,
        ]);

        $response->assertStatus(422);
    }

    /** @test */
    public function import_handles_large_file()
    {
        $this->actingAs($this->adminUser, 'api');

        // Create CSV with 1000 rows
        $rows = [['SKU', 'Name', 'Price']];
        for ($i = 1; $i <= 1000; $i++) {
            $rows[] = ["SKU-{$i}", "Product {$i}", (100 + $i) . '.00'];
        }

        $csv = $this->createCsvFile($rows);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('imported', 1000);
        
        // Verify all products were imported
        $this->assertEquals(1000, Product::where('tenant_id', $this->tenant->id)->count());
    }

    /** @test */
    public function import_returns_detailed_error_messages()
    {
        $this->actingAs($this->adminUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['', 'Missing SKU', '100.00'], // Row 2 error
            ['VALID-001', '', '50.00'], // Row 3 error
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'imported',
            'skipped',
            'total_errors',
            'errors' => [
                '*' => ['row', 'attribute', 'errors', 'values']
            ],
            'message',
        ]);
    }

    /** @test */
    public function import_sets_default_values_for_optional_fields()
    {
        $this->actingAs($this->adminUser, 'api');

        $csv = $this->createCsvFile([
            ['SKU', 'Name', 'Price'],
            ['PROD-001', 'Minimal Product', '100.00'],
        ]);

        $response = $this->postJson("/api/v1/tenants/{$this->tenant->id}/products/import", [
            'file' => $csv,
        ]);

        $response->assertStatus(200);

        $product = Product::where('sku', 'PROD-001')->first();
        $this->assertEquals('active', $product->status); // Default status
        $this->assertEquals(0, $product->stock); // Default stock
        $this->assertNull($product->category_id); // Default null category
    }

    /**
     * Helper method to create a CSV file for testing
     */
    protected function createCsvFile(array $rows): UploadedFile
    {
        $filename = 'test_import_' . uniqid() . '.csv';
        $path = sys_get_temp_dir() . '/' . $filename;

        $handle = fopen($path, 'w');
        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }
        fclose($handle);

        return new UploadedFile($path, $filename, 'text/csv', null, true);
    }

    protected function tearDown(): void
    {
        // Clean up temporary CSV files
        $files = glob(sys_get_temp_dir() . '/test_import_*.csv');
        foreach ($files as $file) {
            if (file_exists($file)) {
                @unlink($file);
            }
        }

        parent::tearDown();
    }
}