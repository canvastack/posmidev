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
use Tests\Traits\TenantTestTrait;

class ProductExportTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    private Tenant $otherTenant;
    private User $adminUser;
    private User $managerUser;
    private User $cashierUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
        $this->otherTenant = Tenant::factory()->create();

        // Create additional users with different roles for testing
        $this->createAdditionalUsers();
    }

    protected function createAdditionalUsers(): void
    {
        // Set permission team context for tenant
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

        // Create manager role
        $managerRole = Role::firstOrCreate([
            'name' => 'manager',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $managerRole->givePermissionTo(['products.view', 'products.create', 'products.update']);

        // Create cashier role
        $cashierRole = Role::firstOrCreate([
            'name' => 'cashier',
            'guard_name' => 'api',
            'tenant_id' => $this->tenant->id,
        ]);
        $cashierRole->givePermissionTo(['products.view']);

        // Create users with different roles
        $this->managerUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->managerUser->assignRole($managerRole);

        $this->cashierUser = User::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->cashierUser->assignRole($cashierRole);

        // Reset permission cache
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @test */
    public function admin_can_export_products_as_xlsx()
    {
        // Create test products
        $products = Product::factory()->count(5)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/export?format=xlsx",
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    /** @test */
    public function admin_can_export_products_as_csv()
    {
        // Create test products
        Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/export?format=csv",
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }

    /** @test */
    public function export_defaults_to_xlsx_when_format_not_specified()
    {
        Product::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/export",
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    /** @test */
    public function export_only_includes_tenant_products()
    {
        // Create products for this tenant
        $myProducts = Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        // Create products for another tenant (should not be exported)
        Product::factory()->count(5)->create([
            'tenant_id' => $this->otherTenant->id,
        ]);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/export?format=csv",
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(200);
        
        $content = $response->getContent();
        
        // Count lines (excluding header)
        $lines = explode("\n", trim($content));
        $dataLines = count(array_filter($lines, fn($line) => !empty(trim($line)))) - 1; // -1 for header
        
        // Should export only this tenant's products (3), not the other tenant's (5)
        $this->assertEquals(3, $dataLines);
    }

    /** @test */
    public function export_respects_search_filter()
    {
        $this->actingAs($this->user, 'api');

        // Create products with different names
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Red Apple',
            'sku' => 'APPLE-001',
        ]);

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Green Banana',
            'sku' => 'BANANA-001',
        ]);

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Yellow Apple',
            'sku' => 'APPLE-002',
        ]);

        // Export with search filter
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=csv&search=Apple");

        $response->assertStatus(200);
        
        $content = $response->getContent();
        $lines = explode("\n", trim($content));
        $dataLines = count(array_filter($lines, fn($line) => !empty(trim($line)))) - 1;
        
        // Should only export 2 products containing "Apple"
        $this->assertEquals(2, $dataLines);
    }

    /** @test */
    public function export_respects_category_filter()
    {
        $this->actingAs($this->user, 'api');

        // Create categories
        $category1 = Category::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Electronics',
        ]);

        $category2 = Category::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Clothing',
        ]);

        // Create products in different categories
        Product::factory()->count(3)->create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $category1->id,
        ]);

        Product::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $category2->id,
        ]);

        // Export with category filter
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=csv&category_id={$category1->id}");

        $response->assertStatus(200);
        
        $content = $response->getContent();
        $lines = explode("\n", trim($content));
        $dataLines = count(array_filter($lines, fn($line) => !empty(trim($line)))) - 1;
        
        // Should only export 3 products from category1
        $this->assertEquals(3, $dataLines);
    }

    /** @test */
    public function export_respects_stock_filter()
    {
        $this->actingAs($this->user, 'api');

        // Create products with different stock levels
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock' => 0,
        ]);

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock' => 5,
        ]);

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'stock' => 100,
        ]);

        // Export only out of stock products
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=csv&stock_filter=out_of_stock");

        $response->assertStatus(200);
        
        $content = $response->getContent();
        $lines = explode("\n", trim($content));
        $dataLines = count(array_filter($lines, fn($line) => !empty(trim($line)))) - 1;
        
        // Should only export 1 out of stock product
        $this->assertEquals(1, $dataLines);
    }

    /** @test */
    public function export_respects_price_range_filter()
    {
        $this->actingAs($this->user, 'api');

        // Create products with different prices
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price' => 10.00,
        ]);

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price' => 50.00,
        ]);

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price' => 100.00,
        ]);

        // Export products in price range 20-80
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=csv&min_price=20&max_price=80");

        $response->assertStatus(200);
        
        $content = $response->getContent();
        $lines = explode("\n", trim($content));
        $dataLines = count(array_filter($lines, fn($line) => !empty(trim($line)))) - 1;
        
        // Should only export 1 product ($50)
        $this->assertEquals(1, $dataLines);
    }

    /** @test */
    public function export_respects_multiple_filters_combined()
    {
        $this->actingAs($this->user, 'api');

        $category = Category::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Electronics',
        ]);

        // Product that matches all filters
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Laptop Computer',
            'category_id' => $category->id,
            'price' => 500.00,
            'stock' => 10,
        ]);

        // Product that doesn't match category
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Desktop Computer',
            'category_id' => null,
            'price' => 600.00,
            'stock' => 5,
        ]);

        // Product that doesn't match price range
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Mouse',
            'category_id' => $category->id,
            'price' => 20.00,
            'stock' => 50,
        ]);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=csv&search=Computer&category_id={$category->id}&min_price=100&stock_filter=in_stock");

        $response->assertStatus(200);
        
        $content = $response->getContent();
        $lines = explode("\n", trim($content));
        $dataLines = count(array_filter($lines, fn($line) => !empty(trim($line)))) - 1;
        
        // Should only export 1 product that matches all filters
        $this->assertEquals(1, $dataLines);
    }

    /** @test */
    public function manager_can_export_products()
    {
        $this->actingAs($this->managerUser, 'api');

        Product::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=xlsx");

        $response->assertStatus(200);
    }

    /** @test */
    public function cashier_can_export_products_if_has_view_permission()
    {
        $this->actingAs($this->cashierUser, 'api');

        Product::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=xlsx");

        $response->assertStatus(200);
    }

    /** @test */
    public function user_cannot_export_products_from_another_tenant()
    {
        $this->actingAs($this->user, 'api');

        // Create products for another tenant
        Product::factory()->count(3)->create([
            'tenant_id' => $this->otherTenant->id,
        ]);

        // Try to export another tenant's products
        $response = $this->getJson("/api/v1/tenants/{$this->otherTenant->id}/products/export?format=xlsx");

        $response->assertStatus(403);
    }

    /** @test */
    public function export_without_authentication_fails()
    {
        Product::factory()->count(2)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=xlsx");

        $response->assertStatus(401);
    }

    /** @test */
    public function export_handles_large_dataset()
    {
        $this->actingAs($this->user, 'api');

        // Create 500 products
        Product::factory()->count(500)->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=xlsx");

        $response->assertStatus(200);
    }

    /** @test */
    public function export_includes_correct_headers_in_csv()
    {
        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/export?format=csv",
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(200);
        
        $content = $response->getContent();
        $firstLine = explode("\n", $content)[0];
        
        // Check that essential headers are present
        $this->assertStringContainsString('SKU', $firstLine);
        $this->assertStringContainsString('Name', $firstLine);
        $this->assertStringContainsString('Price', $firstLine);
        $this->assertStringContainsString('Stock', $firstLine);
        $this->assertStringContainsString('Status', $firstLine);
    }

    /** @test */
    public function export_returns_empty_file_when_no_products_match_filters()
    {
        $this->actingAs($this->user, 'api');

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Product',
        ]);

        // Search for non-existent product
        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=csv&search=NonExistentProduct");

        $response->assertStatus(200);
        
        $content = $response->getContent();
        $lines = explode("\n", trim($content));
        $dataLines = count(array_filter($lines, fn($line) => !empty(trim($line)))) - 1;
        
        // Should have header but no data lines
        $this->assertEquals(0, $dataLines);
    }

    /** @test */
    public function export_includes_category_name_in_export()
    {
        $this->actingAs($this->user, 'api');

        $category = Category::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Electronics',
        ]);

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Laptop',
            'category_id' => $category->id,
        ]);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=csv");

        $response->assertStatus(200);
        
        $content = $response->getContent();
        
        // Check if category name is included in the export
        $this->assertStringContainsString('Electronics', $content);
    }

    /** @test */
    public function export_calculates_profit_margin_correctly()
    {
        $this->actingAs($this->user, 'api');

        Product::factory()->create([
            'tenant_id' => $this->tenant->id,
            'price' => 100.00,
            'cost_price' => 60.00, // 40% profit margin
        ]);

        $response = $this->getJson("/api/v1/tenants/{$this->tenant->id}/products/export?format=csv");

        $response->assertStatus(200);
        
        $content = $response->getContent();
        
        // Check if profit margin is calculated (40%)
        $this->assertStringContainsString('40', $content);
    }
}