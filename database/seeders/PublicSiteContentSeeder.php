<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Infrastructure\Models\Product;

class PublicSiteContentSeeder extends Seeder
{
    public function run(): void
    {
        // Find demo tenant or fallback to first tenant
        $tenant = Tenant::where('name', 'Demo Tenant')->first() ?? Tenant::query()->first();
        if (!$tenant) {
            return; // no tenants yet
        }

        // Prepare featured products (pick first 9 by name asc for stability)
        $featured = Product::where('tenant_id', $tenant->id)
            ->orderBy('name')
            ->limit(9)
            ->pluck('id')
            ->all();

        // Merge public site settings into tenant->settings (JSON)
        $settings = (array) ($tenant->settings ?? []);

        $public = [
            'company_profile' => [
                'name' => 'POSMID Retail',
                'tagline' => 'Simple. Fast. Reliable POS for SMEs.',
                'about' => 'POSMID helps small and medium businesses manage products, sales, and customers with ease. Multi-tenant and secure by design.',
                'contacts' => [
                    'email' => 'hello@posmid.local',
                    'phone' => '+62-812-1234-5678',
                    'address' => 'Jl. Contoh No. 10, Jakarta',
                ],
                'social' => [
                    ['name' => 'Instagram', 'url' => 'https://instagram.com/posmid'],
                    ['name' => 'Twitter/X', 'url' => 'https://x.com/posmid'],
                    ['name' => 'LinkedIn', 'url' => 'https://linkedin.com/company/posmid'],
                ],
            ],
            'homepage' => [
                'hero_title' => 'Kelola Toko Anda Lebih Cepat',
                'hero_subtitle' => 'POS cloud multi-tenant untuk UMKM. Mulai dengan produk, penjualan, dan pelanggan dalam hitungan menit.',
                'cta_text' => 'Coba Sekarang',
                'cta_link' => '/register',
                'featured_product_ids' => $featured,
            ],
            'navigation' => [
                ['label' => 'Home', 'href' => '/home'],
                ['label' => 'Products', 'href' => '/products'],
                ['label' => 'Company', 'href' => '/company'],
            ],
        ];

        // Deep merge (public settings override existing keys under 'public')
        $settings['public'] = array_merge($settings['public'] ?? [], $public);

        $tenant->settings = $settings;
        $tenant->save();
    }
}