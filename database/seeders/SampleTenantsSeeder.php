<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Tenant;

class SampleTenantsSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $samples = [
                ['id' => (string) Str::uuid(), 'name' => 'Tenant A', 'address' => 'Jl. Mawar No. 1', 'phone' => '+62-811-0000-001'],
                ['id' => (string) Str::uuid(), 'name' => 'Tenant B', 'address' => 'Jl. Melati No. 2', 'phone' => '+62-811-0000-002'],
                ['id' => (string) Str::uuid(), 'name' => 'Tenant C', 'address' => 'Jl. Kenanga No. 3', 'phone' => '+62-811-0000-003'],
            ];

            foreach ($samples as $t) {
                Tenant::firstOrCreate(
                    ['name' => $t['name']],
                    [
                        'id' => $t['id'],
                        'address' => $t['address'] ?? null,
                        'phone' => $t['phone'] ?? null,
                    ]
                );
            }
        });
    }
}