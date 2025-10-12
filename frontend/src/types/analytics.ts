/**
 * Analytics Types
 * 
 * Type definitions for Phase 4A: Advanced Analytics Dashboard
 * Aligns with backend API responses from PosAnalyticsController
 */

/**
 * POS Overview Metrics
 * Data returned from POST /api/v1/tenants/{tenantId}/analytics/pos/overview
 */
export interface PosOverview {
  total_revenue: number;
  total_transactions: number;
  average_ticket: number;
  top_cashier: TopCashier | null;
  best_product: BestProduct | null;
}

/**
 * Top Cashier Information
 */
export interface TopCashier {
  id: string;
  name: string;
  transactions: number;
  revenue: number;
}

/**
 * Best Selling Product Summary
 */
export interface BestProduct {
  id: string;
  name: string;
  sku: string;
  units_sold: number;
  revenue: number;
}

/**
 * Sales Trend Data Point
 * Used for charting revenue/transactions over time
 */
export interface SalesTrend {
  date: string; // ISO date string (YYYY-MM-DD or YYYY-Www for week)
  revenue: number;
  transactions: number;
  average_ticket: number;
}

/**
 * Best Seller Product Details
 */
export interface BestSeller {
  rank: number;
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  units_sold: number;
  revenue: number;
  profit_margin: number | null; // null when recipe not available
}

/**
 * Cashier Performance Metrics
 */
export interface CashierPerformance {
  cashier_id: string;
  cashier_name: string;
  transactions_handled: number;
  revenue_generated: number;
  average_transaction_time: number | null; // null when not tracked
  average_ticket: number;
}

/**
 * Time Period for Trend Analysis
 */
export type TrendPeriod = 'day' | 'week' | 'month';

/**
 * Sort Criteria for Best Sellers
 */
export type BestSellersSortBy = 'revenue' | 'quantity';

/**
 * Analytics API Request Parameters
 */
export interface AnalyticsOverviewRequest {
  date?: string; // YYYY-MM-DD, defaults to today
}

export interface AnalyticsTrendsRequest {
  period?: TrendPeriod; // defaults to 'week'
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
}

export interface AnalyticsBestSellersRequest {
  limit?: number; // 1-100, defaults to 10
  sort_by?: BestSellersSortBy; // defaults to 'revenue'
  start_date?: string; // YYYY-MM-DD, defaults to 30 days ago
  end_date?: string; // YYYY-MM-DD, defaults to today
}

export interface AnalyticsCashierPerformanceRequest {
  start_date?: string; // YYYY-MM-DD, defaults to 30 days ago
  end_date?: string; // YYYY-MM-DD, defaults to today
}

/**
 * API Response Wrapper
 */
export interface AnalyticsApiResponse<T> {
  data: T;
}

/**
 * Error State
 */
export interface AnalyticsError {
  message: string;
  code?: string;
}