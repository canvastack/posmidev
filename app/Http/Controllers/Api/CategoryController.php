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
        
        return response()->json(
            CategoryResource::collection($categories)
        );
    }

    public function store(CategoryRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        $category = $this->categoryService->createCategory(
            tenantId: $tenantId,
            name: $request->name,
            description: $request->description
        );

        return response()->json(new CategoryResource($category), 201);
    }

    public function show(Request $request, string $tenantId, string $categoryId): JsonResponse
    {
        $category = $this->categoryService->getCategory($categoryId);
        
        if (!$category || $category->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        $this->authorize('view', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        return response()->json(new CategoryResource($category));
    }

    public function update(CategoryRequest $request, string $tenantId, string $categoryId): JsonResponse
    {
        $category = $this->categoryService->getCategory($categoryId);
        
        if (!$category || $category->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        $updatedCategory = $this->categoryService->updateCategory(
            categoryId: $categoryId,
            name: $request->name,
            description: $request->description
        );

        return response()->json(new CategoryResource($updatedCategory));
    }

    public function destroy(Request $request, string $tenantId, string $categoryId): JsonResponse
    {
        $category = $this->categoryService->getCategory($categoryId);
        
        if (!$category || $category->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Category not found'], 404);
        }

        $this->authorize('delete', [\Src\Pms\Infrastructure\Models\Category::class, $tenantId]);

        $this->categoryService->deleteCategory($categoryId);

        return response()->json(null, 204);
    }
}