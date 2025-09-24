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

        // Ensure roles exist (idempotent)
        $roles = [
            'Super Admin',
            'admin',
            'manager',
            'cashier',
        ];

        foreach ($roles as $roleName) {
            Role::findOrCreate($roleName, $guard);
        }

        // Ensure Super Admin has all permissions
        $superAdminRole = Role::findByName('Super Admin', $guard);
        $allPermissions = Permission::where('guard_name', $guard)->get();
        if ($allPermissions->isNotEmpty()) {
            $superAdminRole->syncPermissions($allPermissions);
        }

        // Assign all requested roles to the user (idempotent)
        $user->assignRole(['Super Admin', 'admin', 'manager', 'cashier']);
    }
}