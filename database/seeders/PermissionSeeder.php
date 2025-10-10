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

        // Define permission list (will be created per-tenant)
        $permissions = [
            // Product permissions
            'products.view',
            'products.create',
            'products.update',
            'products.delete',
            'products.restore', // Phase 11: Restore archived products
            'products.delete.permanent', // Phase 11: Permanently delete archived products
            'products.export',
            'products.import',
            
            // Inventory permissions
            'inventory.adjust',
            'products.stock.adjust',
            
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

            // BOM Engine - Material permissions
            'materials.view',
            'materials.create',
            'materials.update',
            'materials.delete',
            'materials.adjust_stock',
            'materials.export',
            'materials.import',
            
            // BOM Engine - Recipe permissions
            'recipes.view',
            'recipes.create',
            'recipes.update',
            'recipes.delete',
            'recipes.activate',
            'recipes.manage_components',
            
            // BOM Engine - Calculation permissions
            'bom.calculate',
            'bom.batch_plan',
            'bom.capacity_forecast',
            
            // BOM Engine - Analytics & Reporting permissions
            'bom.analytics.view',
            'bom.alerts.view',
            'bom.reports.view',
            'bom.reports.export',

            // Testing/Diagnostics
            'testing.access',
        ];

        $hqTenantId = (string) config('tenancy.hq_tenant_id');

        // 🔒 RULE COMPLIANCE: NO GLOBAL PERMISSIONS!
        // Create permissions and roles ONLY within tenant context
        // Get all tenants to create permissions/roles for each
        $tenants = \Src\Pms\Infrastructure\Models\Tenant::all();

        foreach ($tenants as $tenant) {
            // ✅ Set tenant context for Spatie (REQUIRED for tenant-scoped permissions)
            app(\Spatie\Permission\PermissionRegistrar::class)->setPermissionsTeamId((string) $tenant->id);

            // ✅ Create permissions within tenant context (tenant-scoped)
            foreach ($permissions as $permission) {
                Permission::findOrCreate($permission, $guard);
            }

            // ✅ Get all permissions for this tenant
            $allPerms = Permission::where('guard_name', $guard)->pluck('name')->all();
            $allButTenantsView = array_values(array_diff($allPerms, ['tenants.view']));

            // ✅ Create roles within tenant context (tenant-scoped)
            $adminRole = Role::findOrCreate('admin', $guard);
            $managerRole = Role::findOrCreate('manager', $guard);
            $cashierRole = Role::findOrCreate('cashier', $guard);

            // Apply permissions based on tenant type
            if ((string) $tenant->id === $hqTenantId) {
                // HQ admin gets all permissions (tenants.view handled via Gate::before)
                $adminRole->syncPermissions($allPerms);
            } else {
                // Non-HQ admin gets all permissions
                $adminRole->syncPermissions($allPerms);
            }

            $managerRole->givePermissionTo([
                'products.view', 'products.create', 'products.update', 'products.restore', 'products.export', 'products.import',
                'inventory.adjust', 'products.stock.adjust',
                'orders.view', 'orders.create',
                'customers.view', 'customers.create', 'customers.update',
                'categories.view', 'categories.create', 'categories.update',
                'content.view', 'content.create', 'content.update', // manage content pages
                'reports.view', 'reports.export',
                'users.view', 'users.update', // manage users under tenant
                // BOM Engine permissions for managers
                'materials.view', 'materials.create', 'materials.update', 'materials.adjust_stock', 'materials.export', 'materials.import',
                'recipes.view', 'recipes.create', 'recipes.update', 'recipes.activate', 'recipes.manage_components',
                'bom.calculate', 'bom.batch_plan', 'bom.capacity_forecast',
                'bom.analytics.view', 'bom.alerts.view', 'bom.reports.view', 'bom.reports.export',
            ]);

            $cashierRole->givePermissionTo([
                'products.view',
                'orders.view', 'orders.create',
                'customers.view', 'customers.create',
                // BOM Engine view permissions for cashiers
                'materials.view',
                'recipes.view',
                'bom.calculate',
            ]);
        }

        // ✅ IMPORTANT: Keep tenant context active for subsequent seeders
        // Do NOT set to null - let SystemTenantSeeder/DummyDataSeeder handle their own context
    }
}