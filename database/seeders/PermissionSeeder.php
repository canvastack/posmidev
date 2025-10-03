<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use App\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $guard = 'api';

        // Create permissions (idempotent, guard-aware)
        $permissions = [
            // Product permissions
            'products.view',
            'products.create',
            'products.update',
            'products.delete',
            
            // Inventory permissions
            'inventory.adjust',
            
            // Order permissions
            'orders.view',
            'orders.create',
            'orders.update',
            'orders.delete',
            
            // Category permissions
            'categories.view',
            'categories.create',
            'categories.update',
            'categories.delete',
            
            // Customer permissions
            'customers.view',
            'customers.create',
            'customers.update',
            'customers.delete',
            
            // Content pages permissions
            'content.view',
            'content.create',
            'content.update',
            'content.delete',
            
            // User management permissions
            'users.view',
            'users.create',
            'users.update',
            'users.delete',

            // Tenant management permissions
            'tenants.view',
            'tenants.create',
            'tenants.update',
            'tenants.delete',
            'tenants.set-status',
            'tenants.manage-auto-activation',
            
            // Role management permissions
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            
            // Report permissions
            'reports.view',
            'reports.export',
            
            // Settings permissions
            'settings.view',
            'settings.update',

            // EAV permissions
            'blueprints.view',
            'blueprints.create',
            'blueprints.update',
            'customers.attributes.view',
            'customers.attributes.update',

            // Testing/Diagnostics
            'testing.access',
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, $guard);
        }

        // Create roles and assign permissions (guard-aware)
        // Assign permissions to 'admin' per tenant with HQ-specific exclusion for tenants.view
        $allPerms = Permission::where('guard_name', $guard)->pluck('name')->all();
        $allButTenantsView = array_values(array_diff($allPerms, ['tenants.view']));
        $hqTenantId = (string) config('tenancy.hq_tenant_id');

        // Create roles for each tenant context (no global roles)
        // Get all tenants to create roles for each
        $tenants = \Src\Pms\Infrastructure\Models\Tenant::all();

        foreach ($tenants as $tenant) {
            // Set tenant context for Spatie
            app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId((string) $tenant->id);

            // Create roles within tenant context
            $adminRole = Role::findOrCreate('admin', $guard);
            $managerRole = Role::findOrCreate('manager', $guard);
            $cashierRole = Role::findOrCreate('cashier', $guard);

            // Apply permissions based on tenant type
            if ((string) $tenant->id === $hqTenantId) {
                $adminRole->syncPermissions($allButTenantsView);
            } else {
                $adminRole->syncPermissions($allPerms);
            }

            $managerRole->givePermissionTo([
                'products.view', 'products.create', 'products.update',
                'inventory.adjust',
                'orders.view', 'orders.create',
                'customers.view', 'customers.create', 'customers.update',
                'categories.view', 'categories.create', 'categories.update',
                'content.view', 'content.create', 'content.update', // manage content pages
                'reports.view',
                'users.view', 'users.update', // manage users under tenant
            ]);

            $cashierRole->givePermissionTo([
                'products.view',
                'orders.view', 'orders.create',
                'customers.view', 'customers.create',
            ]);
        }

        // Clear tenant context after processing
        app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId(null);
    }
}