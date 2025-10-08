/**
 * Product Analytics Type Definitions
 * 
 * Type-safe interfaces for product analytics data including:
 * - Sales metrics and trends
 * - Stock metrics and movements
 * - Profit analysis
 * - Variant performance comparison
 * 
 * All data is tenant-scoped and tied to specific products
 */

/**
 * Time-series data point for charts
 */
export interface TimeSeriesData {
  date: string; // ISO 8601 date string (YYYY-MM-DD)
  value: number;
  label?: string;
}

/**
 * Sales trend data point with multiple metrics
 */
export interface SalesTrendData {
  date: string; // ISO 8601 date string
  quantity: number;
  revenue: number;
}

/**
 * Profit trend data point
 */
export interface ProfitTrendData {
  date: string; // ISO 8601 date string
  revenue: number;
  cost: number;
  profit: number;
}

/**
 * Stock movement data point
 */
export interface StockMovement {
  date: string; // ISO 8601 date string
  adjustment_type: 'in' | 'out' | 'adjustment' | 'return' | 'damage';
  total_change: number;
}

/**
 * Period information for analytics queries
 */
export interface AnalyticsPeriod {
  start: string; // ISO 8601 datetime string
  end: string; // ISO 8601 datetime string
}

/**
 * Product sales metrics
 */
export interface ProductSalesMetrics {
  total_revenue: number;
  total_quantity_sold: number;
  total_orders: number;
  average_order_value: number;
  sales_trend: SalesTrendData[];
  period: AnalyticsPeriod;
}

/**
 * Product stock metrics
 */
export interface ProductStockMetrics {
  current_stock: number;
  stock_value: number;
  stock_movements: StockMovement[];
  low_stock_alerts: number;
  period: AnalyticsPeriod;
}

/**
 * Product profit metrics
 */
export interface ProductProfitMetrics {
  total_cost: number;
  total_revenue: number;
  gross_profit: number;
  profit_margin: number; // Percentage (0-100)
  profit_trend: ProfitTrendData[];
  period: AnalyticsPeriod;
}

/**
 * Variant performance data
 */
export interface VariantPerformance {
  variant_id: string; // UUID
  variant_name: string;
  variant_sku: string;
  total_sold: number;
  revenue: number;
  stock_remaining: number;
}

/**
 * Combined analytics overview
 */
export interface ProductAnalyticsOverview {
  sales: ProductSalesMetrics;
  stock: ProductStockMetrics;
  profit: ProductProfitMetrics;
  variants: VariantPerformance[];
}

/**
 * Analytics API response wrapper
 */
export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Analytics query parameters
 */
export interface AnalyticsParams {
  period_start?: string; // ISO 8601 date string (YYYY-MM-DD)
  period_end?: string; // ISO 8601 date string (YYYY-MM-DD)
  limit?: number; // For variant performance
}

/**
 * Period preset options for date range selector
 */
export type AnalyticsPeriodPreset = 
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

/**
 * Period preset configuration
 */
export interface PeriodPresetConfig {
  label: string;
  value: AnalyticsPeriodPreset;
  getDates: () => { start: string; end: string };
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
  icon?: React.ComponentType<{ className?: string }>;
}