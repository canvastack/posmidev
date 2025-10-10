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
        // Clear permission cache sebelum setup
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Buat permissions secara manual untuk test environment
        $this->createTestPermissions();

        $this->tenant = Tenant::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'name' => 'Test Store',
        ]);

        // Pastikan user dibuat dengan tenant_id yang sama dengan tenant yang baru dibuat
        $this->user = User::firstOrCreate(
            ['email' => 'admin@test.com'],
            [
                'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
                'tenant_id' => $this->tenant->id,
                'name' => 'Test Admin',
                'email' => 'admin@test.com',
                'password' => bcrypt('password'),
            ]
        );

        // Update tenant_id jika user sudah ada tapi dengan tenant_id berbeda
        if ($this->user->tenant_id !== $this->tenant->id) {
            $this->user->update(['tenant_id' => $this->tenant->id]);
        }

        // Set tenant context for permissions
        app(PermissionRegistrar::class)->setPermissionsTeamId($this->tenant->id);

        // Debug logging untuk memvalidasi setup (hanya jika dalam development)
        if (config('app.debug')) {
            \Illuminate\Support\Facades\Log::info('TenantTestTrait Setup', [
                'tenant_id' => $this->tenant->id,
                'user_id' => $this->user->id,
                'permissions_count' => \Spatie\Permission\Models\Permission::where('guard_name', 'api')->count(),
                'user_permissions_count' => $this->user->getAllPermissions()->count(),
            ]);
        }

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
            'inventory.adjust', 'testing.access',
            // BOM Engine permissions
            'materials.view', 'materials.create', 'materials.update', 'materials.delete',
            'materials.adjust_stock', 'materials.export', 'materials.import',
            'recipes.view', 'recipes.create', 'recipes.update', 'recipes.delete',
            'recipes.activate', 'recipes.manage_components',
            'bom.calculate', 'bom.batch_plan', 'bom.capacity_forecast',
            'bom.analytics.view', 'bom.alerts.view', 'bom.reports.view', 'bom.reports.export'
        ]);

        // Create token for API authentication
        $this->token = $this->user->createToken('test-token')->plainTextToken;
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
            // BOM Engine permissions
            'materials.view', 'materials.create', 'materials.update', 'materials.delete',
            'materials.adjust_stock', 'materials.export', 'materials.import',
            'recipes.view', 'recipes.create', 'recipes.update', 'recipes.delete',
            'recipes.activate', 'recipes.manage_components',
            'bom.calculate', 'bom.batch_plan', 'bom.capacity_forecast',
            'bom.analytics.view', 'bom.alerts.view', 'bom.reports.view', 'bom.reports.export',
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
        // Gunakan email unik untuk menghindari konflik unique constraint
        $uniqueEmail = 'customer_' . uniqid() . '@test.com';
        // Gunakan phone unik juga untuk menghindari konflik unique constraint
        $uniquePhone = '08123456' . rand(1000, 9999);

        $response = $this->postJson(
            "/api/v1/tenants/{$this->tenant->id}/customers",
            [
                'name' => 'Test Customer',
                'email' => $uniqueEmail,
                'phone' => $uniquePhone,
                'address' => 'Test Address',
                'tags' => ['VIP', 'Regular']
            ],
            $this->authenticatedRequest()['headers']
        );

        $response->assertCreated();
        $customerId = $response->json('data.id') ?? $response->json('id');

        return ['id' => $customerId, 'email' => $uniqueEmail, 'phone' => $uniquePhone, 'response' => $response];
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

    protected function createOtherTenant(): Tenant
    {
        return Tenant::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'name' => 'Other Test Store',
        ]);
    }

    protected function createUserWithoutPermissions(): User
    {
        $user = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $this->tenant->id,
            'name' => 'User Without Permissions',
            'email' => 'nouser@test.com',
            'password' => bcrypt('password'),
        ]);

        // Don't assign any roles or permissions
        return $user;
    }
}