<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class RoleTenantBootstrapper extends Seeder
{
    public function run(): void
    {
        // Deprecated: global roles are not used in Teams mode (strict isolation)
        // Kept for backward compatibility; no-op now.
    }
}