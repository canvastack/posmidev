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
        $orders = $this->orderService->getOrdersByTenant($tenantId);

        // Convert to paginated structure for consistency
        return response()->json([
            'data' => collect($orders)->map(fn($o) => new OrderResource($o))->toArray(),
            'current_page' => 1,
            'last_page' => 1,
            'per_page' => count($orders),
            'total' => count($orders),
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