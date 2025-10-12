/**
 * Forecast Utility - Phase 4A+ Day 2
 * 
 * Implements linear regression for sales forecasting.
 * Uses least squares method to predict future trends.
 * 
 * Algorithm:
 * 1. Convert dates to numeric x-values (days since start)
 * 2. Calculate linear regression: y = mx + b
 * 3. Generate predictions for future dates
 * 4. Calculate confidence intervals based on standard error
 */

import type { SalesTrend, ForecastPoint, ForecastResult, ForecastPeriod } from '@/types';

/**
 * Calculate linear regression from sales trend data
 * 
 * Uses least squares method to find best-fit line
 * 
 * @param data - Historical sales trend data
 * @param metric - Which metric to forecast (revenue, transactions, average_ticket)
 * @returns Regression coefficients (slope, intercept, r-squared)
 */
export function calculateLinearRegression(
  data: SalesTrend[],
  metric: 'revenue' | 'transactions' | 'average_ticket'
): {
  slope: number;
  intercept: number;
  rSquared: number;
} {
  if (data.length < 2) {
    throw new Error('At least 2 data points required for linear regression');
  }

  const n = data.length;
  
  // Convert dates to numeric x-values (index from 0)
  const xValues = data.map((_, index) => index);
  const yValues = data.map(item => item[metric]);

  // Calculate means
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

  // Calculate slope (m) and intercept (b)
  // Slope: m = Σ((x - x̄)(y - ȳ)) / Σ((x - x̄)²)
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate R-squared (coefficient of determination)
  // R² = 1 - (SS_res / SS_tot)
  let ssRes = 0; // Sum of squares of residuals
  let ssTot = 0; // Total sum of squares

  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    const residual = yValues[i] - predicted;
    ssRes += residual * residual;
    
    const totalDiff = yValues[i] - yMean;
    ssTot += totalDiff * totalDiff;
  }

  const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

  return {
    slope,
    intercept,
    rSquared: Math.max(0, Math.min(1, rSquared)), // Clamp between 0 and 1
  };
}

/**
 * Calculate standard error for confidence intervals
 * 
 * @param data - Historical data
 * @param metric - Metric being forecasted
 * @param slope - Regression slope
 * @param intercept - Regression intercept
 * @returns Standard error
 */
function calculateStandardError(
  data: SalesTrend[],
  metric: 'revenue' | 'transactions' | 'average_ticket',
  slope: number,
  intercept: number
): number {
  const n = data.length;
  
  if (n <= 2) {
    return 0;
  }

  let sumSquaredErrors = 0;

  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    const actual = data[i][metric];
    const error = actual - predicted;
    sumSquaredErrors += error * error;
  }

  // Standard error: sqrt(Σ(y - ŷ)² / (n - 2))
  return Math.sqrt(sumSquaredErrors / (n - 2));
}

/**
 * Add days to a date string (YYYY-MM-DD)
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @param days - Number of days to add
 * @returns New date string
 */
function addDays(dateString: string, days: number): string {
  if (!dateString) {
    throw new Error('Invalid date string: date is empty or undefined');
  }

  const date = new Date(dateString + 'T00:00:00Z');
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }

  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Generate forecast for future dates
 * 
 * @param data - Historical sales trend data (minimum 7 days recommended)
 * @param metric - Which metric to forecast
 * @param daysAhead - Number of days to forecast (7, 14, 30, 60, 90)
 * @param confidenceLevel - Confidence level for intervals (default: 1.96 for 95%)
 * @returns Forecast result with predictions and confidence intervals, or null if insufficient data
 */
export function generateForecast(
  data: SalesTrend[],
  metric: 'revenue' | 'transactions' | 'average_ticket',
  daysAhead: ForecastPeriod = 30,
  confidenceLevel: number = 1.96 // 95% confidence (z-score)
): ForecastResult | null {
  // Return null if initial data is insufficient (graceful degradation)
  if (data.length < 2) {
    return null;
  }

  // Sort data by date (ascending) and filter out invalid dates
  const sortedData = [...data]
    .filter(item => {
      if (!item.date) return false;
      const date = new Date(item.date);
      return !isNaN(date.getTime());
    })
    .sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

  // Return null if insufficient valid data after filtering (graceful degradation)
  if (sortedData.length < 2) {
    return null;
  }

  // Calculate regression
  const { slope, intercept, rSquared } = calculateLinearRegression(sortedData, metric);

  // Calculate standard error for confidence intervals
  const standardError = calculateStandardError(sortedData, metric, slope, intercept);

  // Get last date in dataset
  const lastDate = sortedData[sortedData.length - 1].date;
  const startIndex = sortedData.length;

  // Generate forecast points
  const forecast: ForecastPoint[] = [];

  for (let i = 1; i <= daysAhead; i++) {
    const xValue = startIndex + i - 1;
    const predictedValue = slope * xValue + intercept;
    
    // Calculate margin of error (increases with distance from data)
    // Margin = z * SE * sqrt(1 + 1/n + (x - x̄)² / Σ(x - x̄)²)
    // Simplified: margin increases with distance
    const distanceFactor = Math.sqrt(1 + i / sortedData.length);
    const marginOfError = confidenceLevel * standardError * distanceFactor;

    const forecastDate = addDays(lastDate, i);

    forecast.push({
      date: forecastDate,
      value: Math.max(0, predictedValue), // No negative values
      lower: Math.max(0, predictedValue - marginOfError),
      upper: Math.max(0, predictedValue + marginOfError),
      isForecasted: true,
    });
  }

  return {
    historical: sortedData,
    forecast,
    metric,
    rSquared,
    slope,
    intercept,
  };
}

/**
 * Check if forecast is reliable
 * 
 * @param forecastResult - Result from generateForecast
 * @returns Reliability assessment
 */
export function assessForecastReliability(forecastResult: ForecastResult): {
  isReliable: boolean;
  confidence: 'low' | 'medium' | 'high';
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check data quantity
  if (forecastResult.historical.length < 7) {
    warnings.push('Limited historical data (less than 7 days). Forecast may be unreliable.');
  }

  // Check R-squared
  let confidence: 'low' | 'medium' | 'high' = 'high';
  
  if (forecastResult.rSquared < 0.3) {
    confidence = 'low';
    warnings.push('Low R² value indicates poor fit. Data may not follow linear trend.');
  } else if (forecastResult.rSquared < 0.7) {
    confidence = 'medium';
    warnings.push('Moderate R² value. Forecast has moderate accuracy.');
  }

  // Check for negative slope with revenue (unusual)
  if (forecastResult.metric === 'revenue' && forecastResult.slope < 0) {
    warnings.push('Declining trend detected. Review business conditions.');
  }

  const isReliable = warnings.length < 2 && forecastResult.rSquared >= 0.3;

  return {
    isReliable,
    confidence,
    warnings,
  };
}