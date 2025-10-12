/**
 * Benchmark Utility - Phase 4A+ Day 2
 * 
 * Calculates performance benchmarks by comparing current metrics
 * against historical baselines (7-day, 30-day, 90-day averages).
 * 
 * Helps identify if current performance is:
 * - Below Target (< -10% variance)
 * - On Track (-10% to +10% variance)
 * - Above Target (> +10% variance)
 */

import type { 
  SalesTrend, 
  BenchmarkData, 
  BenchmarkMetric, 
  BenchmarkBaselineType,
  BenchmarkStatus,
} from '@/types';

/**
 * Calculate average value for a specific metric
 * 
 * @param data - Sales trend data
 * @param metric - Which metric to average
 * @returns Average value
 */
function calculateAverage(
  data: SalesTrend[],
  metric: 'revenue' | 'transactions' | 'average_ticket'
): number {
  if (data.length === 0) return 0;
  
  const sum = data.reduce((acc, item) => acc + item[metric], 0);
  return sum / data.length;
}

/**
 * Get last N days of data
 * 
 * @param data - Full sales trend data (sorted by date ascending)
 * @param days - Number of days to retrieve
 * @returns Slice of most recent days
 */
function getLastNDays(data: SalesTrend[], days: number): SalesTrend[] {
  if (data.length <= days) return data;
  return data.slice(-days);
}

/**
 * Calculate variance percentage
 * 
 * @param current - Current value
 * @param baseline - Baseline value
 * @returns Percentage variance
 */
function calculateVariance(current: number, baseline: number): number {
  if (baseline === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - baseline) / baseline) * 100;
}

/**
 * Determine benchmark status based on variance
 * 
 * Thresholds:
 * - Below Target: < -10%
 * - On Track: -10% to +10%
 * - Above Target: > +10%
 * 
 * @param variance - Percentage variance
 * @returns Status classification
 */
function determineBenchmarkStatus(variance: number): BenchmarkStatus {
  if (variance < -10) return 'below_target';
  if (variance > 10) return 'above_target';
  return 'on_track';
}

/**
 * Calculate baseline value from historical data
 * 
 * @param data - Historical sales trend data (sorted)
 * @param metric - Which metric to baseline
 * @param baselineType - Type of baseline calculation
 * @param customTarget - Custom target value (only for custom_target type)
 * @returns Baseline value
 */
export function calculateBaseline(
  data: SalesTrend[],
  metric: 'revenue' | 'transactions' | 'average_ticket',
  baselineType: BenchmarkBaselineType,
  customTarget?: number
): number {
  if (data.length === 0) return 0;

  switch (baselineType) {
    case 'avg_7_days': {
      const last7Days = getLastNDays(data, 7);
      return calculateAverage(last7Days, metric);
    }
    
    case 'avg_30_days': {
      const last30Days = getLastNDays(data, 30);
      return calculateAverage(last30Days, metric);
    }
    
    case 'avg_90_days': {
      const last90Days = getLastNDays(data, 90);
      return calculateAverage(last90Days, metric);
    }
    
    case 'all_time': {
      return calculateAverage(data, metric);
    }
    
    case 'custom_target': {
      return customTarget ?? 0;
    }
    
    default:
      return 0;
  }
}

/**
 * Get baseline label for display
 * 
 * @param baselineType - Baseline type
 * @returns Human-readable label
 */
export function getBaselineLabel(baselineType: BenchmarkBaselineType): string {
  const labels: Record<BenchmarkBaselineType, string> = {
    avg_7_days: '7-day average',
    avg_30_days: '30-day average',
    avg_90_days: '90-day average',
    all_time: 'All-time average',
    custom_target: 'Custom target',
  };
  
  return labels[baselineType];
}

/**
 * Create a single benchmark metric
 * 
 * @param label - Metric label (e.g., "Daily Revenue")
 * @param current - Current value
 * @param historicalData - Historical trend data
 * @param metric - Which metric type
 * @param baselineType - Baseline calculation type
 * @param unit - Unit of measurement (optional)
 * @param customTarget - Custom target value (optional)
 * @returns Benchmark metric object
 */
export function createBenchmarkMetric(
  label: string,
  current: number,
  historicalData: SalesTrend[],
  metric: 'revenue' | 'transactions' | 'average_ticket',
  baselineType: BenchmarkBaselineType,
  unit?: string,
  customTarget?: number
): BenchmarkMetric {
  const baseline = calculateBaseline(historicalData, metric, baselineType, customTarget);
  const variance = calculateVariance(current, baseline);
  const status = determineBenchmarkStatus(variance);

  return {
    label,
    current,
    baseline,
    baselineType,
    variance,
    status,
    unit,
  };
}

/**
 * Calculate all benchmark data
 * 
 * @param currentRevenue - Current period revenue
 * @param currentTransactions - Current period transactions
 * @param currentAverageTicket - Current period average ticket
 * @param historicalData - Historical sales trend data
 * @param baselineType - Type of baseline to use
 * @returns Complete benchmark data
 */
export function calculateBenchmarkData(
  currentRevenue: number,
  currentTransactions: number,
  currentAverageTicket: number,
  historicalData: SalesTrend[],
  baselineType: BenchmarkBaselineType = 'avg_30_days'
): BenchmarkData {
  // Sort data by date (ascending) for accurate baseline calculation
  const sortedData = [...historicalData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return {
    revenue: createBenchmarkMetric(
      'Revenue',
      currentRevenue,
      sortedData,
      'revenue',
      baselineType,
      'Rp'
    ),
    transactions: createBenchmarkMetric(
      'Transactions',
      currentTransactions,
      sortedData,
      'transactions',
      baselineType,
      'transactions'
    ),
    averageTicket: createBenchmarkMetric(
      'Average Ticket',
      currentAverageTicket,
      sortedData,
      'average_ticket',
      baselineType,
      'Rp'
    ),
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Get benchmark status color (for UI)
 * 
 * @param status - Benchmark status
 * @returns Tailwind color class
 */
export function getBenchmarkStatusColor(status: BenchmarkStatus): string {
  switch (status) {
    case 'below_target':
      return 'text-danger-600 dark:text-danger-400';
    case 'on_track':
      return 'text-info-600 dark:text-info-400';
    case 'above_target':
      return 'text-success-600 dark:text-success-400';
  }
}

/**
 * Get benchmark status icon
 * 
 * @param status - Benchmark status
 * @returns Status text with icon
 */
export function getBenchmarkStatusLabel(status: BenchmarkStatus): string {
  switch (status) {
    case 'below_target':
      return 'Below Target';
    case 'on_track':
      return 'On Track';
    case 'above_target':
      return 'Above Target';
  }
}

/**
 * Calculate progress percentage for UI progress bar
 * 
 * @param current - Current value
 * @param baseline - Baseline value
 * @returns Progress percentage (clamped to 0-200%)
 */
export function calculateProgressPercentage(current: number, baseline: number): number {
  if (baseline === 0) return 0;
  
  const percentage = (current / baseline) * 100;
  
  // Clamp between 0 and 200% for UI display
  return Math.max(0, Math.min(200, percentage));
}