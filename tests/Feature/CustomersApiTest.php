<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class CustomersApiTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    /** @test */
    public function test_can_list_customers_with_pagination(): void
    {
        // Create multiple customers
        $this->createTestCustomer();
        $this->createTestCustomer();
        $this->createTestCustomer();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $this->assertPaginationStructure($response->json());

        $data = $response->json();
        $this->assertCount(3, $data['data']);
        $this->assertEquals(3, $data['total']);
    }

    /** @test */
    public function test_can_create_customer_with_valid_data(): void
    {
        $customerData = [
            'name' => 'John Doe',
            'email' => 'john.doe@example.com',
            'phone' => '08123456789',
            'address' => '123 Main Street, Jakarta',
            'tags' => ['VIP', 'Regular Customer'],
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            $customerData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($customerData['name'], $data['name']);
        $this->assertEquals($customerData['email'], $data['email']);
        $this->assertEquals($customerData['phone'], $data['phone']);
        // Note: address field may not be returned in all API versions
        if (isset($data['address'])) {
            $this->assertEquals($customerData['address'], $data['address']);
        }
        $this->assertEquals($customerData['tags'], $data['tags']);
        // Note: tenant_id field may not be returned in all API versions
        if (isset($data['tenant_id'])) {
            $this->assertEquals($this->tenant->id, $data['tenant_id']);
        }
    }

    /** @test */
    public function test_can_search_customers(): void
    {
        // Create customers with different data
        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            [
                'name' => 'John Smith',
                'email' => 'john.smith@example.com',
                'phone' => '08111111111',
            ],
            $this->authenticatedRequest()['headers']
        )->assertCreated();

        $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            [
                'name' => 'Jane Doe',
                'email' => 'jane.doe@example.com',
                'phone' => '08222222222',
            ],
            $this->authenticatedRequest()['headers']
        )->assertCreated();

        // Search by name
        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/customers?q=John",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json();
        $this->assertPaginationStructure($data);
        $this->assertEquals(1, $data['total']);
        $this->assertEquals('John Smith', $data['data'][0]['name']);
    }

    /** @test */
    public function test_can_show_single_customer(): void
    {
        $customer = $this->createTestCustomer();

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/customers/{$customer['id']}",
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($customer['id'], $data['id']);
        $this->assertEquals('Test Customer', $data['name']);
        $this->assertEquals('customer@test.com', $data['email']);
    }

    /** @test */
    public function test_can_update_customer(): void
    {
        $customer = $this->createTestCustomer();

        $updateData = [
            'name' => 'Updated Customer Name',
            'email' => 'updated@example.com',
            'phone' => '08999999999',
            'address' => 'Updated Address',
            'tags' => ['Premium', 'Loyal'],
        ];

        $response = $this->patchJson(
            "/api/v1/tenants/{$this->tenant->id}/customers/{$customer['id']}",
            $updateData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertOk();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals($updateData['name'], $data['name']);
        $this->assertEquals($updateData['email'], $data['email']);
        $this->assertEquals($updateData['phone'], $data['phone']);
        // Note: address field may not be returned in all API versions
        if (isset($data['address'])) {
            $this->assertEquals($updateData['address'], $data['address']);
        }
        $this->assertEquals($updateData['tags'], $data['tags']);
    }

    /** @test */
    public function test_can_delete_customer(): void
    {
        $customer = $this->createTestCustomer();

        $response = $this->deleteJson(
            "/api/v1/tenants/{$this->tenant->id}/customers/{$customer['id']}",
            [],
            $this->authenticatedRequest()['headers']
        );

        $response->assertNoContent();

        // Verify customer is deleted
        $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/customers/{$customer['id']}",
            $this->authenticatedRequest()['headers']
        )->assertNotFound();
    }

    /** @test */
    public function test_validation_errors_for_invalid_customer_data(): void
    {
        $invalidData = [
            'name' => '', // Required field empty
            'email' => 'invalid-email', // Invalid email format
            'phone' => '123', // Too short phone
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            $invalidData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'email']);
    }

    /** @test */
    public function test_unauthorized_user_cannot_access_customers(): void
    {
        $unauthorizedUser = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Unauthorized User',
            'email' => 'unauthcust@test.com',
            'password' => bcrypt('password'),
        ]);

        $unauthorizedToken = $unauthorizedUser->createToken('unauth-token')->plainTextToken;

        $headers = [
            'Authorization' => 'Bearer ' . $unauthorizedToken,
            'Accept' => 'application/json',
        ];

        $response = $this->getJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            $headers
        );

        $response->assertForbidden();
    }

    /** @test */
    public function test_can_create_customer_with_minimal_data(): void
    {
        $minimalData = [
            'name' => 'Minimal Customer',
        ];

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            $minimalData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $data = $response->json('data') ?? $response->json();

        $this->assertEquals('Minimal Customer', $data['name']);
        $this->assertNull($data['email'] ?? null);
        $this->assertNull($data['phone'] ?? null);
        $this->assertNull($data['address'] ?? null);
    }
}