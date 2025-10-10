<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Material;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Infrastructure\Models\RecipeMaterial;
use Src\Pms\Infrastructure\Models\Supplier;
use Src\Pms\Infrastructure\Models\ProductTag;
use Src\Pms\Infrastructure\Models\StockAlert;
use Src\Pms\Infrastructure\Models\Category;
use Src\Pms\Infrastructure\Models\ContentPage;

/**
 * BOM Comprehensive Data Seeder
 * 
 * Creates realistic dummy data for:
 * 1. Suppliers (10-20 per tenant)
 * 2. Product Tags (15-25 per tenant)
 * 3. Materials (BOM) (20-30 per tenant)
 * 4. Recipes (BOM) (10-15 per tenant)
 * 5. Stock Alerts (auto-generated based on low stock)
 * 6. Content Pages (5-10 per tenant)
 * 
 * All data is tenant-scoped and complies with immutable rules.
 */
class BOMComprehensiveSeeder extends Seeder
{
    // Material categories with realistic items (valid units: kg, g, L, ml, pcs, box, bottle, can, bag)
    private array $materialCategories = [
        'Raw Materials' => [
            'units' => ['kg', 'g', 'L', 'ml'],
            'items' => ['Sugar', 'Salt', 'Flour', 'Rice', 'Wheat', 'Corn', 'Oil', 'Butter', 'Milk', 'Cream'],
        ],
        'Packaging' => [
            'units' => ['pcs', 'box', 'bag'],
            'items' => ['Box Small', 'Box Medium', 'Box Large', 'Paper Bag', 'Plastic Bag', 'Bubble Wrap', 'Tape', 'Label', 'Sticker', 'Ribbon'],
        ],
        'Ingredients' => [
            'units' => ['kg', 'g', 'L', 'ml', 'pcs'],
            'items' => ['Chocolate', 'Vanilla Extract', 'Baking Powder', 'Yeast', 'Cocoa Powder', 'Coffee Beans', 'Tea Leaves', 'Cinnamon', 'Nutmeg', 'Cardamom'],
        ],
        'Chemicals' => [
            'units' => ['L', 'ml', 'kg', 'g', 'bottle', 'can'],
            'items' => ['Preservative A', 'Preservative B', 'Food Coloring Red', 'Food Coloring Blue', 'Food Coloring Yellow', 'Flavoring Agent', 'Emulsifier', 'Stabilizer', 'Antioxidant', 'Acidulant'],
        ],
        'Components' => [
            'units' => ['pcs', 'box', 'bag'],
            'items' => ['Cap', 'Lid', 'Pump', 'Spray Nozzle', 'Handle', 'Strap', 'Button', 'Zipper', 'Buckle', 'Hook'],
        ],
    ];

    // Supplier types with realistic names
    private array $supplierTypes = [
        'Food' => ['Fresh Market', 'Organic Farm', 'Bulk Foods', 'Premium Grocers', 'Wholesale Foods'],
        'Packaging' => ['PackCo', 'BoxMaster', 'WrapIt', 'Packaging Solutions', 'EcoPack'],
        'Chemicals' => ['ChemSupply', 'Industrial Chemicals', 'SafeChem', 'PureChem', 'QualityChem'],
        'General' => ['Universal Supplies', 'Total Solutions', 'Mega Supplier', 'Prime Vendors', 'Supply Hub'],
    ];

    // Product tag categories with colors
    private array $tagCategories = [
        'Promo' => ['sale', 'discount', 'promo', 'clearance', 'special-offer', 'limited-time', 'flash-sale', 'bundle'],
        'Quality' => ['premium', 'best-seller', 'top-rated', 'featured', 'exclusive', 'limited-edition', 'handmade', 'artisan'],
        'Category' => ['new-arrival', 'seasonal', 'trending', 'popular', 'recommended', 'staff-pick', 'bestseller'],
        'Attributes' => ['organic', 'eco-friendly', 'sustainable', 'vegan', 'gluten-free', 'sugar-free', 'halal', 'kosher'],
    ];

    private array $colors = ['blue', 'green', 'red', 'yellow', 'purple', 'pink', 'indigo', 'teal', 'orange', 'gray'];

    public function run(): void
    {
        // Get all tenants (excluding HQ tenant)
        $hqTenantId = config('tenancy.hq_tenant_id');
        $tenants = Tenant::where('id', '!=', $hqTenantId)->get();

        $this->command->info("🚀 Starting BOM Comprehensive Data Seeding for {$tenants->count()} tenants...");

        foreach ($tenants as $tenant) {
            $this->command->info("📦 Seeding data for tenant: {$tenant->name} ({$tenant->id})");
            
            DB::transaction(function () use ($tenant) {
                // 1. Seed Suppliers (10-20 per tenant)
                $suppliers = $this->seedSuppliers($tenant);
                $this->command->info("  ✅ Created {$suppliers->count()} suppliers");

                // 2. Seed Product Tags (15-25 per tenant)
                $tags = $this->seedProductTags($tenant);
                $this->command->info("  ✅ Created {$tags->count()} product tags");

                // 3. Seed Materials (20-30 per tenant)
                $materials = $this->seedMaterials($tenant);
                $this->command->info("  ✅ Created {$materials->count()} materials");

                // 4. Seed Recipes for existing products (10-15 per tenant)
                $recipes = $this->seedRecipes($tenant, $materials);
                $this->command->info("  ✅ Created {$recipes->count()} recipes");

                // 5. Seed Stock Alerts (5-10 per tenant for low stock products)
                $alerts = $this->seedStockAlerts($tenant);
                $this->command->info("  ✅ Created {$alerts->count()} stock alerts");

                // 6. Seed Content Pages (5-10 per tenant)
                $pages = $this->seedContentPages($tenant);
                $this->command->info("  ✅ Created {$pages->count()} content pages");

                // 7. Attach tags to products (3-5 tags per product)
                $this->attachTagsToProducts($tenant, $tags);
                $this->command->info("  ✅ Attached tags to products");
            });

            $this->command->info("✨ Completed seeding for {$tenant->name}\n");
        }

        $this->command->info("🎉 BOM Comprehensive Data Seeding completed successfully!");
    }

    /**
     * Seed Suppliers (10-20 per tenant)
     */
    private function seedSuppliers(Tenant $tenant)
    {
        $suppliers = collect();
        $count = random_int(10, 20);

        foreach (range(1, $count) as $index) {
            $type = array_rand($this->supplierTypes);
            $namePool = $this->supplierTypes[$type];
            $name = $namePool[array_rand($namePool)] . ' ' . chr(65 + ($index % 26));

            $supplier = Supplier::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'name' => $name,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'contact_person' => fake()->name(),
                    'email' => Str::slug($name) . '@supplier.example.com',
                    'phone' => fake()->phoneNumber(),
                    'address' => fake()->address(),
                    'status' => fake()->randomElement(['active', 'active', 'active', 'inactive']), // 75% active
                    'notes' => fake()->optional(0.3)->sentence(),
                ]
            );

            $suppliers->push($supplier);
        }

        return $suppliers;
    }

    /**
     * Seed Product Tags (15-25 per tenant)
     */
    private function seedProductTags(Tenant $tenant)
    {
        $tags = collect();
        $count = random_int(15, 25);
        $allTags = [];

        // Collect all tags from categories
        foreach ($this->tagCategories as $category => $tagList) {
            foreach ($tagList as $tag) {
                $allTags[] = ['name' => $tag, 'category' => $category];
            }
        }

        // Shuffle and take required count
        shuffle($allTags);
        $selectedTags = array_slice($allTags, 0, $count);

        foreach ($selectedTags as $tagData) {
            $tag = ProductTag::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'name' => $tagData['name'],
                ],
                [
                    'id' => (string) Str::uuid(),
                    'color' => $this->colors[array_rand($this->colors)],
                ]
            );

            $tags->push($tag);
        }

        return $tags;
    }

    /**
     * Seed Materials (20-30 per tenant)
     */
    private function seedMaterials(Tenant $tenant)
    {
        $materials = collect();
        $count = random_int(20, 30);
        $createdItems = [];

        foreach (range(1, $count) as $index) {
            $category = array_rand($this->materialCategories);
            $categoryData = $this->materialCategories[$category];
            
            // Get unique item name
            $itemName = $categoryData['items'][array_rand($categoryData['items'])];
            $uniqueName = $itemName;
            $counter = 1;
            while (in_array($uniqueName, $createdItems)) {
                $uniqueName = $itemName . ' ' . chr(64 + $counter);
                $counter++;
            }
            $createdItems[] = $uniqueName;

            $unit = $categoryData['units'][array_rand($categoryData['units'])];
            
            // Generate realistic stock and costs
            $reorderLevel = match($unit) {
                'kg' => random_int(5, 50),
                'g' => random_int(100, 1000),
                'L' => random_int(5, 30),
                'ml' => random_int(100, 500),
                'pcs' => random_int(20, 100),
                'box' => random_int(10, 50),
                'bottle' => random_int(10, 40),
                'can' => random_int(15, 50),
                'bag' => random_int(10, 50),
                default => random_int(10, 100),
            };

            $stockQuantity = random_int((int)($reorderLevel * 0.5), (int)($reorderLevel * 3));
            
            $unitCost = match($unit) {
                'kg' => fake()->randomFloat(2, 5, 50),
                'g' => fake()->randomFloat(4, 0.05, 0.5),
                'L' => fake()->randomFloat(2, 3, 30),
                'ml' => fake()->randomFloat(4, 0.03, 0.3),
                'pcs' => fake()->randomFloat(2, 0.5, 10),
                'box' => fake()->randomFloat(2, 1, 20),
                'bottle' => fake()->randomFloat(2, 2, 25),
                'can' => fake()->randomFloat(2, 1, 15),
                'bag' => fake()->randomFloat(2, 1, 20),
                default => fake()->randomFloat(2, 1, 20),
            };

            $material = Material::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'name' => $uniqueName,
                ],
                [
                    'id' => (string) Str::uuid(),
                    'sku' => 'MAT-' . strtoupper(Str::random(6)),
                    'category' => $category,
                    'unit' => $unit,
                    'stock_quantity' => $stockQuantity,
                    'reorder_level' => $reorderLevel,
                    'unit_cost' => $unitCost,
                    'description' => fake()->optional(0.5)->sentence(),
                    'supplier' => fake()->optional(0.6)->company(),
                ]
            );

            $materials->push($material);
        }

        return $materials;
    }

    /**
     * Seed Recipes for existing products (10-15 per tenant)
     */
    private function seedRecipes(Tenant $tenant, $materials)
    {
        $recipes = collect();
        
        // Get random products from tenant (10-15 products)
        $products = Product::where('tenant_id', $tenant->id)
            ->inRandomOrder()
            ->limit(random_int(10, 15))
            ->get();

        if ($products->isEmpty()) {
            return $recipes;
        }

        foreach ($products as $product) {
            // Create 1-2 recipes per product (one active, one inactive as backup)
            $recipeCount = random_int(1, 2);
            
            for ($i = 0; $i < $recipeCount; $i++) {
                $yieldQuantity = random_int(1, 10);
                $isActive = ($i === 0); // First recipe is active

                $recipe = Recipe::create([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenant->id,
                    'product_id' => $product->id,
                    'name' => $product->name . ($i > 0 ? ' (Alt Recipe ' . ($i + 1) . ')' : ''),
                    'yield_quantity' => $yieldQuantity,
                    'yield_unit' => $product->unit ?? 'pcs',
                    'is_active' => $isActive,
                    'notes' => fake()->optional(0.3)->sentence(),
                    'description' => fake()->optional(0.5)->paragraph(),
                ]);

                // Add 3-7 materials to each recipe
                $recipeMaterialsCount = random_int(3, 7);
                $selectedMaterials = $materials->random(min($recipeMaterialsCount, $materials->count()));

                foreach ($selectedMaterials as $material) {
                    $quantityRequired = match($material->unit) {
                        'kg' => fake()->randomFloat(3, 0.1, 5),
                        'g' => fake()->randomFloat(3, 10, 500),
                        'L' => fake()->randomFloat(3, 0.1, 3),
                        'ml' => fake()->randomFloat(3, 10, 300),
                        'pcs' => random_int(1, 10),
                        'box' => random_int(1, 3),
                        'bag' => random_int(1, 5),
                        'bottle' => random_int(1, 4),
                        'can' => random_int(1, 6),
                        default => fake()->randomFloat(3, 1, 10),
                    };

                    RecipeMaterial::create([
                        'id' => (string) Str::uuid(),
                        'tenant_id' => $tenant->id,
                        'recipe_id' => $recipe->id,
                        'material_id' => $material->id,
                        'quantity_required' => $quantityRequired,
                        'waste_percentage' => fake()->randomFloat(2, 0, 10), // 0-10% waste
                        'notes' => fake()->optional(0.2)->sentence(),
                    ]);
                }

                $recipes->push($recipe);
            }
        }

        return $recipes;
    }

    /**
     * Seed Stock Alerts (5-10 per tenant for low stock products)
     */
    private function seedStockAlerts(Tenant $tenant)
    {
        $alerts = collect();
        
        // Get low stock products
        $lowStockProducts = Product::where('tenant_id', $tenant->id)
            ->whereColumn('stock', '<', 'reorder_point')
            ->orWhere('stock', '<=', 0)
            ->limit(random_int(5, 10))
            ->get();

        foreach ($lowStockProducts as $product) {
            $severity = match(true) {
                $product->stock <= 0 => 'out_of_stock',
                $product->stock <= ($product->reorder_point * 0.5) => 'critical',
                default => 'low',
            };

            $status = fake()->randomElement(['pending', 'pending', 'acknowledged', 'resolved']);

            $alert = StockAlert::create([
                'id' => (string) Str::uuid(),
                'tenant_id' => $tenant->id,
                'product_id' => $product->id,
                'current_stock' => $product->stock,
                'reorder_point' => $product->reorder_point,
                'severity' => $severity,
                'status' => $status,
                'notified' => fake()->boolean(70), // 70% notified
                'notified_at' => fake()->boolean(70) ? fake()->dateTimeBetween('-7 days', 'now') : null,
                'notes' => fake()->optional(0.3)->sentence(),
            ]);

            $alerts->push($alert);
        }

        return $alerts;
    }

    /**
     * Seed Content Pages (5-10 per tenant)
     */
    private function seedContentPages(Tenant $tenant)
    {
        $pages = collect();
        
        $pageTemplates = [
            ['title' => 'About Us', 'slug' => 'about-us', 'content' => 'Learn more about our company, mission, and values.'],
            ['title' => 'Contact', 'slug' => 'contact', 'content' => 'Get in touch with us through various channels.'],
            ['title' => 'Privacy Policy', 'slug' => 'privacy-policy', 'content' => 'Our commitment to protecting your privacy and data.'],
            ['title' => 'Terms of Service', 'slug' => 'terms-of-service', 'content' => 'Terms and conditions for using our services.'],
            ['title' => 'FAQ', 'slug' => 'faq', 'content' => 'Frequently asked questions and answers.'],
            ['title' => 'Shipping Policy', 'slug' => 'shipping-policy', 'content' => 'Information about our shipping and delivery.'],
            ['title' => 'Return Policy', 'slug' => 'return-policy', 'content' => 'Guidelines for returns and refunds.'],
            ['title' => 'Our Story', 'slug' => 'our-story', 'content' => 'The journey of our company from the beginning.'],
            ['title' => 'Careers', 'slug' => 'careers', 'content' => 'Join our team and grow with us.'],
            ['title' => 'Blog', 'slug' => 'blog', 'content' => 'Latest news, updates, and articles.'],
        ];

        // Shuffle and take 5-10 pages
        shuffle($pageTemplates);
        $count = random_int(5, 10);
        $selectedPages = array_slice($pageTemplates, 0, $count);

        foreach ($selectedPages as $template) {
            $page = ContentPage::firstOrCreate(
                [
                    'tenant_id' => $tenant->id,
                    'slug' => $template['slug'],
                ],
                [
                    'id' => (string) Str::uuid(),
                    'title' => $template['title'],
                    'content' => [
                        'body' => fake()->paragraphs(random_int(3, 8), true),
                        'excerpt' => fake()->sentence(),
                    ],
                    'status' => fake()->randomElement(['published', 'published', 'published', 'draft']), // 75% published
                    'published_at' => fake()->dateTimeBetween('-6 months', 'now'),
                ]
            );

            $pages->push($page);
        }

        return $pages;
    }

    /**
     * Attach Tags to Products (3-5 tags per product randomly)
     */
    private function attachTagsToProducts(Tenant $tenant, $tags)
    {
        if ($tags->isEmpty()) {
            return;
        }

        $products = Product::where('tenant_id', $tenant->id)
            ->inRandomOrder()
            ->limit(50) // Limit to 50 products for performance
            ->get();

        foreach ($products as $product) {
            $tagCount = random_int(3, 5);
            $selectedTags = $tags->random(min($tagCount, $tags->count()));

            foreach ($selectedTags as $tag) {
                DB::table('product_tag_pivot')->insertOrIgnore([
                    'tenant_id' => $tenant->id,
                    'product_id' => $product->id,
                    'tag_id' => $tag->id,
                ]);
            }
        }
    }
}