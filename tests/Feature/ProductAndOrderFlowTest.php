<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;
use Spatie\Permission\PermissionRegistrar;

class ProductAndOrderFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    private function actingAsTenantAdminWithPerms(): array
    {
        $tenant = Tenant::create(['id' => (string)\Ramsey\Uuid\Uuid::uuid4(), 'name' => 'Shop Y']);
        $user = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $tenant->id,
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => 'password',
        ]);

        // Ensure team context and tenant-scoped admin role exists, then assign by model
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenant->id);
        $guard = 'api';
        $role = \App\Models\Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => $guard,
            'tenant_id' => (string) $tenant->id,
        ]);
        $user->assignRole($role);

        // In case admin role in this tenant lacks specific perms in your seeder, explicitly add:
        $user->givePermissionTo(['products.view','products.create','products.update','products.delete']);
        $user->givePermissionTo(['orders.view','orders.create']);

        // Authenticate subsequent requests using Bearer token (works with auth:api)
        $token = $user->createToken('test')->plainTextToken;
        $this->withHeaders(['Authorization' => 'Bearer ' . $token]);
        return [$tenant, $user];
    }

    public function test_product_lifecycle_and_order_creation_with_stock_deduction(): void
    {
        [$tenant, $user] = $this->actingAsTenantAdminWithPerms();

        // 1) Create product with stock=10
        $createProduct = $this->postJson("/api/v1/tenants/{$tenant->id}/products", [
            'name' => 'Mineral Water',
            'sku' => 'MW-001',
            'price' => 2.5,
            'stock' => 10,
            'category_id' => null,
            'description' => '500ml bottle',
            'cost_price' => 1.0,
        ]);
        $createProduct->assertCreated();
        $productId = $createProduct->json('data.id') ?? $createProduct->json('id') ?? $createProduct->json('data.0.id');
        $this->assertNotEmpty($productId, 'Product ID missing in response');

        // 2) Create order buying quantity=3 of the product
        $createOrder = $this->postJson("/api/v1/tenants/{$tenant->id}/orders", [
            'items' => [
                ['product_id' => $productId, 'quantity' => 3]
            ],
            'payment_method' => 'cash',
            'amount_paid' => 100,
            'customer_id' => null,
        ]);
        $createOrder->assertCreated();

        // 3) Ensure product stock is now 7 (10 - 3)
        $getProduct = $this->getJson("/api/v1/tenants/{$tenant->id}/products/{$productId}");
        $getProduct->assertOk();
        $product = $getProduct->json('data') ?? $getProduct->json();

        // Some resources may not expose stock directly; if not available, consider repository check or add test-only endpoint.
        // Here we assert 'stock' exists and equals 7 if exposed by resource shape.
        if (array_key_exists('stock', $product)) {
            $this->assertEquals(7, $product['stock']);
        }

        // 4) Attempt to buy quantity=8 (insufficient stock -> 422)
        $order2 = $this->postJson("/api/v1/tenants/{$tenant->id}/orders", [
            'items' => [
                ['product_id' => $productId, 'quantity' => 8]
            ],
            'payment_method' => 'cash',
            'amount_paid' => 100,
            'customer_id' => null,
        ]);
        $order2->assertStatus(422);
    }
}