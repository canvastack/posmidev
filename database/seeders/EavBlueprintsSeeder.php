<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EavBlueprintsSeeder extends Seeder
{
    /**
     * Seed a minimal Customer blueprint for demo.
     */
    public function run(): void
    {
        // Seed default customer blueprint for ALL tenants (idempotent)
        $tenants = DB::table('tenants')->select('id')->get();
        if ($tenants->isEmpty()) {
            return;
        }

        foreach ($tenants as $tenant) {
            // Find or create the default blueprint for this tenant
            $existing = DB::table('eav_blueprints')
                ->where('tenant_id', $tenant->id)
                ->where('target_entity', 'customer')
                ->where('name', 'Customer Default Blueprint')
                ->first();

            if ($existing) {
                $blueprintId = $existing->id;
            } else {
                $blueprintId = (string) Str::uuid();
                DB::table('eav_blueprints')->insert([
                    'id' => $blueprintId,
                    'tenant_id' => $tenant->id,
                    'target_entity' => 'customer',
                    'name' => 'Customer Default Blueprint',
                    'status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Ensure default fields exist
            $defaults = [
                ['key' => 'phone', 'label' => 'Phone', 'type' => 'string',  'sort_order' => 1],
                ['key' => 'birthday', 'label' => 'Birthday', 'type' => 'date',   'sort_order' => 2],
                ['key' => 'vip', 'label' => 'VIP', 'type' => 'boolean', 'sort_order' => 3],
            ];

            $existingKeys = DB::table('eav_fields')
                ->where('tenant_id', $tenant->id)
                ->where('blueprint_id', $blueprintId)
                ->pluck('key')
                ->all();

            foreach ($defaults as $i => $f) {
                if (in_array($f['key'], $existingKeys, true)) {
                    continue; // skip if exists
                }
                DB::table('eav_fields')->insert([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'blueprint_id' => $blueprintId,
                    'key' => $f['key'],
                    'label' => $f['label'],
                    'type' => $f['type'],
                    'required' => false,
                    'options' => null,
                    'sort_order' => $f['sort_order'] ?? ($i + 1),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}