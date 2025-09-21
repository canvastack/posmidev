<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Tenant;
use Database\Seeders\PermissionSeeder;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);
    }

    public function test_register_creates_tenant_user_and_returns_token(): void
    {
        $response = $this->postJson('/api/v1/register', [
            'tenant_name' => 'Tenant A',
            'user_name' => 'Alice',
            'email' => 'alice@example.com',
            'password' => 'secret123',
            'password_confirmation' => 'secret123',
        ]);

        $response->assertCreated()
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'name', 'email', 'tenant_id'],
                'token',
            ]);

        $this->assertDatabaseHas('tenants', ['name' => 'Tenant A']);
        $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
    }

    public function test_login_returns_token_and_user(): void
    {
        // Create tenant and user
        $tenant = Tenant::create(['id' => (string)\Ramsey\Uuid\Uuid::uuid4(), 'name' => 'T1']);
        $user = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $tenant->id,
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->postJson('/api/v1/login', [
            'email' => 'bob@example.com',
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['message', 'user', 'token']);
    }
}