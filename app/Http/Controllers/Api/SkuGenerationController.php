<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Src\Pms\Core\Services\SkuGenerationService;
use Src\Pms\Infrastructure\Models\Product;
use Illuminate\Support\Facades\Gate;

class SkuGenerationController extends Controller
{
    protected SkuGenerationService $skuService;

    public function __construct(SkuGenerationService $skuService)
    {
        $this->skuService = $skuService;
    }

    /**
     * Get list of predefined SKU patterns
     * 
     * GET /api/v1/tenants/{tenantId}/sku-patterns
     * Permission: products.create or products.update
     */
    public function patterns(string $tenantId): JsonResponse
    {
        // Check permission
        if (!$this->canManageProducts($tenantId)) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to access SKU patterns.',
            ], 403);
        }

        $patterns = $this->skuService->getPredefinedPatterns();

        return response()->json([
            'patterns' => $patterns,
        ]);
    }

    /**
     * Generate a new SKU based on pattern
     * 
     * POST /api/v1/tenants/{tenantId}/generate-sku
     * Body: { "pattern": "{category}-{sequence}", "category_id": "uuid" }
     * Permission: products.create or products.update
     */
    public function generate(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!$this->canManageProducts($tenantId)) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to generate SKU.',
            ], 403);
        }

        $validated = $request->validate([
            'pattern' => 'required|string|max:100',
            'category_id' => 'nullable|string|uuid',
        ]);

        try {
            $sku = $this->skuService->generate(
                $tenantId,
                $validated['pattern'],
                $validated['category_id'] ?? null
            );

            return response()->json([
                'sku' => $sku,
                'pattern' => $validated['pattern'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate SKU.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Preview SKU without saving sequence
     * 
     * POST /api/v1/tenants/{tenantId}/preview-sku
     * Body: { "pattern": "{category}-{sequence}", "category_id": "uuid" }
     * Permission: products.create or products.update
     */
    public function preview(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!$this->canManageProducts($tenantId)) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'pattern' => 'required|string|max:100',
            'category_id' => 'nullable|string|uuid',
        ]);

        try {
            $sku = $this->skuService->preview(
                $tenantId,
                $validated['pattern'],
                $validated['category_id'] ?? null
            );

            return response()->json([
                'preview' => $sku,
                'pattern' => $validated['pattern'],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to preview SKU.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Validate if SKU is available
     * 
     * GET /api/v1/tenants/{tenantId}/validate-sku?sku=XXX-001&exclude_id=uuid
     * Permission: products.create or products.update
     */
    public function validateSku(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!$this->canManageProducts($tenantId)) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'sku' => 'required|string|max:100',
            'exclude_id' => 'nullable|string|uuid',
        ]);

        $isAvailable = $this->skuService->isSkuAvailable(
            $tenantId,
            $validated['sku'],
            $validated['exclude_id'] ?? null
        );

        return response()->json([
            'sku' => $validated['sku'],
            'available' => $isAvailable,
            'message' => $isAvailable 
                ? 'SKU is available.' 
                : 'SKU is already in use.',
        ]);
    }

    /**
     * Helper method to check product management permissions
     */
    protected function canManageProducts(string $tenantId): bool
    {
        return Gate::allows('viewAny', [Product::class, $tenantId])
            || Gate::allows('create', [Product::class, $tenantId])
            || Gate::allows('update', [Product::class, $tenantId]);
    }
}