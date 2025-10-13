/**
 * Analytics Types
 * 
 * Type definitions for Phase 4A: Advanced Analytics Dashboard
 * Phase 4A+: Historical Trends & Comparison
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
 * Analytics Comparison Response (Phase 4A+)
 * Includes current metrics, comparison metrics, and variance
 */
export interface AnalyticsComparison {
  current: PosOverview;
  comparison: PosOverview | null;
  variance: {
    revenue_change: number;
    transactions_change: number;
    average_ticket_change: number;
  } | null;
}

/**
 * Comparison Period Types (Phase 4A+)
 */
export type ComparisonPeriod = 
  | 'previous_day' 
  | 'previous_week' 
  | 'previous_month' 
  | 'previous_year'
  | null;

/**
 * Date Range for Custom Period Selection (Phase 4A+)
 */
export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Date Range Presets (Phase 4A+)
 */
export type DateRangePreset = 
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

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
  date?: string; // YYYY-MM-DD, defaults to last 30 days
  comparison_period?: ComparisonPeriod; // Phase 4A+: Historical Comparison
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

/**
 * Phase 4A+ Day 2: Forecasting & Benchmarking Types
 */

/**
 * Forecast Data Point
 * Represents a predicted future value with confidence intervals
 */
export interface ForecastPoint {
  date: string; // YYYY-MM-DD
  value: number; // Predicted value
  lower: number; // Lower bound of confidence interval
  upper: number; // Upper bound of confidence interval
  isForecasted: true; // Flag to distinguish from historical data
}

/**
 * Forecast Result
 * Contains historical data + forecasted values
 */
export interface ForecastResult {
  historical: SalesTrend[];
  forecast: ForecastPoint[];
  metric: 'revenue' | 'transactions' | 'average_ticket';
  rSquared: number; // Goodness of fit (0-1, higher is better)
  slope: number; // Trend direction
  intercept: number; // Y-intercept
}

/**
 * Forecast Period Options
 */
export type ForecastPeriod = 7 | 14 | 30 | 60 | 90;

/**
 * Benchmark Baseline Types
 */
export type BenchmarkBaselineType = 
  | 'avg_7_days'
  | 'avg_30_days' 
  | 'avg_90_days' 
  | 'all_time'
  | 'custom_target';

/**
 * Benchmark Status
 */
export type BenchmarkStatus = 'below_target' | 'on_track' | 'above_target';

/**
 * Benchmark Metric
 * Compares current performance vs baseline
 */
export interface BenchmarkMetric {
  label: string;
  current: number;
  baseline: number;
  baselineType: BenchmarkBaselineType;
  variance: number; // Percentage difference
  status: BenchmarkStatus;
  unit?: string; // e.g., 'Rp', 'transactions'
}

/**
 * Benchmark Data
 * Collection of all benchmark metrics
 */
export interface BenchmarkData {
  revenue: BenchmarkMetric;
  transactions: BenchmarkMetric;
  averageTicket: BenchmarkMetric;
  calculatedAt: string; // ISO timestamp
}

/**
 * Phase 4A+ Day 3: Anomaly Detection Types
 */

/**
 * Anomaly Type
 * Classification of detected anomalies
 */
export type AnomalyType = 'spike' | 'drop' | 'flat';

/**
 * Anomaly Severity
 * Level of deviation from normal patterns
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Detected Anomaly
 * Represents an unusual pattern in the data
 */
export interface Anomaly {
  date: string; // YYYY-MM-DD
  type: AnomalyType;
  severity: AnomalySeverity;
  metric: 'revenue' | 'transactions' | 'average_ticket';
  value: number; // Actual value
  expectedValue: number; // Expected value (rolling average)
  variance: number; // Percentage difference
  zScore: number; // Standard deviations from mean
  description: string; // Human-readable description
}

/**
 * Anomaly Detection Result
 * Complete anomaly analysis for a dataset
 */
export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  totalAnomalies: number;
  spikesCount: number;
  dropsCount: number;
  flatCount: number;
  detectionParams: {
    windowSize: number; // Rolling window size (days)
    threshold: number; // Z-score threshold (standard deviations)
    minDataPoints: number; // Minimum required data points
  };
  calculatedAt: string; // ISO timestamp
}

/**
 * Anomaly Detection Configuration
 */
export interface AnomalyDetectionConfig {
  windowSize?: number; // Default: 7 days
  threshold?: number; // Default: 2 (standard deviations)
  flatThreshold?: number; // Default: 5% (variance threshold for "flat")
  minDataPoints?: number; // Default: 14 (minimum data points required)
}

/**
 * Anomaly Alert
 * User-facing alert for significant anomalies
 */
export interface AnomalyAlert {
  id: string;
  anomaly: Anomaly;
  alertLevel: 'info' | 'warning' | 'critical';
  message: string;
  suggestedAction?: string;
  timestamp: string; // ISO timestamp
  dismissed: boolean;
}

/**
 * Phase 5: Backend Integration Types
 * Types for backend-powered analytics features
 */

/**
 * Backend Anomaly (Persistent Storage)
 * Represents an anomaly stored in the database
 */
export interface BackendAnomaly {
  id: string;
  tenant_id: string;
  detected_date: string; // YYYY-MM-DD
  metric_type: 'revenue' | 'transactions' | 'average_ticket';
  anomaly_type: 'spike' | 'drop' | 'flat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  actual_value: number;
  expected_value: number;
  variance_percent: number;
  z_score: number;
  context_data?: string | null;
  acknowledged: boolean;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Analytics User Preferences (Backend)
 * User-configurable analytics settings
 */
export interface AnalyticsPreferences {
  id: string;
  tenant_id: string;
  user_id?: string | null; // null = tenant-wide defaults
  anomaly_window_days: number;
  anomaly_threshold_low: number;
  anomaly_threshold_medium: number;
  anomaly_threshold_high: number;
  anomaly_threshold_critical: number;
  forecast_days_ahead: number;
  forecast_algorithm: 'linear_regression' | 'exponential_smoothing';
  email_notifications_enabled: boolean;
  notification_severity_filter: string[]; // ['low', 'medium', 'high', 'critical']
  notification_digest_frequency: 'realtime' | 'daily' | 'weekly';
  benchmark_baseline_days: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Analytics Preferences Update Payload
 */
export interface AnalyticsPreferencesUpdate {
  anomaly_window_days?: number;
  anomaly_threshold_low?: number;
  anomaly_threshold_medium?: number;
  anomaly_threshold_high?: number;
  anomaly_threshold_critical?: number;
  forecast_days_ahead?: number;
  forecast_algorithm?: 'linear_regression' | 'exponential_smoothing';
  email_notifications_enabled?: boolean;
  notification_severity_filter?: string[];
  notification_digest_frequency?: 'realtime' | 'daily' | 'weekly';
  benchmark_baseline_days?: number;
}

/**
 * Anomaly Filters (for API queries)
 */
export interface AnomalyFilters {
  severity?: string; // 'low' | 'medium' | 'high' | 'critical'
  metric_type?: string; // 'revenue' | 'transactions' | 'average_ticket'
  anomaly_type?: string; // 'spike' | 'drop' | 'flat'
  acknowledged?: boolean; // true/false/undefined
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  page?: number;
  per_page?: number;
}

/**
 * Paginated Anomaly Response
 */
export interface PaginatedAnomaliesResponse {
  data: BackendAnomaly[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}