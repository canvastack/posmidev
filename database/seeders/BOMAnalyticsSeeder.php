<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Material;
use Carbon\Carbon;

/**
 * BOM Analytics Comprehensive Seeder
 * 
 * Creates comprehensive analytics data for BOM Dashboard:
 * 1. Material Usage Transactions (60 days of historical data)
 * 2. Stock Movements (In/Out transactions)
 * 3. Ensures materials have varied stock levels for charts
 * 
 * This seeder provides realistic data for:
 * - Stock Status Distribution Chart
 * - Usage Trends Chart (7, 14, 30, 60 days)
 * - Category Breakdown Chart
 * 
 * All data is tenant-scoped and complies with immutable rules.
 */
class BOMAnalyticsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all tenants (excluding HQ tenant)
        $hqTenantId = config('tenancy.hq_tenant_id');
        $tenants = Tenant::where('id', '!=', $hqTenantId)->get();

        $this->command->info("🚀 Starting BOM Analytics Data Seeding for {$tenants->count()} tenants...");

        foreach ($tenants as $tenant) {
            $this->command->info("📊 Seeding analytics for tenant: {$tenant->name} ({$tenant->id})");
            
            DB::transaction(function () use ($tenant) {
                // Get materials for this tenant
                $materials = Material::where('tenant_id', $tenant->id)->get();

                if ($materials->isEmpty()) {
                    $this->command->warn("  ⚠️ No materials found for tenant {$tenant->name}. Run BOMComprehensiveSeeder first!");
                    return;
                }

                // 1. Create varied stock levels for Stock Status Distribution
                $this->updateMaterialStockLevels($tenant, $materials);
                $this->command->info("  ✅ Updated material stock levels for distribution chart");

                // 2. Seed Material Usage Transactions (60 days)
                $transactionCount = $this->seedMaterialUsageTransactions($tenant, $materials, 60);
                $this->command->info("  ✅ Created {$transactionCount} usage transactions (60 days)");

                // 3. Seed Stock Movements (In/Out)
                $movementCount = $this->seedStockMovements($tenant, $materials, 60);
                $this->command->info("  ✅ Created {$movementCount} stock movements");
            });

            $this->command->info("✨ Completed analytics seeding for {$tenant->name}\n");
        }

        $this->command->info("🎉 BOM Analytics Data Seeding completed successfully!");
    }

    /**
     * Update material stock levels to create varied distribution
     * - 60% Normal Stock (above reorder level)
     * - 25% Low Stock (at or below reorder level)
     * - 10% Critical Stock (below 50% of reorder level)
     * - 5% Out of Stock (0)
     */
    private function updateMaterialStockLevels(Tenant $tenant, $materials)
    {
        foreach ($materials as $material) {
            $rand = rand(1, 100);
            
            if ($rand <= 5) {
                // 5% Out of Stock
                $stockQuantity = 0;
            } elseif ($rand <= 15) {
                // 10% Critical Stock (below 50% of reorder level)
                $stockQuantity = $material->reorder_level * rand(10, 49) / 100;
            } elseif ($rand <= 40) {
                // 25% Low Stock (50-100% of reorder level)
                $stockQuantity = $material->reorder_level * rand(50, 100) / 100;
            } else {
                // 60% Normal Stock (100-300% of reorder level)
                $stockQuantity = $material->reorder_level * rand(100, 300) / 100;
            }

            $material->update([
                'stock_quantity' => round($stockQuantity, 2),
            ]);
        }
    }

    /**
     * Seed Material Usage Transactions (for Usage Trends Chart)
     * Creates daily usage records for the past N days
     */
    private function seedMaterialUsageTransactions(Tenant $tenant, $materials, int $days = 60)
    {
        $transactionCount = 0;
        $tableName = 'material_usage_transactions';

        // Check if table exists, if not create records in inventory_transactions
        $useInventoryTransactions = !DB::getSchemaBuilder()->hasTable($tableName);
        if ($useInventoryTransactions) {
            $tableName = 'inventory_transactions';
        }

        // For each material, create 1-5 transactions per day for past N days
        foreach ($materials as $material) {
            for ($i = 0; $i < $days; $i++) {
                $date = Carbon::now()->subDays($i);
                
                // Create 1-5 transactions per day (more recent days have more activity)
                $transactionsPerDay = rand(1, max(1, 5 - floor($i / 15))); // Decreasing as we go back in time
                
                for ($t = 0; $t < $transactionsPerDay; $t++) {
                    $quantity = $this->getRandomUsageQuantity($material->unit);

                    $transactionData = [
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenant->id,
                        'material_id' => $material->id,
                        'transaction_type' => 'deduction',
                        'quantity_before' => 0, // Will be calculated by backend service normally
                        'quantity_change' => -$quantity, // Negative for usage
                        'quantity_after' => 0, // Will be calculated by backend service normally
                        'reason' => fake()->randomElement(['production', 'sale', 'waste', 'other']),
                        'reference_type' => $this->getRandomReferenceType(),
                        'reference_id' => (string) Str::uuid(),
                        'notes' => fake()->optional(0.3)->sentence(),
                        'created_at' => $date->copy()->addHours(rand(8, 20))->addMinutes(rand(0, 59)),
                    ];

                    DB::table($tableName)->insert($transactionData);
                    $transactionCount++;
                }
            }
        }

        return $transactionCount;
    }

    /**
     * Seed Stock Movements (In transactions for replenishment)
     */
    private function seedStockMovements(Tenant $tenant, $materials, int $days = 60)
    {
        $movementCount = 0;
        $tableName = 'inventory_transactions';

        foreach ($materials as $material) {
            // Create 2-5 stock-in movements over the past N days
            $movementsCount = rand(2, 5);
            
            for ($i = 0; $i < $movementsCount; $i++) {
                $date = Carbon::now()->subDays(rand(1, $days));
                $quantity = $this->getRandomReplenishmentQuantity($material->unit);

                DB::table($tableName)->insert([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'material_id' => $material->id,
                    'transaction_type' => 'restock',
                    'quantity_before' => 0, // Will be calculated by backend service normally
                    'quantity_change' => $quantity, // Positive for stock-in
                    'quantity_after' => 0, // Will be calculated by backend service normally
                    'reason' => 'purchase',
                    'reference_type' => 'purchase_order',
                    'reference_id' => (string) Str::uuid(),
                    'notes' => 'Stock replenishment - ' . fake()->company(),
                    'created_at' => $date,
                ]);

                $movementCount++;
            }
        }

        return $movementCount;
    }

    /**
     * Get random usage quantity based on unit type
     */
    private function getRandomUsageQuantity(string $unit): float
    {
        return match($unit) {
            'kg' => fake()->randomFloat(3, 0.5, 10),
            'g' => fake()->randomFloat(3, 50, 500),
            'L' => fake()->randomFloat(3, 0.2, 5),
            'ml' => fake()->randomFloat(3, 50, 300),
            'pcs' => rand(1, 20),
            'box' => rand(1, 5),
            'bottle' => rand(1, 10),
            'can' => rand(1, 15),
            'bag' => rand(1, 8),
            default => fake()->randomFloat(3, 1, 10),
        };
    }

    /**
     * Get random replenishment quantity (larger than usage)
     */
    private function getRandomReplenishmentQuantity(string $unit): float
    {
        return match($unit) {
            'kg' => fake()->randomFloat(2, 20, 100),
            'g' => rand(1000, 5000),
            'L' => fake()->randomFloat(2, 10, 50),
            'ml' => rand(1000, 3000),
            'pcs' => rand(50, 200),
            'box' => rand(10, 50),
            'bottle' => rand(20, 100),
            'can' => rand(30, 150),
            'bag' => rand(20, 80),
            default => fake()->randomFloat(2, 50, 200),
        };
    }

    /**
     * Get random reference type for transactions
     */
    private function getRandomReferenceType(): string
    {
        return fake()->randomElement([
            'production_order',
            'recipe_execution',
            'manual_adjustment',
            'quality_control',
            'waste',
            'transfer',
        ]);
    }
}