/**
 * Variant Analytics Hook
 * Phase 6 - Day 17: Analytics Dashboard
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All operations are tenant-scoped (tenantId required)
 * - All API calls respect tenant boundaries
 * - No cross-tenant data access
 */

import { useQuery } from '@tanstack/react-query';
import { 
  getProductVariantAnalytics,
  getTopPerformers,
  getVariantPerformanceSummary,
  compareVariants,
} from '../api/variantsApi';
import type {
  VariantAnalytics,
  VariantAnalyticsParams,
  TopPerformersResponse,
  VariantComparisonResponse,
} from '../types/variant';

// ========================================
// ANALYTICS QUERY KEYS
// ========================================

export const variantAnalyticsKeys = {
  all: (tenantId: string) => ['variant-analytics', tenantId] as const,
  product: (tenantId: string, productId: string) => 
    [...variantAnalyticsKeys.all(tenantId), 'product', productId] as const,
  topPerformers: (tenantId: string, params?: VariantAnalyticsParams) => 
    [...variantAnalyticsKeys.all(tenantId), 'top-performers', params] as const,
  performanceSummary: (tenantId: string, params?: VariantAnalyticsParams) => 
    [...variantAnalyticsKeys.all(tenantId), 'performance-summary', params] as const,
  comparison: (tenantId: string, variantIds: string[], params?: VariantAnalyticsParams) => 
    [...variantAnalyticsKeys.all(tenantId), 'comparison', variantIds, params] as const,
};

// ========================================
// PRODUCT VARIANT ANALYTICS
// ========================================

/**
 * Fetch analytics for all variants of a product
 */
export const useProductVariantAnalytics = (
  tenantId: string,
  productId: string,
  params?: VariantAnalyticsParams,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery<VariantAnalytics[], Error>({
    queryKey: variantAnalyticsKeys.product(tenantId, productId),
    queryFn: () => getProductVariantAnalytics(tenantId, productId, params),
    enabled: options?.enabled ?? (!!tenantId && !!productId),
    refetchInterval: options?.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ========================================
// TOP PERFORMERS
// ========================================

/**
 * Fetch top performing variants (sales, revenue, profit)
 */
export const useTopPerformers = (
  tenantId: string,
  params?: VariantAnalyticsParams,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery<TopPerformersResponse, Error>({
    queryKey: variantAnalyticsKeys.topPerformers(tenantId, params),
    queryFn: () => getTopPerformers(tenantId, params),
    enabled: (options?.enabled ?? true) && !!tenantId,
    refetchInterval: options?.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ========================================
// PERFORMANCE SUMMARY
// ========================================

/**
 * Fetch performance summary for all variants
 */
export const useVariantPerformanceSummary = (
  tenantId: string,
  params?: VariantAnalyticsParams,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) => {
  return useQuery<any, Error>({
    queryKey: variantAnalyticsKeys.performanceSummary(tenantId, params),
    queryFn: () => getVariantPerformanceSummary(tenantId, params),
    enabled: (options?.enabled ?? true) && !!tenantId,
    refetchInterval: options?.refetchInterval,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ========================================
// VARIANT COMPARISON
// ========================================

/**
 * Compare multiple variants
 */
export const useVariantComparison = (
  tenantId: string,
  variantIds: string[],
  params?: VariantAnalyticsParams,
  options?: {
    enabled?: boolean;
  }
) => {
  return useQuery<VariantComparisonResponse, Error>({
    queryKey: variantAnalyticsKeys.comparison(tenantId, variantIds, params),
    queryFn: () => compareVariants(tenantId, variantIds, params),
    enabled: options?.enabled ?? (!!tenantId && variantIds.length > 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ========================================
// HELPER: TRANSFORM DATA FOR CHARTS
// ========================================

/**
 * Transform analytics data for line/bar charts
 */
export const transformAnalyticsForChart = (analytics: VariantAnalytics[]) => {
  return analytics.map((item) => ({
    date: new Date(item.period_start).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
    }),
    sales: item.units_sold,
    revenue: item.revenue,
    profit: item.profit,
    variantName: item.variant?.name || 'Unknown',
  }));
};

/**
 * Transform top performers for bar charts
 */
export const transformTopPerformersForChart = (
  performers: VariantAnalytics[],
  metric: 'sales' | 'revenue' | 'profit' = 'sales'
) => {
  return performers.map((item) => ({
    name: item.variant?.name || item.variant?.sku || 'Unknown',
    value: metric === 'sales' ? item.units_sold : item[metric],
    rank: item.sales_rank || item.revenue_rank || 0,
  }));
};

/**
 * Calculate stock heatmap data
 */
export const calculateStockHeatmap = (analytics: VariantAnalytics[]) => {
  const heatmapData = analytics.map((item) => {
    const stock = item.variant?.stock || 0;
    const sales = item.units_sold;
    const turnover = stock > 0 ? sales / stock : 0;
    
    // Categorize stock level
    let status: 'critical' | 'low' | 'normal' | 'high' = 'normal';
    if (stock === 0) {
      status = 'critical';
    } else if (item.variant?.is_low_stock) {
      status = 'low';
    } else if (turnover < 0.1) {
      status = 'high'; // Overstocked
    }

    return {
      variant: item.variant?.name || item.variant?.sku || 'Unknown',
      stock,
      sales,
      turnover,
      status,
      color: {
        critical: '#ef4444', // red-500
        low: '#f97316',      // orange-500
        normal: '#22c55e',   // green-500
        high: '#3b82f6',     // blue-500
      }[status],
    };
  });

  return heatmapData;
};

/**
 * Calculate performance recommendations
 */
export const generateRecommendations = (analytics: VariantAnalytics[]) => {
  const recommendations: Array<{
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    description: string;
    variantId?: string;
  }> = [];

  analytics.forEach((item) => {
    const variant = item.variant;
    if (!variant) return;

    // Low stock warning
    if (variant.is_critical_stock) {
      recommendations.push({
        type: 'error',
        title: 'Critical Stock Level',
        description: `${variant.name} is critically low (${variant.stock} units). Reorder immediately.`,
        variantId: variant.id,
      });
    } else if (variant.is_low_stock) {
      recommendations.push({
        type: 'warning',
        title: 'Low Stock Warning',
        description: `${variant.name} is running low (${variant.stock} units). Consider reordering.`,
        variantId: variant.id,
      });
    }

    // Poor performance warning
    if (item.performance_status === 'poor') {
      recommendations.push({
        type: 'warning',
        title: 'Low Performance',
        description: `${variant.name} has low sales (${item.units_sold} units). Consider promotions or price adjustments.`,
        variantId: variant.id,
      });
    }

    // High performer success
    if (item.performance_status === 'excellent') {
      recommendations.push({
        type: 'success',
        title: 'Top Performer',
        description: `${variant.name} is performing excellently (${item.units_sold} units sold, Rp ${item.revenue.toLocaleString('id-ID')} revenue).`,
        variantId: variant.id,
      });
    }

    // Days out of stock
    if (item.days_out_of_stock > 0) {
      recommendations.push({
        type: 'warning',
        title: 'Stock Outage',
        description: `${variant.name} was out of stock for ${item.days_out_of_stock} days. Ensure adequate inventory.`,
        variantId: variant.id,
      });
    }
  });

  return recommendations;
};

/**
 * Calculate overview metrics
 */
export const calculateOverviewMetrics = (analytics: VariantAnalytics[]) => {
  const totalUnits = analytics.reduce((sum, item) => sum + item.units_sold, 0);
  const totalRevenue = analytics.reduce((sum, item) => sum + item.revenue, 0);
  const totalProfit = analytics.reduce((sum, item) => sum + item.profit, 0);
  const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const activeVariants = analytics.filter((item) => item.variant?.is_active).length;
  const lowStockVariants = analytics.filter((item) => item.variant?.is_low_stock).length;
  const outOfStockVariants = analytics.filter((item) => item.variant?.stock === 0).length;

  return {
    totalUnits,
    totalRevenue,
    totalProfit,
    avgProfitMargin,
    activeVariants,
    lowStockVariants,
    outOfStockVariants,
    totalVariants: analytics.length,
  };
};