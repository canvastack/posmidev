<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleTenantBootstrapper extends Seeder
{
    public function run(): void
    {
        // Ensure global roles exist
        foreach (['Super Admin', 'admin', 'manager', 'cashier'] as $name) {
            Role::firstOrCreate(['name' => $name, 'guard_name' => 'api', 'tenant_id' => null]);
        }
    }
}