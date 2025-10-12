/**
 * Trend Forecast Chart - Phase 4A+ Day 2 & Day 3
 * 
 * Displays historical sales trends + forecasted values with confidence intervals.
 * Enhanced Day 3: Anomaly markers on chart
 * Uses recharts library for visualization.
 * 
 * Features:
 * - Historical data (solid blue line)
 * - Forecast data (dashed orange line)
 * - Confidence interval (shaded area)
 * - Anomaly markers (Day 3)
 * - Interactive tooltips
 * - Legend with R² value
 * - Dark mode support
 */

import React from 'react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ScatterChart,
  ComposedChart,
} from 'recharts';
import type { ForecastResult, Anomaly } from '@/types';

interface TrendForecastChartProps {
  forecastResult: ForecastResult;
  anomalies?: Anomaly[]; // Day 3: Optional anomaly data
  height?: number;
}

/**
 * Combined data point for chart
 */
interface ChartDataPoint {
  date: string;
  historical?: number;
  forecast?: number;
  lower?: number;
  upper?: number;
  anomalySpike?: number; // Day 3: Spike anomaly marker
  anomalyDrop?: number; // Day 3: Drop anomaly marker
}

/**
 * Format currency for Indonesian locale
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format number with commas
 */
function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(value));
}

/**
 * Custom tooltip component
 */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const isRevenue = payload[0]?.payload?.historical >= 1000 || payload[0]?.payload?.forecast >= 1000;
  const formatter = isRevenue ? formatCurrency : formatNumber;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
        {label}
      </p>
      {payload.map((entry: any, index: number) => {
        if (entry.dataKey === 'lower' || entry.dataKey === 'upper') return null;
        
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700 dark:text-gray-300">
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatter(entry.value)}
            </span>
          </div>
        );
      })}
      
      {payload[0]?.payload?.lower !== undefined && payload[0]?.payload?.upper !== undefined && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            95% Confidence Interval
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300">
            {formatter(payload[0].payload.lower)} - {formatter(payload[0].payload.upper)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * TrendForecastChart Component
 */
export function TrendForecastChart({ forecastResult, anomalies = [], height = 400 }: TrendForecastChartProps) {
  // Combine historical and forecast data
  const chartData: ChartDataPoint[] = [];

  // Add historical data
  forecastResult.historical.forEach((item) => {
    const dataPoint: ChartDataPoint = {
      date: item.date,
      historical: item[forecastResult.metric],
    };
    
    // Day 3: Add anomaly markers if present
    if (anomalies && anomalies.length > 0) {
      const anomaly = anomalies.find(a => a.date === item.date);
      if (anomaly) {
        if (anomaly.type === 'spike') {
          dataPoint.anomalySpike = item[forecastResult.metric];
        } else if (anomaly.type === 'drop') {
          dataPoint.anomalyDrop = item[forecastResult.metric];
        }
      }
    }
    
    chartData.push(dataPoint);
  });

  // Add forecast data
  forecastResult.forecast.forEach((item) => {
    chartData.push({
      date: item.date,
      forecast: item.value,
      lower: item.lower,
      upper: item.upper,
    });
  });

  // Get metric label
  const metricLabels = {
    revenue: 'Revenue',
    transactions: 'Transactions',
    average_ticket: 'Average Ticket',
  };

  const metricLabel = metricLabels[forecastResult.metric];
  
  // Determine if values are currency or numbers
  const isCurrency = forecastResult.metric === 'revenue' || forecastResult.metric === 'average_ticket';
  const formatter = isCurrency ? formatCurrency : formatNumber;

  // R² confidence indicator
  const confidenceLevel = 
    forecastResult.rSquared >= 0.7 ? 'High' :
    forecastResult.rSquared >= 0.4 ? 'Medium' : 'Low';

  const confidenceColor =
    forecastResult.rSquared >= 0.7 ? 'text-success-600 dark:text-success-400' :
    forecastResult.rSquared >= 0.4 ? 'text-warning-600 dark:text-warning-400' :
    'text-danger-600 dark:text-danger-400';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {metricLabel} Forecast
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Historical data + {forecastResult.forecast.length} days prediction
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Forecast Confidence
          </p>
          <p className={`text-lg font-semibold ${confidenceColor}`}>
            {confidenceLevel} (R² = {forecastResult.rSquared.toFixed(3)})
          </p>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
          <XAxis
            dataKey="date"
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getDate()}/${date.getMonth() + 1}`;
            }}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => {
              if (isCurrency) {
                return `Rp ${(value / 1000000).toFixed(1)}M`;
              }
              return formatNumber(value);
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />

          {/* Reference line at the boundary */}
          <ReferenceLine
            x={forecastResult.historical[forecastResult.historical.length - 1]?.date}
            stroke="rgb(156 163 175)"
            strokeDasharray="3 3"
            label={{
              value: 'Forecast Start',
              position: 'top',
              fill: 'rgb(107 114 128)',
              fontSize: 12,
            }}
          />

          {/* Confidence interval (shaded area) */}
          <Area
            type="monotone"
            dataKey="upper"
            stroke="none"
            fill="rgb(251 146 60)"
            fillOpacity={0.1}
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="lower"
            stroke="none"
            fill="rgb(251 146 60)"
            fillOpacity={0.1}
            connectNulls
          />

          {/* Historical line */}
          <Line
            type="monotone"
            dataKey="historical"
            name={`Historical ${metricLabel}`}
            stroke="rgb(59 130 246)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />

          {/* Forecast line */}
          <Line
            type="monotone"
            dataKey="forecast"
            name={`Forecasted ${metricLabel}`}
            stroke="rgb(251 146 60)"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 3, fill: 'rgb(251 146 60)' }}
            activeDot={{ r: 5 }}
            connectNulls
          />
          
          {/* Day 3: Anomaly markers - Spikes (green) */}
          {anomalies && anomalies.length > 0 && (
            <Scatter
              dataKey="anomalySpike"
              name="Spike Anomaly"
              fill="rgb(16 185 129)"
              shape="circle"
              r={6}
            />
          )}
          
          {/* Day 3: Anomaly markers - Drops (red) */}
          {anomalies && anomalies.length > 0 && (
            <Scatter
              dataKey="anomalyDrop"
              name="Drop Anomaly"
              fill="rgb(244 63 94)"
              shape="circle"
              r={6}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Footer Info */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>How to read:</strong> The blue solid line shows actual historical {metricLabel.toLowerCase()}.
          The orange dashed line predicts future values based on linear regression.
          The shaded area represents the 95% confidence interval.
          {forecastResult.rSquared < 0.5 && (
            <span className="text-warning-600 dark:text-warning-400">
              {' '}Note: Low R² suggests data may not follow a clear linear trend.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}