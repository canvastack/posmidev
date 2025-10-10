<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            // ✅ RULE COMPLIANCE: Create tenants FIRST, then tenant-scoped permissions
            SystemTenantSeeder::class, // creates Canvastack HQ + Super Admin in HQ scope
            DummyDataSeeder::class, // creates sample tenants with their own permissions/roles
            SampleTenantsSeeder::class, // adds 3 simple sample tenants for picker options
            PermissionSeeder::class, // ensures all tenants have complete permission sets
            EavBlueprintsSeeder::class, // seed default customer blueprint
            PublicSiteContentSeeder::class, // seed public site navigation/company/homepage
            ContentPagesSeeder::class, // seed about/company pages
            VariantTemplateSeeder::class, // seed system variant templates (WEEK 14)
            
            // ✅ BOM & Comprehensive Data Seeders (Phase 1)
            BOMComprehensiveSeeder::class, // seeds suppliers, tags, materials, recipes, alerts, content pages
            ComprehensiveOrdersSeeder::class, // ensures all tenants have 10-20 orders with various statuses
        ]);
    }
}