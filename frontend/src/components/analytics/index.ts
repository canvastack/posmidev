/**
 * Analytics Components Barrel Export
 * 
 * Phase 4A Day 4: Analytics Dashboard UI Components
 * Phase 4A+ Day 1-3: Historical Trends, Forecasting & Anomaly Detection
 * Exports all analytics-related components for easier imports
 */

export { default as SalesOverviewCard } from './SalesOverviewCard';
export type { SalesOverviewCardProps } from './SalesOverviewCard';

export { default as SalesTrendChart } from './SalesTrendChart';
export type { SalesTrendChartProps } from './SalesTrendChart';

export { default as BestSellersTable } from './BestSellersTable';
export type { BestSellersTableProps } from './BestSellersTable';

export { default as CashierPerformanceTable } from './CashierPerformanceTable';
export type { CashierPerformanceTableProps } from './CashierPerformanceTable';

// Phase 4A+ Day 1: Historical Comparison
export { ComparisonSelector, ComparisonCards } from './historical';

// Phase 4A+ Day 2: Forecasting & Benchmarking
export { TrendForecastChart, ForecastControls, BenchmarkCards } from './forecast';

// Phase 4A+ Day 3: Anomaly Detection
export { AnomalyAlertsPanel } from './anomaly';

// Phase 4A+ Day 4: Advanced Export
export { ExportModal } from './export';