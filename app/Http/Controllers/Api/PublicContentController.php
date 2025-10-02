<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Src\Pms\Infrastructure\Models\Tenant;
use Src\Pms\Core\Application\Services\PublicContentService;

class PublicContentController extends Controller
{
    public function __construct(private PublicContentService $publicContentService) {}

    /**
     * GET /api/v1/tenants/{tenantId}/public/settings
     * Return the public slice of tenant settings (no auth required)
     */
    public function settings(Tenant $tenant)
    {
        $settings = $tenant->settings ?? [];
        $public = $settings['public'] ?? (object) [];

        return response()->json([
            'tenantId' => (string) $tenant->id,
            'public' => $public,
        ]);
    }

    /**
     * GET /api/v1/tenants/{tenantId}/public/products
     * List public products for the tenant (paginated), published only
     */
    public function products(Request $request, Tenant $tenant)
    {
        $products = $this->publicContentService->getPublishedProducts((string) $tenant->id, $request->query());
        return response()->json($products);
    }

    /**
     * GET /api/v1/tenants/{tenantId}/public/products/{productId}
     * Return a single published public product
     */
    public function showProduct(Tenant $tenant, string $productId)
    {
        $product = $this->publicContentService->getPublishedProduct((string) $tenant->id, $productId);
        return response()->json($product);
    }

    /**
     * GET /api/v1/tenants/{tenant}/public/footer
     * Return tenant footer content (no auth required)
     * Falls back to default if not configured
     */
    public function footer(Tenant $tenant)
    {
        $settings = $tenant->settings ?? [];
        $footer = $settings['footer'] ?? $this->getDefaultFooter();

        return response()->json([
            'tenantId' => (string) $tenant->id,
            'footer' => $footer,
        ]);
    }

    /**
     * GET /api/v1/tenants/{tenantId}/public/pages/{slug}
     * Return a single published content page by slug
     */
    public function showPage(Tenant $tenant, string $slug)
    {
        $page = $this->publicContentService->getPublishedPage((string) $tenant->id, $slug);
        return response()->json($page);
    }

    /**
     * GET /api/v1/tenants/{tenantId}/public/pages
     * List all published content pages for the tenant
     */
    public function pages(Tenant $tenant)
    {
        $pages = $this->publicContentService->getAllPublishedPages((string) $tenant->id);
        return response()->json($pages);
    }

    /**
     * Default footer structure (fallback)
     */
    private function getDefaultFooter(): array
    {
        return [
            'branding' => [
                'logo' => 'POSMID',
                'tagline' => 'The future of retail with modern point of sale solutions.',
            ],
            'sections' => [
                [
                    'title' => 'Products',
                    'links' => [
                        ['label' => 'Food & Beverages', 'url' => '/products?category=Food'],
                        ['label' => 'Coffee & Tea', 'url' => '/products?category=Coffee'],
                        ['label' => 'Fashion', 'url' => '/products?category=Fashion'],
                        ['label' => 'Electronics', 'url' => '/products?category=Electronics'],
                    ],
                ],
                [
                    'title' => 'Company',
                    'links' => [
                        ['label' => 'About Us', 'url' => '/company'],
                        ['label' => 'Contact', 'url' => '#contact'],
                        ['label' => 'Careers', 'url' => '#'],
                        ['label' => 'Blog', 'url' => '#'],
                    ],
                ],
                [
                    'title' => 'Support',
                    'links' => [
                        ['label' => 'Help Center', 'url' => '#'],
                        ['label' => 'Privacy Policy', 'url' => '#'],
                        ['label' => 'Terms of Service', 'url' => '#'],
                        ['label' => 'Admin Panel', 'url' => '/admin'],
                    ],
                ],
            ],
            'copyright' => '© 2024 POSMID. All rights reserved. Built with ❤️ using React & Tailwind CSS.',
        ];
    }
}