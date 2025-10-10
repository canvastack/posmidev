<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BOM\RecipeComponentCreateRequest;
use App\Http\Requests\BOM\RecipeComponentUpdateRequest;
use Src\Pms\Core\Services\RecipeService;
use Src\Pms\Infrastructure\Models\Recipe;
use Illuminate\Http\JsonResponse;

class RecipeComponentController extends Controller
{
    public function __construct(
        private RecipeService $recipeService
    ) {}

    /**
     * Add a component (material) to a recipe.
     * 
     * @param RecipeComponentCreateRequest $request
     * @param string $tenantId
     * @param string $recipeId
     * @return JsonResponse
     */
    public function store(RecipeComponentCreateRequest $request, string $tenantId, string $recipeId): JsonResponse
    {
        $component = $this->recipeService->addComponent($recipeId, $tenantId, $request->validated());
        
        return response()->json([
            'success' => true,
            'message' => 'Component added to recipe successfully',
            'data' => $component,
        ], 201);
    }

    /**
     * Update a recipe component.
     * 
     * @param RecipeComponentUpdateRequest $request
     * @param string $tenantId
     * @param string $recipeId
     * @param string $componentId
     * @return JsonResponse
     */
    public function update(RecipeComponentUpdateRequest $request, string $tenantId, string $recipeId, string $componentId): JsonResponse
    {
        $component = $this->recipeService->updateComponent($componentId, $tenantId, $request->validated());
        
        return response()->json([
            'success' => true,
            'message' => 'Component updated successfully',
            'data' => $component,
        ]);
    }

    /**
     * Remove a component from a recipe.
     * 
     * @param string $tenantId
     * @param string $recipeId
     * @param string $componentId
     * @return JsonResponse
     */
    public function destroy(string $tenantId, string $recipeId, string $componentId): JsonResponse
    {
        $this->authorize('delete', Recipe::class);
        
        $this->recipeService->removeComponent($componentId, $tenantId);
        
        return response()->json([
            'success' => true,
            'message' => 'Component removed successfully',
        ]);
    }
}