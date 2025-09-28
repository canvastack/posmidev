<?php

namespace Tests\Traits;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Spatie\Permission\PermissionRegistrar;
use Database\Seeders\PermissionSeeder;

trait TenantTestTrait
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected User $user;
    protected string $token;

    protected function setUpTenantWithAdminUser(): void
    {
        $this->seed(PermissionSeeder::class);

        $this->tenant = Tenant::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'name' => 'Test Store',
        ]);

        $this->user = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $this->tenant->id,
            'name' => 'Test Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);

        // Set tenant context for permissions
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

        // Create and assign admin role with all necessary permissions
        $adminRole = \App\Models\Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'api',
            'tenant_id' => (string) $this->tenant->id,
        ]);

        $this->user->assignRole($adminRole);

        // Give all necessary permissions for testing
        $this->user->givePermissionTo([
            'products.view', 'products.create', 'products.update', 'products.delete',
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            'orders.view', 'orders.create', 'orders.update', 'orders.delete',
            'customers.view', 'customers.create', 'customers.update', 'customers.delete',
            'users.view', 'users.create', 'users.update', 'users.delete',
            'roles.view', 'roles.create', 'roles.update', 'roles.delete',
            'settings.view', 'settings.update', 'reports.view', 'reports.export',
            'inventory.adjust', 'testing.access'
        ]);

        // Create token for API authentication
        $this->token = $this->user->createToken('test-token')->plainTextToken;
    }

    protected function authenticatedRequest(): array
    {
        return [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->token,
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
            ]
        ];
    }

    protected function createTestCategory(): array
    {
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/categories",
            [
                'name' => 'Test Category',
                'description' => 'Test category description'
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $categoryId = $response->json('data.id') ?? $response->json('id');

        return ['id' => $categoryId, 'response' => $response];
    }

    protected function createTestProduct(?string $categoryId = null): array
    {
        $productData = [
            'name' => 'Test Product',
            'sku' => 'TEST-' . uniqid(),
            'price' => 100.00,
            'stock' => 50,
            'description' => 'Test product description',
            'cost_price' => 80.00,
        ];

        if ($categoryId) {
            $productData['category_id'] = $categoryId;
        }

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/products",
            $productData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $productId = $response->json('data.id') ?? $response->json('id');

        return ['id' => $productId, 'data' => $productData, 'response' => $response];
    }

    protected function createTestCustomer(): array
    {
        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            [
                'name' => 'Test Customer',
                'email' => 'customer@test.com',
                'phone' => '08123456789',
                'address' => 'Test Address',
                'tags' => ['VIP', 'Regular']
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $customerId = $response->json('data.id') ?? $response->json('id');

        return ['id' => $customerId, 'response' => $response];
    }

    protected function createTestOrder(string $productId, int $quantity = 1, ?string $customerId = null): array
    {
        $orderData = [
            'items' => [
                ['product_id' => $productId, 'quantity' => $quantity]
            ],
            'payment_method' => 'cash',
            'amount_paid' => 1000.00,
        ];

        if ($customerId) {
            $orderData['customer_id'] = $customerId;
        }

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/orders",
            $orderData,
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $orderId = $response->json('data.id') ?? $response->json('id');

        return ['id' => $orderId, 'data' => $orderData, 'response' => $response];
    }

    protected function assertPaginationStructure(array $response): void
    {
        $this->assertArrayHasKey('data', $response);
        $this->assertArrayHasKey('current_page', $response);
        $this->assertArrayHasKey('last_page', $response);
        $this->assertArrayHasKey('per_page', $response);
        $this->assertArrayHasKey('total', $response);

        $this->assertIsArray($response['data']);
        $this->assertIsInt($response['current_page']);
        $this->assertIsInt($response['last_page']);
        $this->assertIsInt($response['per_page']);
        $this->assertIsInt($response['total']);
    }
}