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

    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

        $perPage = max(1, min(100, (int) $request->query('per_page', 15)));
        $page = max(1, (int) $request->query('page', 1));

        $paginator = $this->orderService->getOrdersByTenantPaginated($tenantId, $perPage);

        return response()->json([
            'data' => OrderResource::collection($paginator->items()),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function show(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('view', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

        $order = $this->orderService->getOrder($id);

        if (!$order || $order->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        return response()->json(new OrderResource($order));
    }

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

    public function update(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('update', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

        try {
            $order = $this->orderService->updateOrder($id, $request->all());

            return response()->json(new OrderResource($order));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroy(Request $request, string $tenantId, string $id): JsonResponse
    {
        $this->authorize('delete', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

        try {
            $this->orderService->deleteOrder($id);

            return response()->json(null, 204);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }
}