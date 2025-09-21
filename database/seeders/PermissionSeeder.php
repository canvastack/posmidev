<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
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
            Permission::create(['name' => $permission]);
        }

        // Create roles and assign permissions
        $adminRole = Role::create(['name' => 'admin']);
        $adminRole->givePermissionTo(Permission::all());

        $managerRole = Role::create(['name' => 'manager']);
        $managerRole->givePermissionTo([
            'products.view', 'products.create', 'products.update',
            'orders.view', 'orders.create',
            'customers.view', 'customers.create', 'customers.update',
            'categories.view', 'categories.create', 'categories.update',
            'reports.view',
        ]);

        $cashierRole = Role::create(['name' => 'cashier']);
        $cashierRole->givePermissionTo([
            'products.view',
            'orders.view', 'orders.create',
            'customers.view', 'customers.create',
        ]);
    }
}