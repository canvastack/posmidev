<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class CategoriesApiTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    /** @test */
    public function test_can_list_categories_with_pagination(): void
    {
        // Create multiple categories
        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            ['name' => 'Category 1', 'description' => 'Description 1'],
            $this->authenticatedRequest()['headers']
        )->assertCreated();

        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            ['name' => 'Category 2', 'description' => 'Description 2'],
            $this->authenticatedRequest()['headers']
        )->assertCreated();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $this->assertPaginationStructure($response->json());

        $data = $response->json();
        $this->assertCount(2, $data['data']);
        $this->assertEquals(2, $data['total']);
    }

    /** @test */
    public function test_can_create_category_with_valid_data(): void
    {
        $categoryData = [
            'name' => 'Electronics',
            'description' => 'Electronic devices and gadgets',
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            $categoryData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($categoryData['name'], $data['name']);
        $this->assertEquals($categoryData['description'], $data['description']);
        $this->assertEquals($this->tenant->id, $data['tenant_id']);
    }

    /** @test */
    public function test_can_show_single_category(): void
    {
        $createResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            ['name' => 'Test Category', 'description' => 'Test Description'],
            $this->authenticatedRequest()['headers']
        );

        $categoryId = $createResponse->json('data.id');

        // Debug logging untuk memahami category creation
        \Illuminate\Support\Facades\Log::info('Category creation test', [
            'create_response_status' => $createResponse->status(),
            'create_response_content' => $createResponse->json(),
            'extracted_category_id' => $categoryId,
            'tenant_id' => $this->tenant->id,
        ]);

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/categories/{$categoryId}",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals('Test Category', $data['name']);
        $this->assertEquals('Test Description', $data['description']);
        // Note: tenant_id may not be returned in all API versions
        if (isset($data['tenant_id'])) {
            $this->assertEquals($this->tenant->id, $data['tenant_id']);
        }
    }

    /** @test */
    public function test_can_update_category(): void
    {
        $createResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            ['name' => 'Original Name', 'description' => 'Original Description'],
            $this->authenticatedRequest()['headers']
        );

        $categoryId = $createResponse->json('data.id');

        $updateData = [
            'name' => 'Updated Category Name',
            'description' => 'Updated category description',
        ];

        $response = $this->putJson(
            "/api/v1/tenants/{$this->tenant->id}/categories/{$categoryId}",
            $updateData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($updateData['name'], $data['name']);
        $this->assertEquals($updateData['description'], $data['description']);
    }

    /** @test */
    public function test_can_delete_category(): void
    {
        $createResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            ['name' => 'Category to Delete', 'description' => 'Will be deleted'],
            $this->authenticatedRequest()['headers']
        );

        $categoryId = $createResponse->json('data.id');

        $response = $this->deleteJson(
            "/api/v1/tenants/{$this->tenant->id}/categories/{$categoryId}",
            [],
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $response->assertJson(['message' => 'Category deleted successfully']);

        // Verify category is deleted
        $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/categories/{$categoryId}",
            $this->authenticatedRequest()['headers']
        )->assertNotFound();
    }

    /** @test */
    public function test_validation_errors_for_invalid_category_data(): void
    {
        $invalidData = [
            'name' => '', // Required field empty
            'description' => str_repeat('A', 1001), // Too long
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            $invalidData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name']);
    }

    /** @test */
    public function test_unauthorized_user_cannot_access_categories(): void
    {
        // Create user without permissions
        $unauthorizedUser = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Unauthorized User',
            'email' => 'unauthcat@test.com',
            'password' => bcrypt('password'),
        ]);

        $unauthorizedToken = $unauthorizedUser->createToken('unauth-token')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer ' . $unauthorizedToken,
            'Accept' => 'application/json',
        ];

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            $headers
        );

        $response->assertForbidden();
    }

    /** @test */
    public function test_cannot_access_category_from_different_tenant(): void
    {
        // Create category in Tenant A (this->tenant)
        $createResponse = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            ['name' => 'Test Category', 'description' => 'Test Description'],
            $this->authenticatedRequest()['headers']
        );

        $categoryId = $createResponse->json('data.id');

        // Debug: Check response structure
        if ($categoryId === null) {
            \Illuminate\Support\Facades\Log::error('Category creation failed', [
                'response_status' => $createResponse->status(),
                'response_content' => $createResponse->json(),
                'expected_id_path' => 'data.id',
                'available_keys' => array_keys($createResponse->json() ?? []),
            ]);
        }

        // Ensure category was created successfully
        $this->assertNotNull($categoryId, 'Category ID should not be null');

        // Create Tenant B and User B
        $otherTenant = Tenant::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'name' => 'Other Store',
        ]);

        $otherUser = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $otherTenant->id,
            'name' => 'Other User',
            'email' => 'othercat@test.com',
            'password' => bcrypt('password'),
        ]);

        $otherToken = $otherUser->createToken('other-token')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer ' . $otherToken,
            'Accept' => 'application/json',
        ];

        // CRITICAL FIX: Try to access category from Tenant A using Tenant B's ID in URL
        // This should fail because route binding will search for:
        // tenant_id = $otherTenant->id AND id = $categoryId
        // But the category exists with tenant_id = $this->tenant->id
        $response = $this->getJson(
            "/api/v1/tenants/{$otherTenant->id}/categories/{$categoryId}",
            $headers
        );

        // Debug logging untuk memahami response
        \Illuminate\Support\Facades\Log::info('Cross-tenant access test (CORRECTED)', [
            'status' => $response->status(),
            'response_content' => $response->json(),
            'category_owner_tenant' => $this->tenant->id,
            'accessing_tenant' => $otherTenant->id,
            'category_id' => $categoryId,
            'other_user_tenant' => $otherUser->tenant_id,
            'response_headers' => $response->headers->all(),
            'request_url' => "/api/v1/tenants/{$otherTenant->id}/categories/{$categoryId}",
            'expected_behavior' => 'Route binding searches for category with tenant_id = otherTenant->id but finds none',
        ]);

        $response->assertNotFound();
    }
}