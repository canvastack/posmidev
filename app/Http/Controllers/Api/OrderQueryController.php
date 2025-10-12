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

    public function getTodayStats(string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [\Src\Pms\Infrastructure\Models\Order::class, $tenantId]);

        // Get today's orders for this tenant
        $todayOrders = \Src\Pms\Infrastructure\Models\Order::query()
            ->where('tenant_id', $tenantId)
            ->whereDate('created_at', today())
            ->get();

        // Calculate total items sold from order_items
        $itemsSold = \Src\Pms\Infrastructure\Models\OrderItem::query()
            ->whereIn('order_id', $todayOrders->pluck('id'))
            ->sum('quantity');

        $stats = [
            'total_sales' => $todayOrders->sum('total_amount'),
            'transaction_count' => $todayOrders->count(),
            'average_transaction' => $todayOrders->avg('total_amount') ?? 0,
            'items_sold' => (int) $itemsSold,
            'last_updated' => now()->toIso8601String(),
        ];

        return response()->json($stats);
    }
}