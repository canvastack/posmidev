/**
 * Forecast Controls - Phase 4A+ Day 2
 * 
 * UI controls for configuring forecast parameters:
 * - Forecast period selection (7, 14, 30, 60, 90 days)
 * - Metric selection (revenue, transactions, average ticket)
 * - Refresh/recalculate button
 * 
 * Features:
 * - Dark mode support
 * - Disabled states
 * - Responsive design
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { ForecastPeriod } from '@/types';

interface ForecastControlsProps {
  forecastPeriod: ForecastPeriod;
  onPeriodChange: (period: ForecastPeriod) => void;
  metric: 'revenue' | 'transactions' | 'average_ticket';
  onMetricChange: (metric: 'revenue' | 'transactions' | 'average_ticket') => void;
  onRefresh?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

/**
 * ForecastControls Component
 */
export function ForecastControls({
  forecastPeriod,
  onPeriodChange,
  metric,
  onMetricChange,
  onRefresh,
  disabled = false,
  isLoading = false,
}: ForecastControlsProps) {
  const periodOptions: Array<{ value: ForecastPeriod; label: string }> = [
    { value: 7, label: '7 days' },
    { value: 14, label: '14 days' },
    { value: 30, label: '30 days' },
    { value: 60, label: '60 days' },
    { value: 90, label: '90 days' },
  ];

  const metricOptions: Array<{
    value: 'revenue' | 'transactions' | 'average_ticket';
    label: string;
  }> = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'transactions', label: 'Transactions' },
    { value: 'average_ticket', label: 'Average Ticket' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Forecast Period Selector */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="forecast-period"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >
          Forecast Period:
        </label>
        <select
          id="forecast-period"
          value={forecastPeriod}
          onChange={(e) => onPeriodChange(Number(e.target.value) as ForecastPeriod)}
          disabled={disabled || isLoading}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Metric Selector */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="forecast-metric"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
        >
          Metric:
        </label>
        <select
          id="forecast-metric"
          value={metric}
          onChange={(e) => onMetricChange(e.target.value as any)}
          disabled={disabled || isLoading}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {metricOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Refresh Button (if provided) */}
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={disabled || isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          title="Recalculate forecast"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {isLoading ? 'Calculating...' : 'Recalculate'}
          </span>
        </button>
      )}

      {/* Info text */}
      <div className="w-full sm:w-auto sm:ml-auto">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Predictions based on historical trends using linear regression
        </p>
      </div>
    </div>
  );
}