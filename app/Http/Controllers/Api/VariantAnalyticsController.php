<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\VariantAnalyticsResource;
use App\Http\Resources\ProductVariantResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Src\Pms\Infrastructure\Models\Product;
use Src\Pms\Infrastructure\Models\ProductVariant;
use Src\Pms\Infrastructure\Models\VariantAnalytics;

class VariantAnalyticsController extends Controller
{
    /**
     * Get analytics for a specific variant
     */
    public function show(Request $request, string $tenantId, string $variantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $variant = ProductVariant::forTenant($tenantId)->findOrFail($variantId);

        $periodType = $request->get('period_type', 'daily');
        $limit = $request->get('limit', 30);

        $analytics = $variant->analytics()
            ->where('period_type', $periodType)
            ->orderBy('period_start', 'desc')
            ->limit($limit)
            ->get();

        return response()->json([
            'variant' => new ProductVariantResource($variant),
            'analytics' => VariantAnalyticsResource::collection($analytics),
            'summary' => [
                'total_revenue' => $analytics->sum('revenue'),
                'total_orders' => $analytics->sum('total_orders'),
                'total_quantity_sold' => $analytics->sum('quantity_sold'),
                'total_profit' => $analytics->sum('profit'),
                'avg_conversion_rate' => $analytics->avg('conversion_rate'),
                'avg_turnover_rate' => $analytics->avg('turnover_rate'),
            ],
        ]);
    }

    /**
     * Get analytics for all variants of a product
     */
    public function productAnalytics(Request $request, string $tenantId, string $productId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $product = Product::forTenant($tenantId)->findOrFail($productId);

        $periodType = $request->get('period_type', 'daily');
        $periodStart = $request->get('period_start');
        $periodEnd = $request->get('period_end');

        $query = VariantAnalytics::query()
            ->whereIn('product_variant_id', $product->variants()->pluck('id'))
            ->where('period_type', $periodType);

        if ($periodStart) {
            $query->where('period_start', '>=', $periodStart);
        }

        if ($periodEnd) {
            $query->where('period_end', '<=', $periodEnd);
        }

        $analytics = $query->with('variant')
            ->orderBy('period_start', 'desc')
            ->get();

        // Group by variant
        $byVariant = $analytics->groupBy('product_variant_id')->map(function ($variantAnalytics) {
            return [
                'variant' => new ProductVariantResource($variantAnalytics->first()->productVariant),
                'analytics' => VariantAnalyticsResource::collection($variantAnalytics),
                'summary' => [
                    'total_revenue' => (float) $variantAnalytics->sum('revenue'),
                    'total_orders' => $variantAnalytics->sum('total_orders'),
                    'total_quantity_sold' => $variantAnalytics->sum('quantity_sold'),
                    'total_profit' => (float) $variantAnalytics->sum('profit'),
                ],
            ];
        })->values();

        return response()->json([
            'product' => [
                'id' => $product->id,
                'name' => $product->name,
                'variant_count' => $product->variant_count,
            ],
            'period_type' => $periodType,
            'data' => $byVariant,
            'overall_summary' => [
                'total_revenue' => $analytics->sum('revenue'),
                'total_orders' => $analytics->sum('total_orders'),
                'total_quantity_sold' => $analytics->sum('quantity_sold'),
                'total_profit' => $analytics->sum('profit'),
                'avg_conversion_rate' => $analytics->avg('conversion_rate'),
            ],
        ]);
    }

    /**
     * Get top performing variants for a tenant
     */
    public function topPerformers(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $validated = $request->validate([
            'metric' => 'nullable|in:revenue,profit,quantity_sold,conversion_rate,turnover_rate',
            'period_type' => 'nullable|in:daily,weekly,monthly',
            'limit' => 'nullable|integer|min:1|max:100',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
        ]);

        $metric = $validated['metric'] ?? 'revenue';
        $periodType = $validated['period_type'] ?? 'monthly';
        $limit = $validated['limit'] ?? 10;

        $topPerformers = VariantAnalytics::getTopPerformers(
            $tenantId,
            $metric,
            $periodType,
            $limit,
            $validated['period_start'] ?? null,
            $validated['period_end'] ?? null
        );

        return response()->json([
            'metric' => $metric,
            'period_type' => $periodType,
            'data' => $topPerformers->map(function ($analytics) {
                return [
                    'analytics' => new VariantAnalyticsResource($analytics),
                    'variant' => new ProductVariantResource($analytics->variant),
                ];
            }),
        ]);
    }

    /**
     * Get comparison analytics for multiple variants
     */
    public function compare(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $validated = $request->validate([
            'variant_ids' => 'required|array|min:2|max:10',
            'variant_ids.*' => 'required|uuid|exists:product_variants,id',
            'period_type' => 'nullable|in:daily,weekly,monthly',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date',
        ]);

        $periodType = $validated['period_type'] ?? 'monthly';

        $query = VariantAnalytics::query()
            ->whereIn('product_variant_id', $validated['variant_ids'])
            ->where('period_type', $periodType);

        if (isset($validated['period_start'])) {
            $query->where('period_start', '>=', $validated['period_start']);
        }

        if (isset($validated['period_end'])) {
            $query->where('period_end', '<=', $validated['period_end']);
        }

        $analytics = $query->with('variant')->get();

        // Group by variant
        $comparison = $analytics->groupBy('product_variant_id')->map(function ($variantAnalytics) {
            $variant = $variantAnalytics->first()->productVariant;
            $totalRevenue = (float) $variantAnalytics->sum('revenue');
            $totalProfit = (float) $variantAnalytics->sum('profit');
            
            return [
                'variant' => new ProductVariantResource($variant),
                'summary' => [
                    'total_revenue' => $totalRevenue,
                    'total_profit' => $totalProfit,
                    'total_orders' => $variantAnalytics->sum('total_orders'),
                    'quantity_sold' => $variantAnalytics->sum('quantity_sold'),
                    'avg_conversion_rate' => round((float) $variantAnalytics->avg('conversion_rate'), 2),
                    'avg_turnover_rate' => round((float) $variantAnalytics->avg('stock_turnover_rate'), 2),
                    'avg_profit_margin' => $totalRevenue > 0 
                        ? round(($totalProfit / $totalRevenue) * 100, 2)
                        : 0,
                ],
                'analytics' => VariantAnalyticsResource::collection($variantAnalytics),
            ];
        })->values();

        return response()->json([
            'period_type' => $periodType,
            'comparison' => $comparison,
        ]);
    }

    /**
     * Get performance status summary for tenant
     */
    public function performanceSummary(Request $request, string $tenantId): JsonResponse
    {
        $this->authorize('view', [Product::class, $tenantId]);

        $periodType = $request->get('period_type', 'monthly');

        // Get latest analytics for all variants in this tenant
        // Using join instead of whereHas for better performance
        $latestAnalytics = VariantAnalytics::query()
            ->join('product_variants', 'variant_analytics.product_variant_id', '=', 'product_variants.id')
            ->where('product_variants.tenant_id', $tenantId)
            ->where('variant_analytics.period_type', $periodType)
            ->select('variant_analytics.*')
            ->whereIn('variant_analytics.id', function ($query) use ($periodType, $tenantId) {
                $query->selectRaw('MAX(va.id)')
                    ->from('variant_analytics as va')
                    ->join('product_variants as pv', 'va.product_variant_id', '=', 'pv.id')
                    ->where('pv.tenant_id', $tenantId)
                    ->where('va.period_type', $periodType)
                    ->groupBy('va.product_variant_id');
            })
            ->with('productVariant')
            ->get();

        // Group by performance status
        $byStatus = $latestAnalytics->groupBy(function ($analytics) {
            return $analytics->getPerformanceStatus();
        });

        return response()->json([
            'period_type' => $periodType,
            'total_variants' => $latestAnalytics->count(),
            'by_status' => [
                'excellent' => [
                    'count' => $byStatus->get('excellent', collect())->count(),
                    'total_revenue' => $byStatus->get('excellent', collect())->sum('revenue'),
                    'total_profit' => $byStatus->get('excellent', collect())->sum('profit'),
                ],
                'good' => [
                    'count' => $byStatus->get('good', collect())->count(),
                    'total_revenue' => $byStatus->get('good', collect())->sum('revenue'),
                    'total_profit' => $byStatus->get('good', collect())->sum('profit'),
                ],
                'average' => [
                    'count' => $byStatus->get('average', collect())->count(),
                    'total_revenue' => $byStatus->get('average', collect())->sum('revenue'),
                    'total_profit' => $byStatus->get('average', collect())->sum('profit'),
                ],
                'poor' => [
                    'count' => $byStatus->get('poor', collect())->count(),
                    'total_revenue' => (float) $byStatus->get('poor', collect())->sum('revenue'),
                    'total_profit' => (float) $byStatus->get('poor', collect())->sum('profit'),
                    'variants' => $byStatus->get('poor', collect())->map(function ($analytics) {
                        return [
                            'variant' => new ProductVariantResource($analytics->productVariant),
                            'revenue' => (float) $analytics->revenue,
                            'profit' => (float) $analytics->profit,
                            'conversion_rate' => (float) $analytics->conversion_rate,
                        ];
                    }),
                ],
            ],
            'totals' => [
                'revenue' => (float) $latestAnalytics->sum('revenue'),
                'profit' => (float) $latestAnalytics->sum('profit'),
                'orders' => $latestAnalytics->sum('total_orders'),
                'quantity_sold' => $latestAnalytics->sum('quantity_sold'),
            ],
        ]);
    }
}