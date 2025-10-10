<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;

class EndToEndWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Clear permission cache sebelum setup
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Buat permissions secara manual untuk test environment
        $this->createTestPermissions();
    }

    private function createTestPermissions(): void
    {
        $permissions = [
            // Product permissions
            'products.view', 'products.create', 'products.update', 'products.delete',
            'products.restore', 'products.delete.permanent', 'products.export', 'products.import',
            // Inventory permissions
            'inventory.adjust', 'products.stock.adjust',
            // Order permissions
            'orders.view', 'orders.create', 'orders.update', 'orders.delete',
            // Category permissions
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            // Customer permissions
            'customers.view', 'customers.create', 'customers.update', 'customers.delete',
            // Content pages permissions
            'content.view', 'content.create', 'content.update', 'content.delete',
            // User management permissions
            'users.view', 'users.create', 'users.update', 'users.delete',
            // Tenant management permissions
            'tenants.view', 'tenants.create', 'tenants.update', 'tenants.delete',
            'tenants.set-status', 'tenants.manage-auto-activation',
            // Role management permissions
            'roles.view', 'roles.create', 'roles.update', 'roles.delete',
            // Report permissions
            'reports.view', 'reports.export',
            // Settings permissions
            'settings.view', 'settings.update',
            // EAV permissions
            'blueprints.view', 'blueprints.create', 'blueprints.update',
            'customers.attributes.view', 'customers.attributes.update',
            // Testing/Diagnostics
            'testing.access',
        ];

        foreach ($permissions as $permission) {
            \Spatie\Permission\Models\Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'api',
            ]);
        }
    }

    /** @test */
    public function test_complete_e2e_workflow_register_to_stock_deduction(): void
    {
        // 1. Register Tenant
        $registerResponse = $this->postJson('/api/v1/register', [
            'tenant_name' => 'E2E Test Store',
            'user_name' => 'Store Owner',
            'email' => 'owner@e2etest.com',
            'password' => 'password123',
        ]);

        $registerResponse->assertCreated();
        $responseData = $registerResponse->json();

        $this->assertArrayHasKey('user', $responseData);
        $this->assertArrayHasKey('token', $responseData);

        $user = $responseData['user'];
        $token = $responseData['token'];

        // Verify user was created with correct tenant
        $this->assertEquals('Store Owner', $user['name']);
        $this->assertEquals('owner@e2etest.com', $user['email']);
        $this->assertArrayHasKey('tenant_id', $user);

        $tenantId = $user['tenant_id'];

        // 2. Login with created user
        $loginResponse = $this->postJson('/api/v1/login', [
            'email' => 'owner@e2etest.com',
            'password' => 'password123',
        ]);

        $loginResponse->assertOk();
        $loginData = $loginResponse->json();

        $this->assertArrayHasKey('user', $loginData);
        $this->assertArrayHasKey('token', $loginData);
        $this->assertEquals($user['id'], $loginData['user']['id']);

        // Give admin permissions to the registered user
        $userModel = User::where('email', 'owner@e2etest.com')->first();
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);
        $userModel->givePermissionTo([
            'products.view', 'products.create', 'products.update', 'products.delete',
            'categories.view', 'categories.create', 'categories.update', 'categories.delete',
            'orders.view', 'orders.create', 'orders.update', 'orders.delete',
            'customers.view', 'customers.create', 'customers.update', 'customers.delete',
        ]);

        // Use token for subsequent requests
        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];

        // 3. Create Category
        $categoryResponse = $this->postJson(
            "/api/v1/tenants/{$tenantId}/categories",
            [
                'name' => 'Electronics',
                'description' => 'Electronic devices and accessories'
            ],
            $headers
        );

        $categoryResponse->assertCreated();
        $categoryData = $categoryResponse->json('data') ?? $categoryResponse->json();
        $categoryId = $categoryData['id'];

        $this->assertEquals('Electronics', $categoryData['name']);
        $this->assertEquals('Electronic devices and accessories', $categoryData['description']);
        $this->assertEquals($tenantId, $categoryData['tenant_id']);

        // 4. Create Product
        $productResponse = $this->postJson(
            "/api/v1/tenants/{$tenantId}/products",
            [
                'name' => 'Smartphone Pro Max',
                'sku' => 'SPM-001',
                'price' => 1500.00,
                'stock' => 20,
                'category_id' => $categoryId,
                'description' => 'Latest smartphone with advanced features',
                'cost_price' => 1200.00,
            ],
            $headers
        );

        $productResponse->assertCreated();
        $productData = $productResponse->json('data') ?? $productResponse->json();
        $productId = $productData['id'];

        $this->assertEquals('Smartphone Pro Max', $productData['name']);
        $this->assertEquals('SPM-001', $productData['sku']);
        $this->assertEquals(1500.00, $productData['price']);
        $this->assertEquals(20, $productData['stock']);
        $this->assertEquals($categoryId, $productData['category_id']);
        $this->assertEquals($tenantId, $productData['tenant_id']);

        // 5. Create Order
        $orderResponse = $this->postJson(
            "/api/v1/tenants/{$tenantId}/orders",
            [
                'items' => [
                    [
                        'product_id' => $productId,
                        'quantity' => 3
                    ]
                ],
                'payment_method' => 'cash',
                'amount_paid' => 4500.00,
            ],
            $headers
        );

        $orderResponse->assertCreated();
        $orderData = $orderResponse->json('data') ?? $orderResponse->json();
        $orderId = $orderData['id'];

        $this->assertArrayHasKey('items', $orderData);
        $this->assertCount(1, $orderData['items']);
        $this->assertEquals($productId, $orderData['items'][0]['product_id']);
        $this->assertEquals(3, $orderData['items'][0]['quantity']);
        $this->assertEquals(4500.00, $orderData['total_amount']);

        // 6. Verify Stock Deduction
        $productAfterOrderResponse = $this->getJson(
            "/api/v1/tenants/{$tenantId}/products/{$productId}",
            $headers
        );

        $productAfterOrderResponse->assertOk();
        $updatedProductData = $productAfterOrderResponse->json('data') ?? $productAfterOrderResponse->json();

        // Stock should be reduced from 20 to 17
        $this->assertEquals(17, $updatedProductData['stock']);
        $this->assertEquals('Smartphone Pro Max', $updatedProductData['name']);

        // 7. Verify Order Items relationship
        $orderDetailsResponse = $this->getJson(
            "/api/v1/tenants/{$tenantId}/orders/{$orderId}",
            $headers
        );

        $orderDetailsResponse->assertOk();
        $orderDetailsData = $orderDetailsResponse->json('data') ?? $orderDetailsResponse->json();

        $this->assertEquals($productId, $orderDetailsData['items'][0]['product_id']);
        $this->assertEquals('Smartphone Pro Max', $orderDetailsData['items'][0]['product_name']);
        $this->assertEquals(3, $orderDetailsData['items'][0]['quantity']);
        $this->assertEquals(1500.00, $orderDetailsData['items'][0]['price']);
        $this->assertEquals(4500.00, $orderDetailsData['items'][0]['subtotal']);
    }

    /** @test */
    public function test_insufficient_stock_prevents_order_creation(): void
    {
        // Register and setup
        $registerResponse = $this->postJson('/api/v1/register', [
            'tenant_name' => 'Stock Test Store',
            'user_name' => 'Stock Manager',
            'email' => 'stock@test.com',
            'password' => 'password123',
        ]);

        $registerResponse->assertCreated();
        $token = $registerResponse->json('token');
        $tenantId = $registerResponse->json('user.tenant_id');

        // Give admin permissions to the registered user
        $userModel = User::where('email', 'stock@test.com')->first();
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);
        $userModel->givePermissionTo([
            'products.view', 'products.create', 'products.update', 'products.delete',
            'orders.view', 'orders.create', 'orders.update', 'orders.delete',
        ]);

        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];

        // Create product with stock = 5
        $productResponse = $this->postJson(
            "/api/v1/tenants/{$tenantId}/products",
            [
                'name' => 'Limited Product',
                'sku' => 'LIMITED-002', // Different SKU to avoid conflicts
                'price' => 100.00,
                'stock' => 5,
                'description' => 'Product with limited stock',
            ],
            $headers
        );

        $productResponse->assertCreated();
        $productId = $productResponse->json('data.id');

        // Verify initial stock
        $initialStock = 5;

        // Try to order 10 items (more than available stock)
        $orderResponse = $this->postJson(
            "/api/v1/tenants/{$tenantId}/orders",
            [
                'items' => [
                    [
                        'product_id' => $productId,
                        'quantity' => 10
                    ]
                ],
                'payment_method' => 'cash',
                'amount_paid' => 1000.00,
            ],
            $headers
        );

        // Should fail with validation error
        $orderResponse->assertStatus(422);
        $this->assertArrayHasKey('errors', $orderResponse->json());
    }

    /** @test */
    public function test_unauthorized_access_is_blocked(): void
    {
        // Create tenant and user
        $tenant = Tenant::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'name' => 'Protected Store',
        ]);

        $user = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $tenant->id,
            'name' => 'Regular User',
            'email' => 'user@protected.com',
            'password' => bcrypt('password'),
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        // Try to access products without proper permissions
        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];

        $response = $this->getJson(
            "/api/v1/tenants/{$tenant->id}/products",
            $headers
        );

        // Should be forbidden due to missing permissions
        $response->assertForbidden();
    }
}