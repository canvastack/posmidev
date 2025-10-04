<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\OrderItem;

class ProductStatsController extends Controller
{
    /**
     * Get product statistics for a tenant
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function index(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('viewAny', [Product::class, $tenantId]);

        // Get current month date range
        $currentMonthStart = now()->startOfMonth();
        $previousMonthStart = now()->subMonth()->startOfMonth();
        $previousMonthEnd = now()->subMonth()->endOfMonth();

        // 1. Total Products
        $totalProducts = Product::where('tenant_id', $tenantId)->count();
        $totalProductsLastMonth = Product::where('tenant_id', $tenantId)
            ->where('created_at', '<', $currentMonthStart)
            ->count();
        $monthlyProductsGrowth = $totalProducts - $totalProductsLastMonth;

        // 2. Total Inventory Value (price * stock)
        $totalValue = Product::where('tenant_id', $tenantId)
            ->selectRaw('SUM(price * stock) as total')
            ->value('total') ?? 0;

        // Calculate last month's value (using products that existed then)
        $totalValueLastMonth = Product::where('tenant_id', $tenantId)
            ->where('created_at', '<', $currentMonthStart)
            ->selectRaw('SUM(price * stock) as total')
            ->value('total') ?? 0;
        $monthlyValueGrowth = $totalValue - $totalValueLastMonth;

        // 3. Low Stock Items (stock < 10)
        $lowStockThreshold = 10;
        $lowStockItems = Product::where('tenant_id', $tenantId)
            ->where('stock', '<', $lowStockThreshold)
            ->where('stock', '>', 0) // Exclude out of stock
            ->count();

        // Low stock items from last month
        $lowStockItemsLastMonth = Product::where('tenant_id', $tenantId)
            ->where('stock', '<', $lowStockThreshold)
            ->where('stock', '>', 0)
            ->where('updated_at', '>=', $previousMonthStart)
            ->where('updated_at', '<=', $previousMonthEnd)
            ->count();
        $monthlyLowStockGrowth = $lowStockItems - $lowStockItemsLastMonth;

        // 4. Top Seller (most sold product this month based on OrderItems)
        $topSeller = OrderItem::select('product_id', 'product_name')
            ->selectRaw('SUM(quantity) as total_sold')
            ->selectRaw('SUM(subtotal) as total_revenue')
            ->whereHas('order', function ($query) use ($tenantId, $currentMonthStart) {
                $query->where('tenant_id', $tenantId)
                    ->where('created_at', '>=', $currentMonthStart)
                    ->where('status', 'completed'); // Only count completed orders
            })
            ->groupBy('product_id', 'product_name')
            ->orderByDesc('total_sold')
            ->first();

        // 5. Out of Stock Items
        $outOfStockItems = Product::where('tenant_id', $tenantId)
            ->where('stock', '=', 0)
            ->count();

        // 6. Total Revenue this month
        $totalRevenue = OrderItem::whereHas('order', function ($query) use ($tenantId, $currentMonthStart) {
                $query->where('tenant_id', $tenantId)
                    ->where('created_at', '>=', $currentMonthStart)
                    ->where('status', 'completed');
            })
            ->sum('subtotal') ?? 0;

        // 7. Total Products Sold this month
        $totalProductsSold = OrderItem::whereHas('order', function ($query) use ($tenantId, $currentMonthStart) {
                $query->where('tenant_id', $tenantId)
                    ->where('created_at', '>=', $currentMonthStart)
                    ->where('status', 'completed');
            })
            ->sum('quantity') ?? 0;

        return response()->json([
            'data' => [
                'total_products' => $totalProducts,
                'monthly_products_growth' => $monthlyProductsGrowth,
                'total_value' => round($totalValue, 2),
                'monthly_value_growth' => round($monthlyValueGrowth, 2),
                'low_stock_items' => $lowStockItems,
                'monthly_low_stock_growth' => $monthlyLowStockGrowth,
                'out_of_stock_items' => $outOfStockItems,
                'top_seller' => $topSeller ? [
                    'product_id' => $topSeller->product_id,
                    'name' => $topSeller->product_name,
                    'total_sold' => (int) $topSeller->total_sold,
                    'total_revenue' => round($topSeller->total_revenue, 2),
                ] : [
                    'product_id' => null,
                    'name' => 'No sales yet',
                    'total_sold' => 0,
                    'total_revenue' => 0,
                ],
                'total_revenue' => round($totalRevenue, 2),
                'total_products_sold' => (int) $totalProductsSold,
                'period' => [
                    'current_month' => $currentMonthStart->format('Y-m'),
                    'current_month_name' => $currentMonthStart->format('F Y'),
                ],
            ],
        ]);
    }
}