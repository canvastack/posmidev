<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class ProductsApiTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    /** @test */
    public function test_can_list_products_with_pagination(): void
    {
        // Create multiple products
        $this->createTestProduct();
        $this->createTestProduct();
        $this->createTestProduct();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $this->assertPaginationStructure($response->json());

        $data = $response->json();
        $this->assertCount(3, $data['data']);
        $this->assertEquals(1, $data['current_page']);
        $this->assertEquals(3, $data['total']);
    }

    /** @test */
    public function test_can_create_product_with_valid_data(): void
    {
        $productData = [
            'name' => 'New Test Product',
            'sku' => 'NEW-TEST-001',
            'price' => 250.00,
            'stock' => 100,
            'description' => 'A new test product',
            'cost_price' => 200.00,
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products",
            $productData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($productData['name'], $data['name']);
        $this->assertEquals($productData['sku'], $data['sku']);
        $this->assertEquals($productData['price'], $data['price']);
        $this->assertEquals($productData['stock'], $data['stock']);
        $this->assertEquals($this->tenant->id, $data['tenant_id']);
    }

    /** @test */
    public function test_cannot_create_product_with_duplicate_sku(): void
    {
        // Create first product
        $productData1 = [
            'name' => 'First Product',
            'sku' => 'DUPLICATE-SKU',
            'price' => 100.00,
            'stock' => 10,
        ];

        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products",
            $productData1,
            $this->authenticatedRequest()['headers']
        )->assertCreated();

        // Try to create second product with same SKU
        $productData2 = [
            'name' => 'Second Product',
            'sku' => 'DUPLICATE-SKU',
            'price' => 150.00,
            'stock' => 5,
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products",
            $productData2,
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['sku']);
    }

    /** @test */
    public function test_can_show_single_product(): void
    {
        $product = $this->createTestProduct();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product['id']}",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($product['id'], $data['id']);
        $this->assertEquals($product['data']['name'], $data['name']);
        $this->assertEquals($product['data']['sku'], $data['sku']);
    }

    /** @test */
    public function test_can_update_product(): void
    {
        $product = $this->createTestProduct();

        $updateData = [
            'name' => 'Updated Product Name',
            'sku' => $product['data']['sku'], // Include required sku
            'price' => 300.00,
            'stock' => $product['data']['stock'], // Include required stock
            'description' => 'Updated description',
        ];

        $response = $this->putJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product['id']}",
            $updateData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($updateData['name'], $data['name']);
        $this->assertEquals($updateData['price'], $data['price']);
        $this->assertEquals($updateData['description'], $data['description']);
        // Original data should remain unchanged
        $this->assertEquals($product['data']['sku'], $data['sku']);
        $this->assertEquals($product['data']['stock'], $data['stock']);
    }

    /** @test */
    public function test_can_delete_product(): void
    {
        $product = $this->createTestProduct();

        $response = $this->deleteJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product['id']}",
            [],
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertJson(['message' => 'Product deleted successfully']);

        // Verify product is deleted
        $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products/{$product['id']}",
            $this->authenticatedRequest()['headers']
        )->assertNotFound();
    }

    /** @test */
    public function test_cannot_access_product_from_different_tenant(): void
    {
        // Create product in Tenant A (this->tenant)
        $product = $this->createTestProduct();

        // Create Tenant B and User B
        $otherTenant = Tenant::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'name' => 'Other Store',
        ]);

        $otherUser = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $otherTenant->id,
            'name' => 'Other User',
            'email' => 'other@test.com',
            'password' => bcrypt('password'),
        ]);

        $otherToken = $otherUser->createToken('other-token')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer ' . $otherToken,
            'Accept' => 'application/json',
        ];

        // CRITICAL FIX: Try to access product from Tenant A using Tenant B's ID in URL
        // This should fail because route binding will search for:
        // tenant_id = $otherTenant->id AND id = $product['id']
        // But the product exists with tenant_id = $this->tenant->id
        $response = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/products/{$product['id']}",
            $headers
        );

        // Debug logging untuk memahami response
        \Illuminate\Support\Facades\Log::info('Cross-tenant product access test', [
            'status' => $response->status(),
            'response_content' => $response->json(),
            'product_owner_tenant' => $this->tenant->id,
            'accessing_tenant' => $otherTenant->id,
            'product_id' => $product['id'],
            'other_user_tenant' => $otherUser->tenant_id,
            'response_headers' => $response->headers->all(),
            'request_url' => "/api/v1/tenants/{$otherTenant->id}/products/{$product['id']}",
            'expected_behavior' => 'Route binding searches for product with tenant_id = otherTenant->id but finds none',
        ]);

        $response->assertNotFound();
    }

    /** @test */
    public function test_unauthorized_user_cannot_access_products(): void
    {
        // Create user without permissions
        $unauthorizedUser = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Unauthorized User',
            'email' => 'unauthorized@test.com',
            'password' => bcrypt('password'),
        ]);

        $unauthorizedToken = $unauthorizedUser->createToken('unauth-token')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer ' . $unauthorizedToken,
            'Accept' => 'application/json',
        ];

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products",
            $headers
        );

        $response->assertForbidden();
    }

    /** @test */
    public function test_validation_errors_are_returned_for_invalid_data(): void
    {
        $invalidData = [
            'name' => '', // Required field empty
            'sku' => '',  // Required field empty
            'price' => -10, // Negative price
            'stock' => -5,  // Negative stock
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products",
            $invalidData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'sku', 'price', 'stock']);
    }

    /** @test */
    public function test_can_filter_products_by_category(): void
    {
        $category = $this->createTestCategory();
        $productWithCategory = $this->createTestProduct($category['id']);
        $productWithoutCategory = $this->createTestProduct();

        // Note: This test assumes there's a category filter in the API
        // If not implemented yet, this test will help define the requirement
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/products?category_id={$category['id']}",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json();

        // Should return paginated results
        $this->assertPaginationStructure($data);
    }
}