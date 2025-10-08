/**
 * Product Analytics API Client
 * 
 * Provides type-safe API calls for product analytics endpoints.
 * All endpoints are tenant-scoped and require authentication.
 * 
 * Base URL: /api/v1/tenants/{tenantId}/products/{productId}/analytics
 */

import { apiClient } from './client';
import type {
  AnalyticsResponse,
  ProductSalesMetrics,
  ProductStockMetrics,
  ProductProfitMetrics,
  VariantPerformance,
  ProductAnalyticsOverview,
  AnalyticsParams,
} from '../types/analytics';

/**
 * Get sales metrics for a product
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period_start, period_end)
 * @returns Promise with sales metrics data
 * 
 * @example
 * ```ts
 * const sales = await getProductSalesMetrics('tenant-123', 'product-456', {
 *   period_start: '2024-01-01',
 *   period_end: '2024-01-31',
 * });
 * console.log(sales.data.total_revenue);
 * ```
 */
export const getProductSalesMetrics = async (
  tenantId: string,
  productId: string,
  params?: AnalyticsParams
): Promise<AnalyticsResponse<ProductSalesMetrics>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/analytics/sales`,
    { params }
  );
  return response.data;
};

/**
 * Get stock metrics for a product
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period_start, period_end)
 * @returns Promise with stock metrics data
 * 
 * @example
 * ```ts
 * const stock = await getProductStockMetrics('tenant-123', 'product-456');
 * console.log(stock.data.current_stock);
 * ```
 */
export const getProductStockMetrics = async (
  tenantId: string,
  productId: string,
  params?: AnalyticsParams
): Promise<AnalyticsResponse<ProductStockMetrics>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/analytics/stock`,
    { params }
  );
  return response.data;
};

/**
 * Get profit metrics for a product
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period_start, period_end)
 * @returns Promise with profit metrics data
 * 
 * @example
 * ```ts
 * const profit = await getProductProfitMetrics('tenant-123', 'product-456');
 * console.log(profit.data.profit_margin);
 * ```
 */
export const getProductProfitMetrics = async (
  tenantId: string,
  productId: string,
  params?: AnalyticsParams
): Promise<AnalyticsResponse<ProductProfitMetrics>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/analytics/profit`,
    { params }
  );
  return response.data;
};

/**
 * Get variant performance comparison
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period_start, period_end, limit)
 * @returns Promise with variant performance data array
 * 
 * @example
 * ```ts
 * const variants = await getVariantPerformance('tenant-123', 'product-456', {
 *   limit: 10,
 * });
 * console.log(variants.data); // Array of top 10 performing variants
 * ```
 */
export const getVariantPerformance = async (
  tenantId: string,
  productId: string,
  params?: AnalyticsParams
): Promise<AnalyticsResponse<VariantPerformance[]>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/analytics/variants`,
    { params }
  );
  return response.data;
};

/**
 * Get combined analytics overview
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period_start, period_end)
 * @returns Promise with complete analytics overview
 * 
 * @example
 * ```ts
 * const overview = await getProductAnalyticsOverview('tenant-123', 'product-456');
 * console.log(overview.data.sales.total_revenue);
 * console.log(overview.data.profit.profit_margin);
 * console.log(overview.data.variants); // Array of variant performance
 * ```
 */
export const getProductAnalyticsOverview = async (
  tenantId: string,
  productId: string,
  params?: AnalyticsParams
): Promise<AnalyticsResponse<ProductAnalyticsOverview>> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/analytics/overview`,
    { params }
  );
  return response.data;
};

/**
 * Helper function to format period dates for API
 * 
 * @param startDate - Start date (Date object or ISO string)
 * @param endDate - End date (Date object or ISO string)
 * @returns Formatted date strings for API query params
 * 
 * @example
 * ```ts
 * const params = formatPeriodParams(new Date('2024-01-01'), new Date('2024-01-31'));
 * // Returns: { period_start: '2024-01-01', period_end: '2024-01-31' }
 * ```
 */
export const formatPeriodParams = (
  startDate: Date | string,
  endDate: Date | string
): AnalyticsParams => {
  const start = typeof startDate === 'string' ? startDate : startDate.toISOString().split('T')[0];
  const end = typeof endDate === 'string' ? endDate : endDate.toISOString().split('T')[0];
  
  return {
    period_start: start,
    period_end: end,
  };
};

/**
 * Get period dates for preset ranges
 * 
 * @param preset - Period preset identifier
 * @returns Start and end dates as ISO strings (YYYY-MM-DD)
 * 
 * @example
 * ```ts
 * const { start, end } = getPeriodPresetDates('last_30_days');
 * const analytics = await getProductSalesMetrics(tenantId, productId, {
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

/**
 * Export product analytics to CSV
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period_start, period_end)
 * @returns Promise with blob data for download
 * 
 * @example
 * ```ts
 * const blob = await exportProductAnalyticsCsv('tenant-123', 'product-456', {
 *   period_start: '2024-01-01',
 *   period_end: '2024-01-31',
 * });
 * // Trigger download
 * const url = window.URL.createObjectURL(blob);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = 'analytics.csv';
 * link.click();
 * ```
 */
export const exportProductAnalyticsCsv = async (
  tenantId: string,
  productId: string,
  params?: AnalyticsParams
): Promise<Blob> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/analytics/export/csv`,
    { 
      params,
      responseType: 'blob'
    }
  );
  return response.data;
};

/**
 * Export product analytics to PDF
 * 
 * @param tenantId - Tenant UUID
 * @param productId - Product UUID
 * @param params - Optional query parameters (period_start, period_end)
 * @returns Promise with blob data for download
 * 
 * @example
 * ```ts
 * const blob = await exportProductAnalyticsPdf('tenant-123', 'product-456', {
 *   period_start: '2024-01-01',
 *   period_end: '2024-01-31',
 * });
 * // Trigger download
 * const url = window.URL.createObjectURL(blob);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = 'analytics.pdf';
 * link.click();
 * ```
 */
export const exportProductAnalyticsPdf = async (
  tenantId: string,
  productId: string,
  params?: AnalyticsParams
): Promise<Blob> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/analytics/export/pdf`,
    { 
      params,
      responseType: 'blob'
    }
  );
  return response.data;
};