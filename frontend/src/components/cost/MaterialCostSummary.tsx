/**
 * Material Cost Summary Component
 * Phase 4A Day 5: Material Cost Tracking
 * 
 * Displays overall cart cost summary including:
 * - Total material cost
 * - Total revenue
 * - Total profit
 * - Overall profit margin
 * 
 * Design:
 * - Clean card layout with iconography
 * - Color-coded profit margin
 * - Fully responsive and dark mode compatible
 */

import { DollarSign, TrendingUp, Package, Receipt } from 'lucide-react';
import { ProfitMarginIndicator } from './ProfitMarginIndicator';
import type { CostSummary } from '@/types';

interface MaterialCostSummaryProps {
  summary: CostSummary;
  currency?: string;
}

export function MaterialCostSummary({ summary, currency = 'Rp' }: MaterialCostSummaryProps) {
  const formatCurrency = (amount: number) => {
    return `${currency} ${amount.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <Receipt className="h-4 w-4" />
        Cost Summary
      </h3>

      <div className="space-y-2">
        {/* Total Cost */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Package className="h-4 w-4" />
            <span>Material Cost</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(summary.total_cost)}
          </span>
        </div>

        {/* Total Revenue */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <DollarSign className="h-4 w-4" />
            <span>Revenue</span>
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(summary.total_revenue)}
          </span>
        </div>

        {/* Total Profit */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
            <TrendingUp className="h-4 w-4" />
            <span>Profit</span>
          </div>
          <span className="text-sm font-bold text-success-600 dark:text-success-400">
            {formatCurrency(summary.total_profit)}
          </span>
        </div>

        {/* Profit Margin */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Margin</span>
          <ProfitMarginIndicator margin={summary.overall_profit_margin} size="md" />
        </div>
      </div>
    </div>
  );
}