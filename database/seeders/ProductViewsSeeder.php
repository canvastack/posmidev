<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductView;
use Src\Pms\Infrastructure\Models\User;
use Carbon\Carbon;

/**
 * Product Views Seeder
 * 
 * Seeds realistic product view tracking data for analytics.
 * Creates 30-90 days of view history with varied patterns.
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All views are tenant-scoped (tenant_id)
 * - Views only reference products from same tenant
 * - Supports both authenticated and anonymous views
 */
class ProductViewsSeeder extends Seeder
{
    public function run(): void
    {
        // Get all tenants (excluding HQ)
        $hqTenantId = config('tenancy.hq_tenant_id');
        $tenants = Tenant::where('id', '!=', $hqTenantId)->get();

        $this->command->info("📊 Starting Product Views Seeding for {$tenants->count()} tenants...");

        foreach ($tenants as $tenant) {
            $this->command->info("👁️ Seeding views for tenant: {$tenant->name} ({$tenant->id})");
            
            DB::transaction(function () use ($tenant) {
                // Get products and users for this tenant
                $products = Product::where('tenant_id', $tenant->id)
                    ->where('status', 'published')
                    ->get();

                $users = User::where('tenant_id', $tenant->id)->get();

                if ($products->isEmpty()) {
                    $this->command->warn("  ⚠️ No products found for tenant, skipping");
                    return;
                }

                $viewsCreated = 0;
                $daysToGenerate = random_int(30, 90);

                // Generate views over past N days
                for ($dayOffset = $daysToGenerate; $dayOffset >= 0; $dayOffset--) {
                    $date = Carbon::now()->subDays($dayOffset);
                    
                    // More views on recent days, fewer on older days
                    $viewsPerDay = (int) (random_int(10, 50) * (1 + (($daysToGenerate - $dayOffset) / $daysToGenerate)));
                    
                    for ($i = 0; $i < $viewsPerDay; $i++) {
                        $product = $products->random();
                        
                        // 60% authenticated, 40% anonymous
                        $isAuthenticated = random_int(1, 100) <= 60;
                        $user = $isAuthenticated && $users->isNotEmpty() ? $users->random() : null;
                        
                        ProductView::create([
                            'tenant_id' => $tenant->id,
                            'product_id' => $product->id,
                            'user_id' => $user?->id,
                            'ip_address' => $this->generateRandomIp(),
                            'user_agent' => $this->generateRandomUserAgent(),
                            'viewed_at' => $date->copy()->addSeconds(random_int(0, 86400)),
                        ]);
                        
                        $viewsCreated++;
                    }
                }

                $this->command->info("  ✅ Created {$viewsCreated} product views over {$daysToGenerate} days");
            });

            $this->command->info("✨ Completed views seeding for {$tenant->name}\n");
        }

        $this->command->info("🎉 Product Views Seeding completed successfully!");
    }

    /**
     * Generate a random IP address
     */
    private function generateRandomIp(): string
    {
        return random_int(1, 255) . '.' . 
               random_int(0, 255) . '.' . 
               random_int(0, 255) . '.' . 
               random_int(1, 255);
    }

    /**
     * Generate a random user agent string
     */
    private function generateRandomUserAgent(): string
    {
        $userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (iPad; CPU OS 13_0 like Mac OS X) AppleWebKit/605.1.15',
            'Mozilla/5.0 (Android 11; Mobile) AppleWebKit/537.36',
        ];

        return $userAgents[array_rand($userAgents)];
    }
}