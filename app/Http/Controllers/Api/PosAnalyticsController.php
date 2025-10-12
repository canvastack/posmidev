<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\Recipe;
use Src\Pms\Core\Services\MaterialCostTrackingService;

/**
 * POS Analytics Controller
 * 
 * Provides real-time POS analytics for cashiers and managers:
 * - Overview metrics (revenue, transactions, averages)
 * - Sales trends (daily/weekly/monthly charts)
 * - Best selling products
 * - Cashier performance metrics
 * 
 * All endpoints require authentication and are tenant-scoped.
 * Designed for Phase 4A: Advanced Analytics Dashboard.
 * 
 * @package App\Http\Controllers\Api
 */
class PosAnalyticsController extends Controller
{
    protected MaterialCostTrackingService $costTrackingService;

    public function __construct(MaterialCostTrackingService $costTrackingService)
    {
        $this->costTrackingService = $costTrackingService;
    }
    /**
     * Get POS overview metrics for a specific date
     * 
     * POST /api/v1/tenants/{tenantId}/analytics/pos/overview
     * 
     * Returns:
     * - Total revenue
     * - Total transactions
     * - Average ticket size
     * - Top cashier
     * - Best selling product
     * 
     * Phase 4A+: Now supports historical comparison with previous periods
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function posOverview(Request $request, string $tenantId): JsonResponse
    {
        // Permission check (products.view implies can view analytics)
        $this->authorize('view', [Product::class, $tenantId]);
        
        // Validate request (Phase 4A+: added comparison_period)
        $validated = $request->validate([
            'date' => 'nullable|date',
            'comparison_period' => 'nullable|in:previous_day,previous_week,previous_month,previous_year',
        ]);
        
        // If date is not provided, use last 30 days instead of just today
        // This ensures analytics shows data even if no date filter is selected
        if (isset($validated['date'])) {
            // Specific date requested - show only that day
            $startOfDay = Carbon::parse($validated['date'])->startOfDay();
            $endOfDay = Carbon::parse($validated['date'])->endOfDay();
        } else {
            // No date parameter - show last 30 days by default
            $startOfDay = Carbon::now()->subDays(30)->startOfDay();
            $endOfDay = Carbon::now()->endOfDay();
        }
        
        // Get current period metrics
        $current = $this->getMetrics($tenantId, $startOfDay, $endOfDay);
        
        // Phase 4A+: Calculate comparison metrics if comparison_period is provided
        $comparison = null;
        $variance = null;
        
        if (isset($validated['comparison_period'])) {
            $comparisonDates = $this->calculateComparisonDates(
                $startOfDay,
                $endOfDay,
                $validated['comparison_period']
            );
            
            $comparison = $this->getMetrics(
                $tenantId,
                $comparisonDates['start'],
                $comparisonDates['end']
            );
            
            $variance = $this->calculateVariance($current, $comparison);
        }
        
        return response()->json([
            'data' => [
                'current' => $current,
                'comparison' => $comparison,
                'variance' => $variance,
            ],
        ]);
    }
    
    /**
     * Get metrics for a specific date range
     * Helper method for posOverview (Phase 4A+)
     * 
     * @param string $tenantId
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @return array
     */
    private function getMetrics(string $tenantId, $startDate, $endDate): array
    {
        // Query orders for the specified date range
        $orders = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->select(
                DB::raw('COUNT(*) as total_transactions'),
                DB::raw('SUM(total_amount) as total_revenue'),
                DB::raw('AVG(total_amount) as average_ticket'),
                'user_id'
            )
            ->groupBy('user_id')
            ->get();
        
        $totalTransactions = $orders->sum('total_transactions');
        $totalRevenue = $orders->sum('total_revenue');
        $averageTicket = $totalTransactions > 0 ? $totalRevenue / $totalTransactions : 0;
        
        // Find top cashier
        $topCashierData = $orders->sortByDesc('total_revenue')->first();
        $topCashier = null;
        
        if ($topCashierData) {
            $cashierUser = DB::table('users')
                ->where('id', $topCashierData->user_id)
                ->first(['id', 'name']);
            
            if ($cashierUser) {
                $topCashier = [
                    'id' => $cashierUser->id,
                    'name' => $cashierUser->name,
                    'transactions' => (int) $topCashierData->total_transactions,
                    'revenue' => (float) $topCashierData->total_revenue,
                ];
            }
        }
        
        // Find best selling product
        $bestProductData = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('orders.status', 'paid')
            ->whereBetween('orders.created_at', [$startDate, $endDate])
            ->select(
                'order_items.product_id',
                DB::raw('SUM(order_items.quantity) as units_sold'),
                DB::raw('SUM(order_items.quantity * order_items.price) as revenue')
            )
            ->groupBy('order_items.product_id')
            ->orderByDesc('revenue')
            ->first();
        
        $bestProduct = null;
        
        if ($bestProductData) {
            $product = DB::table('products')
                ->where('id', $bestProductData->product_id)
                ->first(['id', 'name', 'sku']);
            
            if ($product) {
                $bestProduct = [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'units_sold' => (int) $bestProductData->units_sold,
                    'revenue' => (float) $bestProductData->revenue,
                ];
            }
        }
        
        return [
            'total_revenue' => (float) $totalRevenue,
            'total_transactions' => (int) $totalTransactions,
            'average_ticket' => (float) $averageTicket,
            'top_cashier' => $topCashier,
            'best_product' => $bestProduct,
        ];
    }
    
    /**
     * Calculate comparison date range based on period type
     * Phase 4A+: Historical Comparison
     * 
     * @param Carbon $startDate
     * @param Carbon $endDate
     * @param string $period
     * @return array
     */
    private function calculateComparisonDates($startDate, $endDate, string $period): array
    {
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        $duration = $end->diffInDays($start);
        
        return match($period) {
            'previous_day' => [
                'start' => $start->copy()->subDay(),
                'end' => $end->copy()->subDay(),
            ],
            'previous_week' => [
                'start' => $start->copy()->subWeek(),
                'end' => $end->copy()->subWeek(),
            ],
            'previous_month' => [
                'start' => $start->copy()->subMonth(),
                'end' => $end->copy()->subMonth(),
            ],
            'previous_year' => [
                'start' => $start->copy()->subYear(),
                'end' => $end->copy()->subYear(),
            ],
            default => [
                'start' => $start,
                'end' => $end,
            ],
        };
    }
    
    /**
     * Calculate variance between current and comparison metrics
     * Phase 4A+: Historical Comparison
     * 
     * @param array $current
     * @param array $comparison
     * @return array|null
     */
    private function calculateVariance(array $current, array $comparison): ?array
    {
        if (!$comparison) {
            return null;
        }
        
        return [
            'revenue_change' => $this->percentChange(
                $comparison['total_revenue'], 
                $current['total_revenue']
            ),
            'transactions_change' => $this->percentChange(
                $comparison['total_transactions'], 
                $current['total_transactions']
            ),
            'average_ticket_change' => $this->percentChange(
                $comparison['average_ticket'], 
                $current['average_ticket']
            ),
        ];
    }
    
    /**
     * Calculate percentage change between two values
     * Phase 4A+: Historical Comparison
     * 
     * @param float $old
     * @param float $new
     * @return float
     */
    private function percentChange($old, $new): float
    {
        if ($old == 0) {
            return $new > 0 ? 100.0 : 0.0;
        }
        
        return (($new - $old) / $old) * 100;
    }
    
    /**
     * Get POS sales trends over time
     * 
     * POST /api/v1/tenants/{tenantId}/analytics/pos/trends
     * 
     * Supports daily, weekly, or monthly aggregation.
     * Returns data points for charting.
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function posTrends(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'period' => 'nullable|in:day,week,month',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);
        
        $period = $validated['period'] ?? 'week';
        
        // Set default date ranges based on period
        if ($period === 'day') {
            $startDate = $validated['start_date'] ?? Carbon::now()->subDays(7)->toDateString();
            $endDate = $validated['end_date'] ?? Carbon::today()->toDateString();
        } elseif ($period === 'week') {
            $startDate = $validated['start_date'] ?? Carbon::now()->subWeeks(4)->toDateString();
            $endDate = $validated['end_date'] ?? Carbon::today()->toDateString();
        } else { // month
            $startDate = $validated['start_date'] ?? Carbon::now()->subMonths(6)->toDateString();
            $endDate = $validated['end_date'] ?? Carbon::today()->toDateString();
        }
        
        $startOfPeriod = Carbon::parse($startDate)->startOfDay();
        $endOfPeriod = Carbon::parse($endDate)->endOfDay();
        
        // Build query with proper date grouping (PostgreSQL compatible)
        // PostgreSQL uses TO_CHAR instead of DATE_FORMAT, with different format strings
        $dateFormat = match($period) {
            'day' => 'YYYY-MM-DD',
            'week' => 'IYYY-IW',  // ISO year and ISO week number
            'month' => 'YYYY-MM',
            default => 'YYYY-MM-DD',
        };
        
        $trends = DB::table('orders')
            ->where('tenant_id', $tenantId)
            ->where('status', 'paid')
            ->whereBetween('created_at', [$startOfPeriod, $endOfPeriod])
            ->select(
                DB::raw("TO_CHAR(created_at, '{$dateFormat}') as date"),
                DB::raw('COUNT(*) as transactions'),
                DB::raw('SUM(total_amount) as revenue'),
                DB::raw('AVG(total_amount) as average_ticket')
            )
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
                    'revenue' => (float) $item->revenue,
                    'transactions' => (int) $item->transactions,
                    'average_ticket' => (float) $item->average_ticket,
                ];
            });
        
        return response()->json([
            'data' => $trends,
        ]);
    }
    
    /**
     * Get best selling products
     * 
     * POST /api/v1/tenants/{tenantId}/analytics/pos/best-sellers
     * 
     * Returns top performing products sorted by revenue or quantity.
     * Includes profit margin for recipe-based products.
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function bestSellers(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'limit' => 'nullable|integer|min:1|max:100',
            'sort_by' => 'nullable|in:revenue,quantity',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);
        
        $limit = $validated['limit'] ?? 10;
        $sortBy = $validated['sort_by'] ?? 'revenue';
        $startDate = $validated['start_date'] ?? Carbon::now()->subDays(30)->toDateString();
        $endDate = $validated['end_date'] ?? Carbon::today()->toDateString();
        
        $startOfPeriod = Carbon::parse($startDate)->startOfDay();
        $endOfPeriod = Carbon::parse($endDate)->endOfDay();
        
        // Query best sellers
        $bestSellers = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('orders.status', 'paid')
            ->whereBetween('orders.created_at', [$startOfPeriod, $endOfPeriod])
            ->select(
                'products.id as product_id',
                'products.name as product_name',
                'products.sku',
                'categories.name as category',
                DB::raw('SUM(order_items.quantity) as units_sold'),
                DB::raw('SUM(order_items.quantity * order_items.price) as revenue')
            )
            ->groupBy('products.id', 'products.name', 'products.sku', 'categories.name')
            ->orderByDesc($sortBy === 'quantity' ? 'units_sold' : 'revenue')
            ->limit($limit)
            ->get()
            ->map(function ($item, $index) {
                // TODO: Calculate profit margin from recipes (Phase 4A Day 5-6)
                return [
                    'rank' => $index + 1,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'sku' => $item->sku,
                    'category' => $item->category ?? 'Uncategorized',
                    'units_sold' => (int) $item->units_sold,
                    'revenue' => (float) $item->revenue,
                    'profit_margin' => null, // Will be implemented in Phase 4A Day 5-6 (Material Cost Tracking)
                ];
            });
        
        return response()->json([
            'data' => $bestSellers,
        ]);
    }
    
    /**
     * Get cashier performance metrics
     * 
     * POST /api/v1/tenants/{tenantId}/analytics/pos/cashier-performance
     * 
     * Returns performance metrics for all cashiers including:
     * - Transactions handled
     * - Revenue generated
     * - Average transaction time
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function cashierPerformance(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);
        
        $startDate = $validated['start_date'] ?? Carbon::now()->subDays(30)->toDateString();
        $endDate = $validated['end_date'] ?? Carbon::today()->toDateString();
        
        $startOfPeriod = Carbon::parse($startDate)->startOfDay();
        $endOfPeriod = Carbon::parse($endDate)->endOfDay();
        
        // Query cashier performance
        $performance = DB::table('orders')
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('orders.status', 'paid')
            ->whereBetween('orders.created_at', [$startOfPeriod, $endOfPeriod])
            ->select(
                'users.id as cashier_id',
                'users.name as cashier_name',
                DB::raw('COUNT(*) as transactions_handled'),
                DB::raw('SUM(orders.total_amount) as revenue_generated'),
                DB::raw('AVG(orders.total_amount) as average_ticket')
            )
            ->groupBy('users.id', 'users.name')
            ->orderByDesc('revenue_generated')
            ->get()
            ->map(function ($item) {
                return [
                    'cashier_id' => $item->cashier_id,
                    'cashier_name' => $item->cashier_name,
                    'transactions_handled' => (int) $item->transactions_handled,
                    'revenue_generated' => (float) $item->revenue_generated,
                    'average_transaction_time' => null, // TODO: Implement when we track transaction durations
                    'average_ticket' => (float) $item->average_ticket,
                ];
            });
        
        return response()->json([
            'data' => $performance,
        ]);
    }
    
    /**
     * Analyze material costs for products (cart cost analysis)
     * 
     * POST /api/v1/tenants/{tenantId}/analytics/pos/material-costs
     * 
     * Calculates profit margins and material costs for recipe-based products.
     * Used in POS cart to show real-time profitability.
     * 
     * @param Request $request
     * @param string $tenantId
     * @return JsonResponse
     */
    public function materialCosts(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);
        
        $validated = $request->validate([
            'products' => 'required|array',
            'products.*.product_id' => 'required|uuid',
            'products.*.quantity' => 'required|integer|min:1',
            'products.*.selling_price' => 'nullable|numeric|min:0',
        ]);
        
        $products = $validated['products'];
        $costAnalysis = [];
        $totalCost = 0;
        $totalRevenue = 0;
        
        foreach ($products as $item) {
            $product = Product::forTenant($tenantId)
                ->findOrFail($item['product_id']);
            
            // Get active recipe
            $recipe = Recipe::forTenant($tenantId)
                ->forProduct($item['product_id'])
                ->active()
                ->with(['recipeMaterials.material'])
                ->first();
            
            $analysis = [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'sku' => $product->sku,
                'quantity' => $item['quantity'],
                'selling_price' => $item['selling_price'] ?? $product->price,
                'has_recipe' => !is_null($recipe),
            ];
            
            if ($recipe) {
                // Calculate material cost per unit
                $materialCostPerUnit = $recipe->calculateTotalCost();
                $totalMaterialCost = $materialCostPerUnit * $item['quantity'];
                $totalSellingPrice = ($item['selling_price'] ?? $product->price) * $item['quantity'];
                
                $profitAmount = $totalSellingPrice - $totalMaterialCost;
                $profitMargin = $totalSellingPrice > 0 
                    ? ($profitAmount / $totalSellingPrice) * 100 
                    : 0;
                
                // Build material breakdown
                $materialBreakdown = $recipe->recipeMaterials->map(function ($component) {
                    $componentCost = $component->effective_quantity * $component->material->unit_cost;
                    
                    return [
                        'material_id' => $component->material->id,
                        'material_name' => $component->material->name,
                        'quantity_required' => round($component->quantity_required, 3),
                        'waste_percentage' => round($component->waste_percentage, 2),
                        'effective_quantity' => round($component->effective_quantity, 3),
                        'unit' => $component->material->unit,
                        'unit_cost' => round($component->material->unit_cost, 2),
                        'component_cost' => round($componentCost, 2),
                    ];
                })->toArray();
                
                $analysis['material_cost_per_unit'] = round($materialCostPerUnit, 2);
                $analysis['total_material_cost'] = round($totalMaterialCost, 2);
                $analysis['total_selling_price'] = round($totalSellingPrice, 2);
                $analysis['profit_amount'] = round($profitAmount, 2);
                $analysis['profit_margin'] = round($profitMargin, 2);
                $analysis['material_breakdown'] = $materialBreakdown;
                
                // Determine alert level
                $analysis['alert'] = null;
                if ($profitMargin < 20) {
                    $analysis['alert'] = [
                        'type' => 'error',
                        'message' => 'Critical: Profit margin below 20%',
                    ];
                } elseif ($profitMargin < 30) {
                    $analysis['alert'] = [
                        'type' => 'warning',
                        'message' => 'Warning: Low profit margin (below 30%)',
                    ];
                }
                
                $totalCost += $totalMaterialCost;
                $totalRevenue += $totalSellingPrice;
            } else {
                // No recipe - use product cost if available
                $costPerUnit = $product->cost ?? 0;
                $totalProductCost = $costPerUnit * $item['quantity'];
                $totalSellingPrice = ($item['selling_price'] ?? $product->price) * $item['quantity'];
                
                $profitAmount = $totalSellingPrice - $totalProductCost;
                $profitMargin = $totalSellingPrice > 0 
                    ? ($profitAmount / $totalSellingPrice) * 100 
                    : 0;
                
                $analysis['material_cost_per_unit'] = round($costPerUnit, 2);
                $analysis['total_material_cost'] = round($totalProductCost, 2);
                $analysis['total_selling_price'] = round($totalSellingPrice, 2);
                $analysis['profit_amount'] = round($profitAmount, 2);
                $analysis['profit_margin'] = round($profitMargin, 2);
                $analysis['material_breakdown'] = [];
                $analysis['alert'] = null;
                
                $totalCost += $totalProductCost;
                $totalRevenue += $totalSellingPrice;
            }
            
            $costAnalysis[] = $analysis;
        }
        
        // Calculate overall transaction metrics
        $overallProfitMargin = $totalRevenue > 0 
            ? (($totalRevenue - $totalCost) / $totalRevenue) * 100 
            : 0;
        
        return response()->json([
            'data' => [
                'products' => $costAnalysis,
                'summary' => [
                    'total_cost' => round($totalCost, 2),
                    'total_revenue' => round($totalRevenue, 2),
                    'total_profit' => round($totalRevenue - $totalCost, 2),
                    'overall_profit_margin' => round($overallProfitMargin, 2),
                ],
            ],
        ]);
    }
}