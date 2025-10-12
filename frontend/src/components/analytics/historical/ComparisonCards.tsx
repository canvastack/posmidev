/**
 * Comparison Cards Component
 * 
 * Phase 4A+: Historical Comparison
 * Displays side-by-side comparison of current vs previous period metrics
 * Shows variance with color-coded indicators (green for positive, red for negative)
 * 
 * Design: Uses design tokens from frontend/src/index.css
 * Compliance: Dark mode support, responsive, WCAG 2.1 AA
 */

import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';
import type { AnalyticsComparison } from '../../../types/analytics';

interface ComparisonCardsProps {
  comparison: AnalyticsComparison;
}

export function ComparisonCards({ comparison }: ComparisonCardsProps) {
  const { current, comparison: prev, variance } = comparison;

  if (!prev || !variance) {
    return null; // No comparison data available
  }

  const metrics = [
    {
      label: 'Total Revenue',
      current: `Rp ${current.total_revenue.toLocaleString('id-ID')}`,
      previous: `Rp ${prev.total_revenue.toLocaleString('id-ID')}`,
      change: variance.revenue_change,
    },
    {
      label: 'Total Transactions',
      current: current.total_transactions.toString(),
      previous: prev.total_transactions.toString(),
      change: variance.transactions_change,
    },
    {
      label: 'Average Ticket',
      current: `Rp ${current.average_ticket.toLocaleString('id-ID')}`,
      previous: `Rp ${prev.average_ticket.toLocaleString('id-ID')}`,
      change: variance.average_ticket_change,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-lg"
        >
          {/* Metric Label */}
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            {metric.label}
          </h3>
          
          <div className="space-y-3">
            {/* Current Value */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {metric.current}
              </p>
            </div>
            
            {/* Previous Value */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Previous</p>
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {metric.previous}
              </p>
            </div>
            
            {/* Variance Indicator */}
            <div className="flex items-center gap-1 pt-2 border-t border-gray-200 dark:border-gray-700">
              {getChangeIcon(metric.change)}
              <span className={getChangeColor(metric.change)}>
                {Math.abs(metric.change).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {metric.change > 0 ? 'increase' : metric.change < 0 ? 'decrease' : 'no change'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Get icon based on change direction
 */
function getChangeIcon(change: number) {
  if (change > 0) {
    return <ArrowUpIcon className="h-4 w-4 text-success-600 dark:text-success-400" />;
  } else if (change < 0) {
    return <ArrowDownIcon className="h-4 w-4 text-danger-600 dark:text-danger-400" />;
  } else {
    return <MinusIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />;
  }
}

/**
 * Get color class based on change direction
 */
function getChangeColor(change: number): string {
  if (change > 0) {
    return 'text-success-600 dark:text-success-400 font-semibold';
  } else if (change < 0) {
    return 'text-danger-600 dark:text-danger-400 font-semibold';
  } else {
    return 'text-gray-500 dark:text-gray-400';
  }
}