<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class SystemTenantSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $hqTenantId = config('tenancy.hq_tenant_id');
            $hqTenantName = config('tenancy.hq_tenant_name');

            // 1) Ensure System Tenant exists with static UUID
            $tenant = Tenant::firstOrCreate(
                ['id' => (string) $hqTenantId],
                [
                    'name' => $hqTenantName,
                    'address' => 'HQ Address',
                    'phone' => '+62-0000-0000',
                ]
            );

            // 2) Ensure permissions are present (idempotent)
            $guard = 'api';
            $permissions = [
                'products.view','products.create','products.update','products.delete',
                'orders.view','orders.create','orders.update','orders.delete',
                'categories.view','categories.create','categories.update','categories.delete',
                'customers.view','customers.create','customers.update','customers.delete',
                'users.view','users.create','users.update','users.delete',
                'tenants.view','tenants.create','tenants.update','tenants.delete','tenants.set-status','tenants.manage-auto-activation',
                'roles.view','roles.create','roles.update','roles.delete',
                'reports.view','reports.export',
                'settings.view','settings.update',
            ];
            foreach ($permissions as $p) {
                Permission::findOrCreate($p, $guard);
            }

            // 3) Set team (tenant) context for Spatie operations
            app(PermissionRegistrar::class)->setPermissionsTeamId((string) $tenant->id);

            // 4) Create Super Admin role within HQ tenant and give all permissions
            $superAdminRole = Role::findOrCreate('Super Admin', $guard);
            // Super Admin should have all permissions, including tenants.view
            $superAdminRole->givePermissionTo(Permission::where('guard_name', $guard)->get());

            // 5) Ensure Super Admin user in HQ tenant
            $superAdmin = User::firstOrCreate(
                ['tenant_id' => (string) $tenant->id, 'email' => 'superadmin@canvastack.local'],
                [
                    'id' => (string) Str::uuid(),
                    'name' => 'System SuperAdmin',
                    'username' => 'system_superadmin',
                    'display_name' => 'System SuperAdmin',
                    'password' => Hash::make('@password123'),
                ]
            );
            $superAdmin->syncRoles([$superAdminRole->name]);

            // 6) Ensure a specific HQ user exists with the requested email
            $targetEmail = 'canvastacks@gmail.com';
            $existing = User::where('email', $targetEmail)->first();

            // Helper to produce unique username within the tenant
            $makeUniqueUsername = function (string $base, string $tenantId): string {
                $username = $base;
                $suffix = 1;
                while (User::where('tenant_id', $tenantId)->where('username', $username)->exists()) {
                    $suffix++;
                    $username = $base . $suffix;
                }
                return $username;
            };

            if (!$existing) {
                $baseUsername = 'canvastacks';
                $username = $makeUniqueUsername($baseUsername, (string) $tenant->id);
                User::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => (string) $tenant->id,
                    'name' => 'Canvastacks User',
                    'username' => $username,
                    'display_name' => 'HQ User',
                    'email' => $targetEmail,
                    'password' => Hash::make('@password123'),
                ]);
            } else {
                // Move the user to HQ tenant if needed and ensure username is unique within HQ
                if ((string) $existing->tenant_id !== (string) $tenant->id) {
                    $baseUsername = $existing->username ?: 'canvastacks';
                    $username = $makeUniqueUsername($baseUsername, (string) $tenant->id);
                    $existing->username = $username;
                    $existing->tenant_id = (string) $tenant->id;
                    $existing->save();
                } else {
                    // Ensure uniqueness even if already in HQ
                    if (User::where('tenant_id', (string) $tenant->id)->where('username', $existing->username)->where('id', '!=', $existing->id)->exists()) {
                        $existing->username = $makeUniqueUsername($existing->username, (string) $tenant->id);
                        $existing->save();
                    }
                }
            }

            // Ensure the HQ-target user has Super Admin role in HQ team
            $target = User::where('email', $targetEmail)->first();
            if ($target) {
                $target->syncRoles([$superAdminRole->name]);
            }
        });
    }
}