/**
 * Anomaly Detection Utility
 * 
 * Phase 4A+ Day 3: Anomaly Detection & Advanced Visualization
 * Detects unusual patterns in time-series data using statistical methods
 * 
 * Algorithm: Z-Score Method (Standard Deviation)
 * - Calculate rolling average (default 7-day window)
 * - Calculate standard deviation within window
 * - Flag data points > threshold standard deviations from mean
 * 
 * Anomaly Types:
 * - Spike: Value > +2 sigma (abnormally high)
 * - Drop: Value < -2 sigma (abnormally low)
 * - Flat: No change for extended period (< 5% variance)
 */

import type { 
  SalesTrend, 
  Anomaly, 
  AnomalyDetectionResult, 
  AnomalyDetectionConfig,
  AnomalyType,
  AnomalySeverity,
} from '@/types/analytics';

/**
 * Default configuration for anomaly detection
 */
const DEFAULT_CONFIG: Required<AnomalyDetectionConfig> = {
  windowSize: 7, // 7-day rolling window
  threshold: 2, // 2 standard deviations (95% confidence)
  flatThreshold: 5, // 5% variance threshold for "flat" detection
  minDataPoints: 14, // Minimum 2 weeks of data
};

/**
 * Calculate mean (average) of array
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate standard deviation of array
 * Formula: sqrt(sum((x - mean)^2) / n)
 */
function calculateStandardDeviation(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate Z-Score (number of standard deviations from mean)
 * Formula: (value - mean) / standardDeviation
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0; // Avoid division by zero
  return (value - mean) / stdDev;
}

/**
 * Determine anomaly severity based on Z-Score
 * - Low: 2.0-2.5 sigma
 * - Medium: 2.5-3.0 sigma
 * - High: 3.0-4.0 sigma
 * - Critical: > 4.0 sigma
 */
function determineSeverity(zScore: number): AnomalySeverity {
  const absZScore = Math.abs(zScore);
  
  if (absZScore >= 4.0) return 'critical';
  if (absZScore >= 3.0) return 'high';
  if (absZScore >= 2.5) return 'medium';
  return 'low';
}

/**
 * Generate human-readable description for anomaly
 */
function generateDescription(
  type: AnomalyType,
  metric: string,
  variance: number,
  date: string
): string {
  const absVariance = Math.abs(variance);
  const metricName = metric === 'average_ticket' ? 'rata-rata transaksi' : metric === 'revenue' ? 'pendapatan' : 'transaksi';
  
  switch (type) {
    case 'spike':
      return `Lonjakan ${metricName} sebesar ${absVariance.toFixed(1)}% pada tanggal ${date}`;
    case 'drop':
      return `Penurunan ${metricName} sebesar ${absVariance.toFixed(1)}% pada tanggal ${date}`;
    case 'flat':
      return `${metricName.charAt(0).toUpperCase() + metricName.slice(1)} stagnan (variasi < ${absVariance.toFixed(1)}%) pada tanggal ${date}`;
    default:
      return `Anomali terdeteksi pada ${metricName} tanggal ${date}`;
  }
}

/**
 * Detect flat periods (no significant change over time)
 * Identifies periods where variance is below threshold
 */
function detectFlatPeriods(
  trends: SalesTrend[],
  metric: 'revenue' | 'transactions' | 'average_ticket',
  windowSize: number,
  flatThreshold: number
): Anomaly[] {
  const flatAnomalies: Anomaly[] = [];
  
  for (let i = windowSize; i < trends.length; i++) {
    const window = trends.slice(i - windowSize, i);
    const values = window.map(t => t[metric]);
    const mean = calculateMean(values);
    const current = trends[i][metric];
    
    // Calculate variance percentage
    const variance = mean === 0 ? 0 : Math.abs(((current - mean) / mean) * 100);
    
    // If variance is below flat threshold, mark as flat
    if (variance < flatThreshold && mean > 0) {
      flatAnomalies.push({
        date: trends[i].date,
        type: 'flat',
        severity: 'low',
        metric,
        value: current,
        expectedValue: mean,
        variance,
        zScore: 0,
        description: generateDescription('flat', metric, variance, trends[i].date),
      });
    }
  }
  
  return flatAnomalies;
}

/**
 * Main anomaly detection function
 * Detects spikes, drops, and flat periods in time-series data
 * 
 * @param trends - Array of sales trend data points
 * @param metric - Which metric to analyze ('revenue', 'transactions', 'average_ticket')
 * @param config - Optional configuration overrides
 * @returns Complete anomaly detection result
 */
export function detectAnomalies(
  trends: SalesTrend[],
  metric: 'revenue' | 'transactions' | 'average_ticket',
  config: AnomalyDetectionConfig = {}
): AnomalyDetectionResult {
  // Merge config with defaults
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { windowSize, threshold, flatThreshold, minDataPoints } = finalConfig;
  
  // Initialize result
  const result: AnomalyDetectionResult = {
    anomalies: [],
    totalAnomalies: 0,
    spikesCount: 0,
    dropsCount: 0,
    flatCount: 0,
    detectionParams: {
      windowSize,
      threshold,
      minDataPoints,
    },
    calculatedAt: new Date().toISOString(),
  };
  
  // Validate minimum data points
  if (trends.length < minDataPoints) {
    console.warn(`Insufficient data points for anomaly detection. Required: ${minDataPoints}, Got: ${trends.length}`);
    return result;
  }
  
  // Detect spikes and drops using Z-Score method
  for (let i = windowSize; i < trends.length; i++) {
    // Get rolling window
    const window = trends.slice(i - windowSize, i);
    const values = window.map(t => t[metric]);
    
    // Calculate statistics
    const mean = calculateMean(values);
    const stdDev = calculateStandardDeviation(values, mean);
    const current = trends[i][metric];
    const zScore = calculateZScore(current, mean, stdDev);
    
    // Check if Z-Score exceeds threshold
    if (Math.abs(zScore) >= threshold) {
      const type: AnomalyType = zScore > 0 ? 'spike' : 'drop';
      const severity = determineSeverity(zScore);
      const variance = mean === 0 ? 0 : ((current - mean) / mean) * 100;
      
      const anomaly: Anomaly = {
        date: trends[i].date,
        type,
        severity,
        metric,
        value: current,
        expectedValue: mean,
        variance,
        zScore,
        description: generateDescription(type, metric, variance, trends[i].date),
      };
      
      result.anomalies.push(anomaly);
      
      if (type === 'spike') result.spikesCount++;
      if (type === 'drop') result.dropsCount++;
    }
  }
  
  // Detect flat periods (optional, only if no major spikes/drops detected)
  if (result.anomalies.length === 0 || result.anomalies.length < trends.length * 0.1) {
    const flatAnomalies = detectFlatPeriods(trends, metric, windowSize, flatThreshold);
    result.anomalies.push(...flatAnomalies);
    result.flatCount = flatAnomalies.length;
  }
  
  // Sort anomalies by date (newest first)
  result.anomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  // Update total count
  result.totalAnomalies = result.anomalies.length;
  
  return result;
}

/**
 * Detect anomalies for all metrics
 * Convenience function to analyze all metrics at once
 * 
 * @param trends - Array of sales trend data points
 * @param config - Optional configuration overrides
 * @returns Map of metric name to detection result
 */
export function detectAllAnomalies(
  trends: SalesTrend[],
  config: AnomalyDetectionConfig = {}
): Record<string, AnomalyDetectionResult> {
  return {
    revenue: detectAnomalies(trends, 'revenue', config),
    transactions: detectAnomalies(trends, 'transactions', config),
    average_ticket: detectAnomalies(trends, 'average_ticket', config),
  };
}

/**
 * Get most recent critical anomalies (for alerts)
 * Returns up to `limit` most recent anomalies with high/critical severity
 * 
 * @param result - Anomaly detection result
 * @param limit - Maximum number of anomalies to return
 * @returns Array of critical anomalies
 */
export function getCriticalAnomalies(
  result: AnomalyDetectionResult,
  limit: number = 5
): Anomaly[] {
  return result.anomalies
    .filter(a => a.severity === 'high' || a.severity === 'critical')
    .slice(0, limit);
}

/**
 * Get anomaly color based on type and severity
 * Returns Tailwind color class for UI display
 * 
 * @param anomaly - Anomaly object
 * @returns Tailwind color class
 */
export function getAnomalyColor(anomaly: Anomaly): string {
  if (anomaly.type === 'flat') return 'text-warning-500';
  
  if (anomaly.type === 'spike') {
    switch (anomaly.severity) {
      case 'critical': return 'text-success-600';
      case 'high': return 'text-success-500';
      default: return 'text-success-400';
    }
  }
  
  if (anomaly.type === 'drop') {
    switch (anomaly.severity) {
      case 'critical': return 'text-danger-600';
      case 'high': return 'text-danger-500';
      default: return 'text-danger-400';
    }
  }
  
  return 'text-gray-500';
}

/**
 * Get anomaly icon name based on type
 * Returns lucide-react icon name for UI display
 * 
 * @param type - Anomaly type
 * @returns Icon name
 */
export function getAnomalyIcon(type: AnomalyType): string {
  switch (type) {
    case 'spike': return 'TrendingUp';
    case 'drop': return 'TrendingDown';
    case 'flat': return 'Minus';
    default: return 'AlertCircle';
  }
}

/**
 * Calculate anomaly summary statistics
 * Useful for dashboard overview
 * 
 * @param result - Anomaly detection result
 * @returns Summary statistics
 */
export function getAnomalySummary(result: AnomalyDetectionResult) {
  const criticalCount = result.anomalies.filter(a => a.severity === 'critical').length;
  const highCount = result.anomalies.filter(a => a.severity === 'high').length;
  const mediumCount = result.anomalies.filter(a => a.severity === 'medium').length;
  const lowCount = result.anomalies.filter(a => a.severity === 'low').length;
  
  return {
    total: result.totalAnomalies,
    spikes: result.spikesCount,
    drops: result.dropsCount,
    flat: result.flatCount,
    bySeverity: {
      critical: criticalCount,
      high: highCount,
      medium: mediumCount,
      low: lowCount,
    },
    hasAnomalies: result.totalAnomalies > 0,
    hasCritical: criticalCount > 0,
  };
}