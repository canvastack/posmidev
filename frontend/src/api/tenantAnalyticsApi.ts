/**
 * Tenant Analytics API Client
 * 
 * Provides type-safe API calls for tenant-wide analytics endpoints.
 * All endpoints are tenant-scoped and require authentication.
 * 
 * Base URL: /api/v1/tenants/{tenantId}/analytics
 */

import { apiClient } from './client';
import type {
  TenantAnalyticsResponse,
  TenantAnalyticsOverview,
  TopProduct,
  RevenueBreakdown,
  ProfitAnalysis,
  CategoryPerformance,
  MostViewedProduct,
  PopularSearchTerm,
  SearchTrendData,
  ZeroResultSearch,
  SearchStats,
  ProductViewStats,
  ViewTrendData,
  TenantAnalyticsParams,
  TrackSearchRequest,
} from '../types/tenantAnalytics';

/**
 * Get comprehensive analytics overview
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters
 * @returns Promise with overview data
 * 
 * @example
 * ```ts
 * const overview = await getTenantAnalyticsOverview('tenant-123', {
 *   period_start: '2024-01-01',
 *   period_end: '2024-01-31',
 * });
 * console.log(overview.data.summary.total_revenue);
 * ```
 */
export const getTenantAnalyticsOverview = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<TenantAnalyticsOverview>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/overview`,
    { params }
  );
  return response.data;
};

/**
 * Get top performing products
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (metric, limit, period)
 * @returns Promise with top products array
 * 
 * @example
 * ```ts
 * const topProducts = await getTopProducts('tenant-123', {
 *   metric: 'revenue',
 *   limit: 10,
 *   period_start: '2024-01-01',
 * });
 * console.log(topProducts.data); // Array of top 10 products
 * ```
 */
export const getTopProducts = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<TopProduct[]>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/top-products`,
    { params }
  );
  return response.data;
};

/**
 * Get revenue breakdown by product (for pie/donut charts)
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (limit, period)
 * @returns Promise with revenue breakdown data
 * 
 * @example
 * ```ts
 * const breakdown = await getRevenueBreakdown('tenant-123', {
 *   limit: 10,
 * });
 * console.log(breakdown.data.products); // Array with percentages
 * ```
 */
export const getRevenueBreakdown = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<RevenueBreakdown>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/revenue-breakdown`,
    { params }
  );
  return response.data;
};

/**
 * Get profit analysis
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (limit, period)
 * @returns Promise with profit analysis data
 * 
 * @example
 * ```ts
 * const profit = await getProfitAnalysis('tenant-123');
 * console.log(profit.data.average_profit_margin);
 * ```
 */
export const getProfitAnalysis = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<ProfitAnalysis>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/profit-analysis`,
    { params }
  );
  return response.data;
};

/**
 * Get category performance breakdown
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (period)
 * @returns Promise with category performance array
 * 
 * @example
 * ```ts
 * const categories = await getCategoryPerformance('tenant-123');
 * console.log(categories.data); // Array of category stats
 * ```
 */
export const getCategoryPerformance = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<CategoryPerformance[]>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/category-performance`,
    { params }
  );
  return response.data;
};

/**
 * Get most viewed products
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (limit, period)
 * @returns Promise with most viewed products array
 * 
 * @example
 * ```ts
 * const mostViewed = await getMostViewedProducts('tenant-123', {
 *   limit: 10,
 * });
 * console.log(mostViewed.data); // Array of most viewed
 * ```
 */
export const getMostViewedProducts = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<MostViewedProduct[]>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/most-viewed`,
    { params }
  );
  return response.data;
};

/**
 * Get popular search terms
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (limit, period)
 * @returns Promise with popular search terms array
 * 
 * @example
 * ```ts
 * const searches = await getPopularSearchTerms('tenant-123', {
 *   limit: 20,
 * });
 * console.log(searches.data); // Array of search terms
 * ```
 */
export const getPopularSearchTerms = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<PopularSearchTerm[]>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/search-terms`,
    { params }
  );
  return response.data;
};

/**
 * Get search trends over time
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (period, group_by)
 * @returns Promise with search trend data
 * 
 * @example
 * ```ts
 * const trends = await getSearchTrends('tenant-123', {
 *   group_by: 'day',
 *   period_start: '2024-01-01',
 * });
 * console.log(trends.data); // Array of trend data points
 * ```
 */
export const getSearchTrends = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<SearchTrendData[]>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/search-trends`,
    { params }
  );
  return response.data;
};

/**
 * Get zero-result searches (searches that returned no products)
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (limit, period)
 * @returns Promise with zero-result searches array
 * 
 * @example
 * ```ts
 * const zeroResults = await getZeroResultSearches('tenant-123');
 * console.log(zeroResults.data); // Array of failed searches
 * ```
 */
export const getZeroResultSearches = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<ZeroResultSearch[]>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/zero-result-searches`,
    { params }
  );
  return response.data;
};

/**
 * Get search statistics summary
 * 
 * @param tenantId - Tenant UUID
 * @param params - Optional query parameters (period)
 * @returns Promise with search stats
 * 
 * @example
 * ```ts
 * const stats = await getSearchStats('tenant-123');
 * console.log(stats.data.total_searches);
 * ```
 */
export const getSearchStats = async (
  tenantId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<SearchStats>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/analytics/search-stats`,
    { params }
  );
  return response.data;
};

/**
 * Track a product view
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @returns Promise with success response
 * 
 * @example
 * ```ts
 * await trackProductView('tenant-123', 'product-456');
 * // View tracked successfully
 * ```
 */
export const trackProductView = async (
  tenantId: string,
  productId: string
): Promise<TenantAnalyticsResponse<{ message: string }>> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/products/${productId}/track-view`
  );
  return response.data;
};

/**
 * Get view statistics for a product
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period)
 * @returns Promise with view statistics
 * 
 * @example
 * ```ts
 * const stats = await getProductViewStats('tenant-123', 'product-456');
 * console.log(stats.data.total_views);
 * ```
 */
export const getProductViewStats = async (
  tenantId: string,
  productId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<ProductViewStats>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/view-stats`,
    { params }
  );
  return response.data;
};

/**
 * Get view trends for a product
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period, group_by)
 * @returns Promise with view trend data
 * 
 * @example
 * ```ts
 * const trends = await getProductViewTrends('tenant-123', 'product-456', {
 *   group_by: 'day',
 * });
 * console.log(trends.data); // Array of view trends
 * ```
 */
export const getProductViewTrends = async (
  tenantId: string,
  productId: string,
  params?: TenantAnalyticsParams
): Promise<TenantAnalyticsResponse<ViewTrendData[]>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/view-trends`,
    { params }
  );
  return response.data;
};

/**
 * Track a search query
 * 
 * @param tenantId - Tenant UUID
 * @param data - Search tracking data (term, results_count)
 * @returns Promise with success response
 * 
 * @example
 * ```ts
 * await trackSearch('tenant-123', {
 *   search_term: 'laptop',
 *   results_count: 5,
 * });
 * // Search tracked successfully
 * ```
 */
export const trackSearch = async (
  tenantId: string,
  data: TrackSearchRequest
): Promise<TenantAnalyticsResponse<{ message: string }>> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/analytics/track-search`,
    data
  );
  return response.data;
};

/**
 * Helper: Get period dates for preset ranges
 * 
 * @param preset - Period preset identifier
 * @returns Start and end dates as ISO strings (YYYY-MM-DD)
 * 
 * @example
 * ```ts
 * const { start, end } = getPeriodPresetDates('last_30_days');
 * const analytics = await getTenantAnalyticsOverview(tenantId, {
 *   period_start: start,
 *   period_end: end,
 * });
 * ```
 */
export const getPeriodPresetDates = (
  preset: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'this_month' | 'last_month' | 'this_year'
): { start: string; end: string } => {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  let start: string;

  switch (preset) {
    case 'last_7_days':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'last_30_days':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'last_90_days':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      break;
    case 'last_month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = lastMonth.toISOString().split('T')[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        start,
        end: lastMonthEnd.toISOString().split('T')[0],
      };
    }
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      break;
    default:
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  return { start, end };
};