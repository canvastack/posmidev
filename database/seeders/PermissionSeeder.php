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
        ];

        foreach ($permissions as $permission) {
            Permission::findOrCreate($permission, $guard);
        }

        // Create roles and assign permissions (guard-aware)
        $adminRole = Role::findOrCreate('admin', $guard);
        $adminRole->givePermissionTo(Permission::where('guard_name', $guard)->get());

        $managerRole = Role::findOrCreate('manager', $guard);
        $managerRole->givePermissionTo([
            'products.view', 'products.create', 'products.update',
            'orders.view', 'orders.create',
            'customers.view', 'customers.create', 'customers.update',
            'categories.view', 'categories.create', 'categories.update',
            'reports.view',
            'users.view', 'users.update', // manage users under tenant
        ]);

        $cashierRole = Role::findOrCreate('cashier', $guard);
        $cashierRole->givePermissionTo([
            'products.view',
            'orders.view', 'orders.create',
            'customers.view', 'customers.create',
        ]);
    }
}