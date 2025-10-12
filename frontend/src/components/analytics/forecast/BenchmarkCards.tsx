/**
 * Benchmark Cards - Phase 4A+ Day 2
 * 
 * Displays performance benchmarks comparing current metrics vs baselines.
 * Shows visual progress bars and status indicators.
 * 
 * Features:
 * - Current vs baseline comparison
 * - Progress bar visualization
 * - Status indicators (Below/On Track/Above Target)
 * - Baseline type selector
 * - Dark mode support
 * - Responsive grid layout
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BenchmarkData, BenchmarkMetric, BenchmarkBaselineType } from '@/types';
import {
  getBenchmarkStatusColor,
  getBenchmarkStatusLabel,
  calculateProgressPercentage,
  getBaselineLabel,
} from '@/utils/benchmark';

interface BenchmarkCardsProps {
  benchmarkData: BenchmarkData;
  baselineType: BenchmarkBaselineType;
  onBaselineTypeChange?: (type: BenchmarkBaselineType) => void;
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
 * Format metric value based on unit
 */
function formatValue(value: number, unit?: string): string {
  if (unit === 'Rp') {
    return formatCurrency(value);
  }
  return formatNumber(value);
}

/**
 * Get variance icon based on value
 */
function getVarianceIcon(variance: number) {
  if (variance > 0) {
    return <TrendingUp className="h-5 w-5" />;
  } else if (variance < 0) {
    return <TrendingDown className="h-5 w-5" />;
  } else {
    return <Minus className="h-5 w-5" />;
  }
}

/**
 * Get variance color class
 */
function getVarianceColor(variance: number): string {
  if (variance > 0) {
    return 'text-success-600 dark:text-success-400';
  } else if (variance < 0) {
    return 'text-danger-600 dark:text-danger-400';
  } else {
    return 'text-gray-500 dark:text-gray-400';
  }
}

/**
 * Single Benchmark Card Component
 */
function BenchmarkCard({ metric }: { metric: BenchmarkMetric }) {
  const progress = calculateProgressPercentage(metric.current, metric.baseline);
  const statusColor = getBenchmarkStatusColor(metric.status);
  const statusLabel = getBenchmarkStatusLabel(metric.status);
  const varianceColor = getVarianceColor(metric.variance);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {metric.label}
        </h3>
        <div className={`flex items-center gap-1 ${varianceColor}`}>
          {getVarianceIcon(metric.variance)}
        </div>
      </div>

      {/* Current Value */}
      <div className="mb-2">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {formatValue(metric.current, metric.unit)}
        </p>
      </div>

      {/* Baseline Value */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          Baseline ({getBaselineLabel(metric.baselineType)})
        </p>
        <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
          {formatValue(metric.baseline, metric.unit)}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
          <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
            {progress.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              metric.status === 'above_target'
                ? 'bg-success-500'
                : metric.status === 'on_track'
                ? 'bg-info-500'
                : 'bg-danger-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Status & Variance */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
          <p className={`text-sm font-semibold ${statusColor}`}>
            {statusLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-gray-400">Variance</p>
          <p className={`text-sm font-semibold ${varianceColor}`}>
            {metric.variance > 0 ? '+' : ''}{metric.variance.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * BenchmarkCards Component
 */
export function BenchmarkCards({
  benchmarkData,
  baselineType,
  onBaselineTypeChange,
}: BenchmarkCardsProps) {
  const baselineOptions: Array<{ value: BenchmarkBaselineType; label: string }> = [
    { value: 'avg_7_days', label: '7-day average' },
    { value: 'avg_30_days', label: '30-day average' },
    { value: 'avg_90_days', label: '90-day average' },
    { value: 'all_time', label: 'All-time average' },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Baseline Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Performance Benchmarks
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Compare current performance against historical baselines
          </p>
        </div>

        {onBaselineTypeChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="baseline-type"
              className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap"
            >
              Baseline:
            </label>
            <select
              id="baseline-type"
              value={baselineType}
              onChange={(e) => onBaselineTypeChange(e.target.value as BenchmarkBaselineType)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            >
              {baselineOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Benchmark Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BenchmarkCard metric={benchmarkData.revenue} />
        <BenchmarkCard metric={benchmarkData.transactions} />
        <BenchmarkCard metric={benchmarkData.averageTicket} />
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          How to interpret:
        </h4>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <li className="flex items-start gap-2">
            <span className="text-success-600 dark:text-success-400 font-semibold">Above Target:</span>
            <span>Performance exceeds baseline by more than 10%</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-info-600 dark:text-info-400 font-semibold">On Track:</span>
            <span>Performance is within ±10% of baseline (normal variance)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-danger-600 dark:text-danger-400 font-semibold">Below Target:</span>
            <span>Performance is below baseline by more than 10% (needs attention)</span>
          </li>
        </ul>
      </div>
    </div>
  );
}