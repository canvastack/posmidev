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

        $perPage = $request->get('per_page', 15);
        $categories = $this->categoryService->getCategoriesByTenantPaginated($tenantId, $perPage);

        return response()->json([
            'data' => CategoryResource::collection($categories->items())->toArray($request),
            'current_page' => $categories->currentPage(),
            'last_page' => $categories->lastPage(),
            'per_page' => $categories->perPage(),
            'total' => $categories->total(),
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