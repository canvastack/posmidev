<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Src\Pms\Core\Services\CategoryService;

class CategoryController extends Controller
{
    protected CategoryService $categoryService;

    public function __construct(CategoryService $categoryService)
    {
        $this->categoryService = $categoryService;
    }

    /**
     * Get all categories (flat list or tree format)
     * 
     * GET /api/v1/tenants/{tenantId}/categories?format=flat|tree
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('categories.view');

        $format = $request->query('format', 'flat'); // 'flat' or 'tree'

        if ($format === 'tree') {
            $categories = $this->categoryService->getTree($tenantId);
        } else {
            $categories = $this->categoryService->getFlatWithIndentation($tenantId);
        }

        return response()->json([
            'data' => $categories,
            'meta' => [
                'format' => $format,
                'total' => count($categories),
            ]
        ]);
    }

    /**
     * Create a new category
     * 
     * POST /api/v1/tenants/{tenantId}/categories
     */
    public function store(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('categories.create');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'parent_id' => 'nullable|uuid|exists:categories,id',
        ]);

        try {
            $category = $this->categoryService->create($tenantId, $validated);

            return response()->json([
                'data' => $category,
                'message' => 'Category created successfully',
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => ['parent_id' => [$e->getMessage()]],
            ], 422);
        }
    }

    /**
     * Get a single category by ID
     * 
     * GET /api/v1/tenants/{tenantId}/categories/{categoryId}
     */
    public function show(string $tenantId, string $categoryId): JsonResponse
    {
        $this->authorize('categories.view');

        $category = $this->categoryService->getById($tenantId, $categoryId);

        if (!$category) {
            return response()->json([
                'message' => 'Category not found',
            ], 404);
        }

        // Load relationships
        $category->load(['parent', 'children']);

        // Get statistics
        $statistics = $this->categoryService->getStatistics($tenantId, $categoryId);

        return response()->json([
            'data' => array_merge($category->toArray(), [
                'statistics' => $statistics,
            ]),
        ]);
    }

    /**
     * Update a category
     * 
     * PUT /api/v1/tenants/{tenantId}/categories/{categoryId}
     */
    public function update(Request $request, string $tenantId, string $categoryId): JsonResponse
    {
        $this->authorize('categories.update');

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'parent_id' => 'nullable|uuid|exists:categories,id',
        ]);

        try {
            $category = $this->categoryService->update($tenantId, $categoryId, $validated);

            return response()->json([
                'data' => $category,
                'message' => 'Category updated successfully',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Validation error',
                'errors' => ['general' => [$e->getMessage()]],
            ], 422);
        }
    }

    /**
     * Delete a category
     * 
     * DELETE /api/v1/tenants/{tenantId}/categories/{categoryId}?deleteChildren=true|false
     */
    public function destroy(Request $request, string $tenantId, string $categoryId): JsonResponse
    {
        $this->authorize('categories.delete');

        $deleteChildren = $request->query('deleteChildren', 'false') === 'true';

        try {
            $this->categoryService->delete($tenantId, $categoryId, $deleteChildren);

            return response()->json([
                'message' => 'Category deleted successfully',
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => 'Cannot delete category',
                'errors' => ['general' => [$e->getMessage()]],
            ], 422);
        }
    }

    /**
     * Get products in a category
     * 
     * GET /api/v1/tenants/{tenantId}/categories/{categoryId}/products?includeSubcategories=true|false
     */
    public function products(Request $request, string $tenantId, string $categoryId): JsonResponse
    {
        $this->authorize('categories.view');

        $includeSubcategories = $request->query('includeSubcategories', 'false') === 'true';

        try {
            $products = $this->categoryService->getProducts($tenantId, $categoryId, $includeSubcategories);

            return response()->json([
                'data' => $products,
                'meta' => [
                    'category_id' => $categoryId,
                    'include_subcategories' => $includeSubcategories,
                    'total' => count($products),
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 404);
        }
    }
}