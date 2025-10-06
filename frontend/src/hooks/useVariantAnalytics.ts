/**
 * Custom hook for variant analytics and performance metrics
 * 
 * Features:
 * - Fetch variant analytics with time range filters
 * - Get product-specific variant analytics
 * - Get top performing variants
 * - Compare variants side-by-side
 * - Get performance summary
 * - Automatic data refresh
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All analytics are tenant-scoped
 * - No cross-tenant data visibility
 * 
 * @module hooks/useVariantAnalytics
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import {
  getVariantAnalytics,
  getProductVariantAnalytics,
  getTopPerformers,
  compareVariants,
  getVariantPerformanceSummary,
  type VariantAnalyticsParams,
} from '../api/variantsApi';
import {
  type VariantAnalytics,
  type TopPerformersResponse,
  type VariantComparisonResponse,
} from '../types/variant';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const analyticsKeys = {
  all: ['variant-analytics'] as const,
  analytics: (tenantId: string, params?: VariantAnalyticsParams) =>
    [...analyticsKeys.all, 'list', tenantId, params] as const,
  productAnalytics: (tenantId: string, productId: string, params?: VariantAnalyticsParams) =>
    [...analyticsKeys.all, 'product', tenantId, productId, params] as const,
  topPerformers: (tenantId: string, metric?: string, limit?: number) =>
    [...analyticsKeys.all, 'top-performers', tenantId, metric, limit] as const,
  comparison: (tenantId: string, variantIds: string[]) =>
    [...analyticsKeys.all, 'comparison', tenantId, ...variantIds] as const,
  summary: (tenantId: string, variantId: string) =>
    [...analyticsKeys.all, 'summary', tenantId, variantId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch variant analytics
 * 
 * @param tenantId - Tenant ID (REQUIRED)
 * @param params - Analytics parameters (time range, filters)
 * 
 * @example
 * ```tsx
 * const { data: analytics } = useVariantAnalytics(tenantId, {
 *   start_date: '2024-01-01',
 *   end_date: '2024-12-31',
 *   product_id: 'xxx', // optional
 * });
 * ```
 */
export function useVariantAnalytics(
  tenantId: string,
  params?: VariantAnalyticsParams,
  options?: Omit<UseQueryOptions<VariantAnalytics[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VariantAnalytics[]>({
    queryKey: analyticsKeys.analytics(tenantId, params),
    queryFn: () => getVariantAnalytics(tenantId, params),
    enabled: !!tenantId,
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Auto-refresh every 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch analytics for a specific product's variants
 * 
 * @param tenantId - Tenant ID (REQUIRED)
 * @param productId - Product ID
 * @param params - Analytics parameters
 * 
 * @example
 * ```tsx
 * const { data } = useProductVariantAnalytics(tenantId, productId, {
 *   start_date: '2024-01-01',
 *   end_date: '2024-12-31',
 * });
 * ```
 */
export function useProductVariantAnalytics(
  tenantId: string,
  productId: string,
  params?: VariantAnalyticsParams,
  options?: Omit<UseQueryOptions<VariantAnalytics[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VariantAnalytics[]>({
    queryKey: analyticsKeys.productAnalytics(tenantId, productId, params),
    queryFn: () => getProductVariantAnalytics(tenantId, productId, params),
    enabled: !!tenantId && !!productId,
    staleTime: 60000,
    refetchInterval: 300000,
    ...options,
  });
}

/**
 * Hook to fetch top performing variants
 * 
 * @param tenantId - Tenant ID (REQUIRED)
 * @param metric - Performance metric ('sales_quantity', 'revenue', 'profit_margin')
 * @param limit - Number of top performers to return (default: 10)
 * 
 * @example
 * ```tsx
 * const { data: topSellers } = useTopPerformers(
 *   tenantId, 
 *   'sales_quantity', 
 *   10
 * );
 * ```
 */
export function useTopPerformers(
  tenantId: string,
  metric: 'sales_quantity' | 'revenue' | 'profit_margin' = 'sales_quantity',
  limit: number = 10,
  options?: Omit<UseQueryOptions<TopPerformersResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TopPerformersResponse>({
    queryKey: analyticsKeys.topPerformers(tenantId, metric, limit),
    queryFn: () => getTopPerformers(tenantId, metric, limit),
    enabled: !!tenantId,
    staleTime: 120000, // 2 minutes
    refetchInterval: 300000,
    ...options,
  });
}

/**
 * Hook to compare multiple variants side-by-side
 * 
 * @param tenantId - Tenant ID (REQUIRED)
 * @param variantIds - Array of variant IDs to compare
 * 
 * @example
 * ```tsx
 * const { data: comparison } = useVariantComparison(
 *   tenantId, 
 *   ['variant-1', 'variant-2', 'variant-3']
 * );
 * 
 * // Access comparison data
 * comparison.variants // Variant details
 * comparison.metrics  // Performance metrics for each variant
 * ```
 */
export function useVariantComparison(
  tenantId: string,
  variantIds: string[],
  options?: Omit<UseQueryOptions<VariantComparisonResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VariantComparisonResponse>({
    queryKey: analyticsKeys.comparison(tenantId, variantIds),
    queryFn: () => compareVariants(tenantId, variantIds),
    enabled: !!tenantId && variantIds.length > 0,
    staleTime: 60000,
    ...options,
  });
}

/**
 * Hook to fetch performance summary for a single variant
 * 
 * @param tenantId - Tenant ID (REQUIRED)
 * @param variantId - Variant ID
 * 
 * @example
 * ```tsx
 * const { data: summary } = useVariantPerformanceSummary(tenantId, variantId);
 * 
 * // Access summary data
 * summary.total_sales
 * summary.total_revenue
 * summary.average_profit_margin
 * summary.stock_turnover_rate
 * ```
 */
export function useVariantPerformanceSummary(
  tenantId: string,
  variantId: string,
  options?: Omit<UseQueryOptions<VariantAnalytics>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VariantAnalytics>({
    queryKey: analyticsKeys.summary(tenantId, variantId),
    queryFn: () => getVariantPerformanceSummary(tenantId, variantId),
    enabled: !!tenantId && !!variantId,
    staleTime: 60000,
    refetchInterval: 300000,
    ...options,
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to get analytics with automatic date range
 * Defaults to last 30 days if no date range provided
 * 
 * @example
 * ```tsx
 * const { data } = useRecentAnalytics(tenantId);
 * // Fetches analytics for last 30 days
 * ```
 */
export function useRecentAnalytics(
  tenantId: string,
  days: number = 30,
  options?: Omit<UseQueryOptions<VariantAnalytics[]>, 'queryKey' | 'queryFn'>
) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const params: VariantAnalyticsParams = {
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };

  return useVariantAnalytics(tenantId, params, options);
}

/**
 * Hook to check if variant analytics data is available
 * Returns true if there's analytics data for the tenant
 * 
 * @example
 * ```tsx
 * const hasAnalytics = useHasAnalyticsData(tenantId);
 * 
 * if (hasAnalytics) {
 *   // Show analytics dashboard
 * } else {
 *   // Show empty state
 * }
 * ```
 */
export function useHasAnalyticsData(tenantId: string): boolean {
  const { data } = useVariantAnalytics(
    tenantId,
    undefined,
    { 
      staleTime: Infinity, // Only check once
      retry: false,
    }
  );

  return !!data && data.length > 0;
}