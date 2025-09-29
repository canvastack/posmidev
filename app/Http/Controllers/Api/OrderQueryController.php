<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Src\Pms\Core\Application\Services\OrderService;

class OrderQueryController extends Controller
{
    public function __construct(private OrderService $orderService) {}

    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

        $perPage = $request->get('per_page', 15);
        $paginatedOrders = $this->orderService->getOrdersByTenantPaginated($tenantId, $perPage);

        // Convert Eloquent models to domain entities for Resource
        $domainEntities = [];
        foreach ($paginatedOrders->items() as $model) {
            $domainEntities[] = $this->orderService->getOrder($model->id);
        }

        return response()->json([
            'data' => OrderResource::collection(collect($domainEntities))->toArray($request),
            'current_page' => $paginatedOrders->currentPage(),
            'last_page' => $paginatedOrders->lastPage(),
            'per_page' => $paginatedOrders->perPage(),
            'total' => $paginatedOrders->total(),
        ]);
    }

    public function show(Request $request, string $tenantId, string $orderId): JsonResponse
    {
        $this->authorize('view', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);
        $order = $this->orderService->getOrder($orderId);
        if (!$order || $order->getTenantId() !== $tenantId) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        return response()->json(new OrderResource($order));
    }
}