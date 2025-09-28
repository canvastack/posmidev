<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;
use Src\Pms\Infrastructure\Models\User;

class AssignRolesToUserSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure guard is aligned with API usage
        $guard = 'api';

        // Clear cached roles/permissions
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Target user (should already exist)
        $email = 'canvastacks@gmail.com';
        $user = User::where('email', $email)->first();

        if (!$user) {
            throw new \RuntimeException("User with email {$email} not found. Please create the user first.");
        }

        // Resolve tenant context for team-scoped roles/pivots
        $tenantId = (string) $user->tenant_id;
        if (empty($tenantId)) {
            throw new \RuntimeException("User {$email} has no tenant_id; cannot set team context.");
        }
        app(PermissionRegistrar::class)->setPermissionsTeamId($tenantId);

        // Ensure roles exist for this tenant (idempotent)
        $roles = [
            'Super Admin',
            'admin',
            'manager',
            'cashier',
        ];

        foreach ($roles as $roleName) {
            Role::firstOrCreate([
                'name' => $roleName,
                'guard_name' => $guard,
                'tenant_id' => $tenantId,
            ]);
        }

        // Ensure Super Admin has all permissions in this guard
        $superAdminRole = Role::where('name', 'Super Admin')
            ->where('guard_name', $guard)
            ->where('tenant_id', $tenantId)
            ->first();

        $allPermissions = Permission::where('guard_name', $guard)->get();
        if ($superAdminRole && $allPermissions->isNotEmpty()) {
            $superAdminRole->syncPermissions($allPermissions);
        }

        // Assign all tenant-scoped roles to the user
        $roleModels = Role::where('guard_name', $guard)
            ->where('tenant_id', $tenantId)
            ->whereIn('name', $roles)
            ->get();

        $user->syncRoles($roleModels);
    }
}