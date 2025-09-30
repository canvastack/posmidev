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
}