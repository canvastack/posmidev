<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            SystemTenantSeeder::class, // creates Canvastack HQ + Super Admin in HQ scope
            DummyDataSeeder::class,
        ]);
    }
}