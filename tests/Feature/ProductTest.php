<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Tenant;
use Laravel\Sanctum\Sanctum;
use Database\Seeders\PermissionSeeder;

class ProductTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    private function actingAsTenantUser(): array
    {
        $tenant = Tenant::create(['id' => (string)\Ramsey\Uuid\Uuid::uuid4(), 'name' => 'Shop X']);
        $user = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $tenant->id,
            'name' => 'Tester',
            'email' => 'tester@example.com',
            'password' => 'password',
        ]);

        $user->assignRole('admin');

        Sanctum::actingAs($user, ['*']);
        return [$tenant, $user];
    }

    public function test_list_products_returns_empty_array_initially(): void
    {
        [$tenant] = $this->actingAsTenantUser();

        $response = $this->getJson("/api/v1/tenants/{$tenant->id}/products");

        $response->assertOk()->assertJson([]);
    }
}