/**
 * Tenant Analytics Type Definitions
 * 
 * Type-safe interfaces for tenant-wide analytics data including:
 * - Dashboard overview metrics
 * - Top performing products
 * - Revenue breakdown
 * - Profit analysis
 * - View analytics
 * - Search analytics
 * 
 * All data is tenant-scoped and supports date range filtering
 */

/**
 * Period information for analytics queries
 */
export interface AnalyticsPeriod {
  start: string; // ISO 8601 datetime string
  end: string; // ISO 8601 datetime string
}

/**
 * Summary metrics for dashboard overview
 */
export interface TenantSummaryMetrics {
  total_products: number;
  total_orders: number;
  total_quantity_sold: number;
  total_revenue: number;
}

/**
 * Top performing product data
 */
export interface TopProduct {
  product_id: string;
  product_name: string;
  product_sku: string;
  image_url: string | null;
  total_quantity_sold: number;
  total_revenue: number;
  total_profit: number;
  profit_margin: number; // Percentage (0-100)
}

/**
 * Revenue breakdown by product
 */
export interface RevenueBreakdownItem {
  product_id: string;
  product_name: string;
  revenue: number;
  percentage: number; // Percentage of total (0-100)
}

/**
 * Revenue breakdown response
 */
export interface RevenueBreakdown {
  products: RevenueBreakdownItem[];
  total_revenue: number;
}

/**
 * Profit analysis response
 */
export interface ProfitAnalysis {
  top_profit_products: TopProduct[];
  average_profit_margin: number; // Percentage (0-100)
}

/**
 * Category performance data
 */
export interface CategoryPerformance {
  category_id: string | null;
  category_name: string;
  product_count: number;
  total_quantity_sold: number;
  total_revenue: number;
}

/**
 * Most viewed product data
 */
export interface MostViewedProduct {
  product_id: string;
  product_name: string;
  product_sku: string;
  image_url: string | null;
  view_count: number;
  unique_viewers: number;
}

/**
 * Popular search term data
 */
export interface PopularSearchTerm {
  search_term: string;
  search_count: number;
  avg_results: number;
  last_searched: string; // ISO 8601 datetime
}

/**
 * Search trend data point
 */
export interface SearchTrendData {
  period: string; // Date string (YYYY-MM-DD, YYYY-MM, or YYYY-IW)
  search_count: number;
  unique_terms: number;
}

/**
 * Zero-result search data
 */
export interface ZeroResultSearch {
  search_term: string;
  attempt_count: number;
  last_attempted: string; // ISO 8601 datetime
}

/**
 * Search statistics summary
 */
export interface SearchStats {
  total_searches: number;
  unique_terms: number;
  zero_result_count: number;
  zero_result_percentage: number; // Percentage (0-100)
  avg_results_per_search: number;
  period: AnalyticsPeriod;
}

/**
 * Tenant analytics overview (dashboard data)
 */
export interface TenantAnalyticsOverview {
  summary: TenantSummaryMetrics;
  top_products: TopProduct[];
  recent_views: number;
  recent_searches: number;
  period: AnalyticsPeriod;
}

/**
 * View statistics for a product
 */
export interface ProductViewStats {
  total_views: number;
  unique_viewers: number;
  anonymous_views: number;
  authenticated_views: number;
  period: AnalyticsPeriod;
}

/**
 * View trend data point
 */
export interface ViewTrendData {
  period: string; // Date string (YYYY-MM-DD, YYYY-MM, or YYYY-IW)
  view_count: number;
  unique_viewers: number;
}

/**
 * Analytics API response wrapper
 */
export interface TenantAnalyticsResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Analytics query parameters
 */
export interface TenantAnalyticsParams {
  period_start?: string; // ISO 8601 date string (YYYY-MM-DD)
  period_end?: string; // ISO 8601 date string (YYYY-MM-DD)
  limit?: number; // For top N queries
  metric?: 'revenue' | 'quantity' | 'profit' | 'views'; // For top products
  group_by?: 'day' | 'week' | 'month'; // For trend data
}

/**
 * View tracking request
 */
export interface TrackViewRequest {
  // No body needed, metadata extracted from request context
}

/**
 * Search tracking request
 */
export interface TrackSearchRequest {
  search_term: string;
  results_count: number;
}

/**
 * Period preset options for date range selector
 */
export type TenantAnalyticsPeriodPreset =
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

/**
 * Chart data types for visualization
 */
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

/**
 * Metric card display data
 */
export interface MetricCardData {
  title: string;
  value: number | string;
  format: 'currency' | 'number' | 'percentage';
  change?: number; // Percentage change from previous period
  trend?: 'up' | 'down' | 'neutral';
  icon?: string; // Icon component name
}

/**
 * Export format options
 */
export type ExportFormat = 'csv' | 'pdf' | 'xlsx';