<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StockAdjustmentRequest;
use App\Http\Resources\StockAdjustmentResource;
use Illuminate\Http\JsonResponse;
use Src\Pms\Core\Application\Services\StockAdjustmentService;

class StockAdjustmentController extends Controller
{
    public function __construct(
        private StockAdjustmentService $stockAdjustmentService
    ) {}

    public function store(StockAdjustmentRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\StockAdjustment::class, $tenantId]);

        try {
            $stockAdjustment = $this->stockAdjustmentService->createStockAdjustment(
                productId: $request->product_id,
                quantity: $request->quantity,
                reason: $request->reason,
                notes: $request->notes,
                userId: $request->user()->id
            );

            return response()->json(new StockAdjustmentResource($stockAdjustment), 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}