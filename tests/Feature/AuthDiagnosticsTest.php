<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Src\Pms\Infrastructure\Models\User;
use Src\Pms\Infrastructure\Models\Tenant;

class AuthDiagnosticsTest extends TestCase
{
    use RefreshDatabase;

    protected function createUserWithToken(): array
    {
        // Create tenant and user; password not required for token issuance
        $tenant = Tenant::create(['id' => (string) \Ramsey\Uuid\Uuid::uuid4(), 'name' => 'DiagTenant']);
        $user = User::create([
            'id' => (string) \Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $tenant->id,
            'name' => 'DiagUser',
            'email' => 'diag@example.com',
            'password' => 'secret123', // will be hashed via cast
        ]);

        $plainToken = $user->createToken('test')->plainTextToken;
        return [$user, $plainToken];
    }

    public function test_ping_auth_without_token_returns_unauthenticated(): void
    {
        $response = $this->getJson('/api/v1/ping-auth');
        $response->assertStatus(401);
    }

    public function test_ping_auth_with_token_returns_ok_and_user_id(): void
    {
        [, $token] = $this->createUserWithToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/ping-auth');

        $response->assertOk()
            ->assertJson([
                'ok' => true,
            ])->assertJsonStructure([
                'ok',
                'userId',
            ]);
    }

    public function test_guard_check_with_token_returns_ok_and_user_id(): void
    {
        [, $token] = $this->createUserWithToken();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->getJson('/api/v1/guard-check');

        $response->assertOk()
            ->assertJson([
                'ok' => true,
            ])->assertJsonStructure([
                'ok',
                'userId',
            ]);
    }
}