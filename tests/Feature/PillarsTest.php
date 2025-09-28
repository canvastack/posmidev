<?php

namespace Tests\Feature;

use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Src\Pms\Infrastructure\Models\User;
use Tests\TestCase;
use Tests\Traits\TenantTestTrait;

class PillarsTest extends TestCase
{
    use RefreshDatabase, TenantTestTrait;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpTenantWithAdminUser();
    }

    private function createTenantUserWithTestingAccess(): void
    {
        // Give testing permission to the existing user
        $this->user->givePermissionTo('testing.access');
    }

    public function test_pillar1_authentication_returns_user_id(): void
    {
        $res = $this->getJson('/api/v1/test/auth', $this->authenticatedRequest()['headers']);
        $res->assertOk()->assertJson(['userId' => $this->user->id]);
    }

    public function test_pillar2_tenant_context_returns_tenant_name(): void
    {
        $res = $this->getJson("/api/v1/tenants/{$this->tenant->id}/test/context", $this->authenticatedRequest()['headers']);
        $res->assertOk()->assertJson(['tenantName' => $this->tenant->name]);
    }

    public function test_pillar3_authorization_forbidden_without_permission(): void
    {
        // Create user without testing.access permission
        $userWithoutPermission = User::create([
            'id' => (string)\Ramsey\Uuid\Uuid::uuid4(),
            'tenant_id' => $this->tenant->id,
            'name' => 'User Without Permission',
            'email' => 'noaccess@test.com',
            'password' => bcrypt('password'),
        ]);

        $token = $userWithoutPermission->createToken('test-token')->plainTextToken;
        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];

        $res = $this->getJson("/api/v1/tenants/{$this->tenant->id}/test/policy", $headers);
        $res->assertForbidden();
    }

    public function test_pillar3_authorization_ok_with_permission(): void
    {
        $this->createTenantUserWithTestingAccess();

        $res = $this->getJson("/api/v1/tenants/{$this->tenant->id}/test/policy", $this->authenticatedRequest()['headers']);
        $res->assertOk()->assertJson(['ok' => true]);
    }
}