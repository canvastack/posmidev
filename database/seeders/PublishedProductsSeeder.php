<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Category;
use Illuminate\Support\Str;

class PublishedProductsSeeder extends Seeder
{
    /**
     * Seed published products with images for public display
     */
    public function run(): void
    {
        // Get HQ tenant
        $hqTenantId = config('tenancy.hq_tenant_id');
        $hqTenant = Tenant::find($hqTenantId);

        if (!$hqTenant) {
            $hqTenant = Tenant::where('name', config('tenancy.hq_tenant_name', 'HQ'))->first();
        }

        if (!$hqTenant) {
            $this->command->warn('HQ tenant not found, skipping published products seeding.');
            return;
        }

        $this->command->info("Seeding published products for tenant: {$hqTenant->name} ({$hqTenant->id})");

        // Create or get default category
        $category = Category::firstOrCreate(
            [
                'tenant_id' => $hqTenant->id,
                'name' => 'General'
            ],
            [
                'id' => Str::uuid()->toString(),
                'description' => 'General products category',
            ]
        );

        // Sample products with images
        $products = [
            [
                'name' => 'Premium Coffee Blend',
                'sku' => 'COF-001',
                'description' => 'A rich and aromatic coffee blend sourced from the finest beans around the world. Perfect for starting your day with energy and flavor.',
                'price' => 24.99,
                'cost_price' => 12.00,
                'stock' => 150,
                'image_path' => 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=600&fit=crop',
                'thumbnail_path' => 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop',
            ],
            [
                'name' => 'Organic Green Tea',
                'sku' => 'TEA-001',
                'description' => 'Premium organic green tea leaves with antioxidants and natural health benefits. Smooth taste and refreshing aroma.',
                'price' => 18.50,
                'cost_price' => 8.00,
                'stock' => 200,
                'image_path' => 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=600&fit=crop',
                'thumbnail_path' => 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop',
            ],
            [
                'name' => 'Artisan Chocolate Bar',
                'sku' => 'CHO-001',
                'description' => 'Handcrafted dark chocolate with 70% cocoa content. Rich, smooth, and ethically sourced from sustainable farms.',
                'price' => 12.99,
                'cost_price' => 6.00,
                'stock' => 100,
                'image_path' => 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&h=600&fit=crop',
                'thumbnail_path' => 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=300&h=300&fit=crop',
            ],
            [
                'name' => 'Wireless Bluetooth Headphones',
                'sku' => 'ELC-001',
                'description' => 'High-quality wireless headphones with noise cancellation, 30-hour battery life, and premium sound quality.',
                'price' => 89.99,
                'cost_price' => 45.00,
                'stock' => 0, // Out of stock
                'image_path' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop',
                'thumbnail_path' => 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
            ],
            [
                'name' => 'Organic Honey Jar',
                'sku' => 'FOD-001',
                'description' => 'Pure, raw organic honey harvested from local beekeepers. Natural sweetness with health benefits.',
                'price' => 15.99,
                'cost_price' => 7.00,
                'stock' => 75,
                'image_path' => 'https://images.unsplash.com/photo-1587049352846-4a222e784099?w=600&h=600&fit=crop',
                'thumbnail_path' => 'https://images.unsplash.com/photo-1587049352846-4a222e784099?w=300&h=300&fit=crop',
            ],
            [
                'name' => 'Stainless Steel Water Bottle',
                'sku' => 'ACC-001',
                'description' => 'Eco-friendly, insulated water bottle that keeps drinks cold for 24 hours and hot for 12 hours.',
                'price' => 29.99,
                'cost_price' => 15.00,
                'stock' => 120,
                'image_path' => 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop',
                'thumbnail_path' => 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&h=300&fit=crop',
            ],
            [
                'name' => 'Leather Notebook',
                'sku' => 'STA-001',
                'description' => 'Premium leather-bound notebook with high-quality paper. Perfect for journaling, note-taking, or sketching.',
                'price' => 34.50,
                'cost_price' => 18.00,
                'stock' => 60,
                'image_path' => 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&h=600&fit=crop',
                'thumbnail_path' => 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=300&h=300&fit=crop',
            ],
            [
                'name' => 'Aromatherapy Essential Oil Set',
                'sku' => 'WEL-001',
                'description' => 'Collection of 6 pure essential oils including lavender, eucalyptus, and peppermint for relaxation and wellness.',
                'price' => 42.00,
                'cost_price' => 20.00,
                'stock' => 45,
                'image_path' => 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=600&fit=crop',
                'thumbnail_path' => 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&h=300&fit=crop',
            ],
        ];

        foreach ($products as $productData) {
            Product::updateOrCreate(
                [
                    'tenant_id' => $hqTenant->id,
                    'sku' => $productData['sku'],
                ],
                [
                    'id' => Str::uuid()->toString(),
                    'category_id' => $category->id,
                    'name' => $productData['name'],
                    'description' => $productData['description'],
                    'price' => $productData['price'],
                    'cost_price' => $productData['cost_price'],
                    'stock' => $productData['stock'],
                    'status' => 'published', // Make it public
                    'image_path' => $productData['image_path'],
                    'thumbnail_path' => $productData['thumbnail_path'],
                ]
            );
        }

        $this->command->info('✅ Published products seeded successfully with ' . count($products) . ' products.');
    }
}