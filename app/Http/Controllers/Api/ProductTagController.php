<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Src\Pms\Infrastructure\Models\ProductTag;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class ProductTagController extends Controller
{
    /**
     * Display a listing of tags
     * 
     * GET /api/v1/tenants/{tenantId}/tags
     * Permission: products.view
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!Gate::allows('viewAny', [ProductTag::class, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to view tags.',
            ], 403);
        }

        $query = ProductTag::where('tenant_id', $tenantId);

        // Search
        if ($request->has('search')) {
            $query->where('name', 'ILIKE', "%{$request->search}%");
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'name');
        $sortOrder = $request->get('sort_order', 'asc');
        $query->orderBy($sortBy, $sortOrder);

        // With usage count
        $query->withCount('products');

        // Pagination
        $perPage = $request->get('per_page', 50);
        $tags = $query->paginate($perPage);

        return response()->json($tags);
    }

    /**
     * Get popular tags (most used)
     * 
     * GET /api/v1/tenants/{tenantId}/tags/popular
     * Permission: products.view
     */
    public function popular(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!Gate::allows('viewAny', [ProductTag::class, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $limit = $request->get('limit', 10);

        $tags = ProductTag::where('tenant_id', $tenantId)
            ->withCount('products')
            ->orderBy('products_count', 'desc')
            ->limit($limit)
            ->get();

        return response()->json($tags);
    }

    /**
     * Store a newly created tag
     * 
     * POST /api/v1/tenants/{tenantId}/tags
     * Permission: products.update
     */
    public function store(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!Gate::allows('create', [ProductTag::class, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to create tags.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'color' => 'nullable|string|max:20',
        ]);

        // Check for duplicate name within tenant
        $exists = ProductTag::where('tenant_id', $tenantId)
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'A tag with this name already exists.',
                'errors' => [
                    'name' => ['Tag name must be unique.'],
                ],
            ], 422);
        }

        $tag = ProductTag::create([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $tenantId,
            ...$validated,
        ]);

        return response()->json($tag, 201);
    }

    /**
     * Display the specified tag
     * 
     * GET /api/v1/tenants/{tenantId}/tags/{tagId}
     * Permission: products.view
     */
    public function show(string $tenantId, string $tagId): JsonResponse
    {
        $tag = ProductTag::where('tenant_id', $tenantId)
            ->where('id', $tagId)
            ->withCount('products')
            ->firstOrFail();

        // Check permission
        if (!Gate::allows('view', [$tag, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        return response()->json($tag);
    }

    /**
     * Update the specified tag
     * 
     * PATCH /api/v1/tenants/{tenantId}/tags/{tagId}
     * Permission: products.update
     */
    public function update(Request $request, string $tenantId, string $tagId): JsonResponse
    {
        $tag = ProductTag::where('tenant_id', $tenantId)
            ->where('id', $tagId)
            ->firstOrFail();

        // Check permission
        if (!Gate::allows('update', [$tag, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to update this tag.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'color' => 'nullable|string|max:20',
        ]);

        // Check for duplicate name (excluding current tag)
        if (isset($validated['name'])) {
            $exists = ProductTag::where('tenant_id', $tenantId)
                ->where('name', $validated['name'])
                ->where('id', '!=', $tagId)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'A tag with this name already exists.',
                    'errors' => [
                        'name' => ['Tag name must be unique.'],
                    ],
                ], 422);
            }
        }

        $tag->update($validated);

        return response()->json($tag);
    }

    /**
     * Remove the specified tag
     * 
     * DELETE /api/v1/tenants/{tenantId}/tags/{tagId}
     * Permission: products.update
     */
    public function destroy(string $tenantId, string $tagId): JsonResponse
    {
        $tag = ProductTag::where('tenant_id', $tenantId)
            ->where('id', $tagId)
            ->firstOrFail();

        // Check permission
        if (!Gate::allows('delete', [$tag, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized. You do not have permission to delete this tag.',
            ], 403);
        }

        // Get products count before deletion
        $productsCount = $tag->products()->count();

        // Delete tag (pivot entries will be cascade deleted)
        $tag->delete();

        return response()->json([
            'message' => 'Tag deleted successfully.',
            'affected_products' => $productsCount,
        ]);
    }

    /**
     * Bulk attach tags to products
     * 
     * POST /api/v1/tenants/{tenantId}/tags/bulk-attach
     * Body: { "product_ids": [...], "tag_ids": [...] }
     * Permission: products.update
     */
    public function bulkAttach(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!Gate::allows('create', [ProductTag::class, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'product_ids' => 'required|array',
            'product_ids.*' => 'required|string|uuid',
            'tag_ids' => 'required|array',
            'tag_ids.*' => 'required|string|uuid',
        ]);

        $attached = 0;

        foreach ($validated['product_ids'] as $productId) {
            $product = \Src\Pms\Infrastructure\Models\Product::where('tenant_id', $tenantId)
                ->where('id', $productId)
                ->first();

            if ($product) {
                foreach ($validated['tag_ids'] as $tagId) {
                    // Check if tag exists for tenant
                    $tagExists = ProductTag::where('tenant_id', $tenantId)
                        ->where('id', $tagId)
                        ->exists();

                    if ($tagExists) {
                        // Attach tag if not already attached
                        if (!$product->tags()->where('tag_id', $tagId)->exists()) {
                            \Illuminate\Support\Facades\DB::table('product_tag_pivot')->insert([
                                'product_id' => $productId,
                                'tag_id' => $tagId,
                                'tenant_id' => $tenantId,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                            $attached++;
                        }
                    }
                }
            }
        }

        return response()->json([
            'message' => 'Tags attached successfully.',
            'attached_count' => $attached,
        ]);
    }

    /**
     * Bulk detach tags from products
     * 
     * POST /api/v1/tenants/{tenantId}/tags/bulk-detach
     * Body: { "product_ids": [...], "tag_ids": [...] }
     * Permission: products.update
     */
    public function bulkDetach(Request $request, string $tenantId): JsonResponse
    {
        // Check permission
        if (!Gate::allows('delete', [ProductTag::class, $tenantId])) {
            return response()->json([
                'message' => 'Unauthorized.',
            ], 403);
        }

        $validated = $request->validate([
            'product_ids' => 'required|array',
            'product_ids.*' => 'required|string|uuid',
            'tag_ids' => 'required|array',
            'tag_ids.*' => 'required|string|uuid',
        ]);

        $detached = \Illuminate\Support\Facades\DB::table('product_tag_pivot')
            ->where('tenant_id', $tenantId)
            ->whereIn('product_id', $validated['product_ids'])
            ->whereIn('tag_id', $validated['tag_ids'])
            ->delete();

        return response()->json([
            'message' => 'Tags detached successfully.',
            'detached_count' => $detached,
        ]);
    }
}