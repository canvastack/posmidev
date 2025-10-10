<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductSearchTerm;
use Src\Pms\Infrastructure\Models\User;
use Carbon\Carbon;

/**
 * Product Search Terms Seeder
 * 
 * Seeds realistic search query tracking data for analytics.
 * Creates 30-90 days of search history with popular terms.
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All search terms are tenant-scoped (tenant_id)
 * - Realistic distribution of popular vs rare searches
 * - Includes both successful and zero-result searches
 */
class ProductSearchTermsSeeder extends Seeder
{
    private array $commonSearchTerms = [
        // Indonesian common terms
        'kopi', 'susu', 'teh', 'roti', 'mie', 'nasi', 'air mineral',
        'gula', 'tepung', 'telur', 'ayam', 'ikan', 'daging', 'sayur',
        'buah', 'snack', 'minuman', 'bumbu', 'sambal', 'kecap',
        'sabun', 'shampoo', 'pasta gigi', 'tissue', 'detergen',
        'obat', 'vitamin', 'masker', 'hand sanitizer',
    ];

    private array $rareSearchTerms = [
        'produk premium', 'organic', 'import', 'halal', 'murah',
        'diskon', 'promo', 'terbaru', 'terlaris', 'best seller',
    ];

    public function run(): void
    {
        // Get all tenants (excluding HQ)
        $hqTenantId = config('tenancy.hq_tenant_id');
        $tenants = Tenant::where('id', '!=', $hqTenantId)->get();

        $this->command->info("🔍 Starting Search Terms Seeding for {$tenants->count()} tenants...");

        foreach ($tenants as $tenant) {
            $this->command->info("🔎 Seeding searches for tenant: {$tenant->name} ({$tenant->id})");
            
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

                // Build tenant-specific search terms from product names
                $productBasedTerms = $products->pluck('name')
                    ->map(fn($name) => strtolower(explode(' ', $name)[0]))
                    ->unique()
                    ->take(15)
                    ->toArray();

                $allSearchTerms = array_merge($this->commonSearchTerms, $productBasedTerms);
                $searchesCreated = 0;
                $daysToGenerate = random_int(30, 90);

                // Generate searches over past N days
                for ($dayOffset = $daysToGenerate; $dayOffset >= 0; $dayOffset--) {
                    $date = Carbon::now()->subDays($dayOffset);
                    
                    // More searches on recent days
                    $searchesPerDay = (int) (random_int(5, 25) * (1 + (($daysToGenerate - $dayOffset) / $daysToGenerate)));
                    
                    for ($i = 0; $i < $searchesPerDay; $i++) {
                        // 70% common terms, 20% product-based, 10% rare/zero-result
                        $rand = random_int(1, 100);
                        if ($rand <= 70) {
                            $searchTerm = $this->commonSearchTerms[array_rand($this->commonSearchTerms)];
                        } elseif ($rand <= 90) {
                            $searchTerm = $productBasedTerms[array_rand($productBasedTerms)];
                        } else {
                            $searchTerm = $this->rareSearchTerms[array_rand($this->rareSearchTerms)];
                        }
                        
                        // Simulate results count (0-20)
                        // 90% have results, 10% zero-result
                        $resultsCount = random_int(1, 100) <= 90 
                            ? random_int(1, 20) 
                            : 0;
                        
                        // 50% authenticated, 50% anonymous
                        $isAuthenticated = random_int(1, 100) <= 50;
                        $user = $isAuthenticated && $users->isNotEmpty() ? $users->random() : null;
                        
                        ProductSearchTerm::create([
                            'tenant_id' => $tenant->id,
                            'search_term' => $searchTerm,
                            'user_id' => $user?->id,
                            'results_count' => $resultsCount,
                            'ip_address' => $this->generateRandomIp(),
                            'searched_at' => $date->copy()->addSeconds(random_int(0, 86400)),
                        ]);
                        
                        $searchesCreated++;
                    }
                }

                $this->command->info("  ✅ Created {$searchesCreated} search queries over {$daysToGenerate} days");
            });

            $this->command->info("✨ Completed search terms seeding for {$tenant->name}\n");
        }

        $this->command->info("🎉 Search Terms Seeding completed successfully!");
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
}