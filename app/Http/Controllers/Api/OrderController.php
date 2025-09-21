<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OrderRequest;
use App\Http\Resources\OrderResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Application\Services\OrderService;

class OrderController extends Controller
{
    public function __construct(
        private OrderService $orderService
    ) {}

    public function store(OrderRequest $request, string $tenantId): JsonResponse
    {
        $this->authorize('create', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

        try {
            $order = $this->orderService->createOrder(
                tenantId: $tenantId,
                items: $request->items,
                paymentMethod: $request->payment_method,
                amountPaid: $request->amount_paid,
                customerId: $request->customer_id,
                userId: $request->user()->id
            );

            return response()->json(new OrderResource($order), 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}