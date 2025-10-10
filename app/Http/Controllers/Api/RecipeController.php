<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BOM\RecipeCreateRequest;
use App\Http\Requests\BOM\RecipeUpdateRequest;
use App\Http\Requests\BOM\RecipeActivateRequest;
use Src\Pms\Core\Services\RecipeService;
use Src\Pms\Infrastructure\Models\Recipe;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecipeController extends Controller
{
    public function __construct(
        private RecipeService $recipeService
    ) {}

    /**
     * Display a listing of recipes for the tenant.
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', Recipe::class);
        
        $filters = $request->only(['product_id', 'is_active', 'search']);
        $perPage = $request->input('per_page', 20);
        
        $result = $this->recipeService->getAllForTenant($tenantId, $filters, $perPage);
        
        return response()->json([
            'success' => true,
            'data' => $result['data'],
            'meta' => $result['meta'],
        ]);
    }

    /**
     * Store a newly created recipe in storage.
     * 
     * @param RecipeCreateRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function store(RecipeCreateRequest $request, string $tenantId): JsonResponse
    {
        $recipe = $this->recipeService->create($tenantId, $request->validated());
        
        return response()->json([
            'success' => true,
            'message' => 'Recipe created successfully',
            'data' => $recipe,
        ], 201);
    }

    /**
     * Display the specified recipe.
     * 
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function show(string $tenantId, string $id): JsonResponse
    {
        $this->authorize('view', Recipe::class);
        
        $recipe = $this->recipeService->getById($id, $tenantId);
        
        return response()->json([
            'success' => true,
            'data' => $recipe,
        ]);
    }

    /**
     * Update the specified recipe in storage.
     * 
     * @param RecipeUpdateRequest $request
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function update(RecipeUpdateRequest $request, string $tenantId, string $id): JsonResponse
    {
        $recipe = $this->recipeService->update($id, $tenantId, $request->validated());
        
        return response()->json([
            'success' => true,
            'message' => 'Recipe updated successfully',
            'data' => $recipe,
        ]);
    }

    /**
     * Remove the specified recipe from storage.
     * 
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function destroy(string $tenantId, string $id): JsonResponse
    {
        $this->authorize('delete', Recipe::class);
        
        $this->recipeService->delete($id, $tenantId);
        
        return response()->json([
            'success' => true,
            'message' => 'Recipe deleted successfully',
        ]);
    }

    /**
     * Activate a recipe for its product.
     * 
     * @param RecipeActivateRequest $request
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function activate(RecipeActivateRequest $request, string $tenantId, string $id): JsonResponse
    {
        $recipe = $this->recipeService->activate($id, $tenantId);
        
        return response()->json([
            'success' => true,
            'message' => 'Recipe activated successfully',
            'data' => $recipe,
        ]);
    }

    /**
     * Get recipe cost breakdown.
     * 
     * @param Request $request
     * @param string $tenantId
     * @param string $id
     * @return JsonResponse
     */
    public function costBreakdown(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('view', Recipe::class);
        
        $breakdown = $this->recipeService->getCostBreakdown($id, $tenantId);
        
        return response()->json([
            'success' => true,
            'data' => $breakdown,
        ]);
    }
}