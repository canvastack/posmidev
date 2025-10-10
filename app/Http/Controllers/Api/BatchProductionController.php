<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BOM\BatchRequirementsRequest;
use App\Http\Requests\BOM\MultiProductPlanRequest;
use Src\Pms\Core\Services\BatchProductionService;
use Src\Pms\Infrastructure\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BatchProductionController extends Controller
{
    public function __construct(
        private BatchProductionService $batchProductionService
    ) {}

    /**
     * Calculate material requirements for a batch production.
     * 
     * @param BatchRequirementsRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function batchRequirements(BatchRequirementsRequest $request, string $tenantId): JsonResponse
    {
        if (!auth()->user()->can('bom.batch_plan')) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validated();
        
        $result = $this->batchProductionService->calculateBatchRequirements(
            $validated['product_id'],
            $tenantId,
            (int) $validated['quantity']
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Calculate optimal batch size based on available materials.
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function optimalBatchSize(Request $request, string $tenantId): JsonResponse
    {
        if (!auth()->user()->can('bom.batch_plan')) {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'product_id' => 'required|uuid',
            'min_quantity' => 'nullable|numeric|min:1',
            'max_quantity' => 'nullable|numeric|min:1',
        ]);

        $result = $this->batchProductionService->calculateOptimalBatchSize(
            $request->input('product_id'),
            $tenantId
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    /**
     * Plan production for multiple products simultaneously.
     * 
     * @param MultiProductPlanRequest $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function multiProductPlan(MultiProductPlanRequest $request, string $tenantId): JsonResponse
    {
        if (!auth()->user()->can('bom.batch_plan')) {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validated();
        
        // Transform products array to productionPlan format ['productId' => quantity]
        $productionPlan = [];
        foreach ($validated['products'] as $product) {
            $productionPlan[$product['product_id']] = (int) $product['quantity'];
        }
        
        $result = $this->batchProductionService->calculateMultiProductBatch(
            $productionPlan,
            $tenantId
        );

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }
}