<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CategoryRequest;
use App\Http\Resources\CategoryResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Application\Services\CategoryService;

class CategoryController extends Controller
{
    public function __construct(
        private CategoryService $categoryService
    ) {}

    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        $categories = $this->categoryService->getCategoriesByTenant($tenantId);

        // Convert to paginated structure for consistency
        return response()->json([
            'data' => CategoryResource::collection($categories)->toArray($request),
            'current_page' => 1,
            'last_page' => 1,
            'per_page' => count($categories),
            'total' => count($categories),
        ]);
    }

    public function store(CategoryRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        $category = $this->categoryService->createCategory(
            tenantId: $tenantId,
            name: $request->name,
            description: $request->description
        );

        return response()->json([
            'data' => new CategoryResource($category)
        ], 201);
    }

    public function show(Request $request, string $tenantId, \Src\Pms\Infrastructure\Models\Category $category): JsonResponse
    {
        // Route model binding sudah memastikan category belongs to correct tenant
        // Hanya perlu authorization check
        $this->authorize('view', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        return response()->json([
            'data' => (new CategoryResource($category))->toArray($request)
        ]);
    }

    public function update(CategoryRequest $request, string $tenantId, \Src\Pms\Infrastructure\Models\Category $category): JsonResponse
    {
        // Route model binding sudah memastikan category belongs to correct tenant
        // Hanya perlu authorization check
        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        $updatedCategory = $this->categoryService->updateCategory(
            categoryId: $category->id,
            name: $request->name,
            description: $request->description
        );

        return response()->json([
            'data' => (new CategoryResource($updatedCategory))->toArray($request)
        ]);
    }

    public function destroy(Request $request, string $tenantId, \Src\Pms\Infrastructure\Models\Category $category): JsonResponse
    {
        // Route model binding sudah memastikan category belongs to correct tenant
        // Hanya perlu authorization check
        $this->authorize('delete', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        $this->categoryService->deleteCategory($category->id);

        return response()->json(['message' => 'Category deleted successfully'], 200);
    }
}