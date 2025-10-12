/**
 * Sales Trend Chart Component (Phase 4A Day 4)
 * 
 * Line/Bar chart for displaying sales trends over time
 * Uses recharts library for visualization
 * 
 * Design: Follows design tokens from index.css
 * Dark mode: Full support via Tailwind dark: prefix and recharts theming
 * Responsive: Adapts to container width
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { SalesTrend, TrendPeriod } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import { CalendarIcon } from 'lucide-react';

export interface SalesTrendChartProps {
  data: SalesTrend[];
  period: TrendPeriod;
  type?: 'line' | 'bar';
  metric?: 'revenue' | 'transactions' | 'both';
  isLoading?: boolean;
  height?: number;
}

/**
 * Custom Tooltip for Chart
 */
const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {label}
      </p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {entry.name?.includes('Revenue')
              ? formatCurrency(entry.value as number)
              : (entry.value as number).toLocaleString('id-ID')}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Sales Trend Chart
 * 
 * Displays sales trends over time using line or bar chart
 */
export default function SalesTrendChart({
  data,
  period,
  type = 'line',
  metric = 'both',
  isLoading = false,
  height = 300,
}: SalesTrendChartProps) {
  /**
   * Format date label based on period
   */
  const formatDateLabel = (dateStr: string): string => {
    if (period === 'day') {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
    }
    if (period === 'week') {
      return dateStr; // Already formatted as "2025-W01"
    }
    if (period === 'month') {
      const date = new Date(dateStr + '-01');
      return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    }
    return dateStr;
  };

  /**
   * Transform data for chart
   */
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: formatDateLabel(item.date),
      revenue: item.revenue,
      transactions: item.transactions,
      avgTicket: item.average_ticket,
    }));
  }, [data, period]);

  /**
   * Chart colors (design token compliant)
   */
  const colors = {
    revenue: '#10b981', // success-500
    transactions: '#3b82f6', // primary-500
    avgTicket: '#f59e0b', // warning-500
  };

  /**
   * Loading State
   */
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <CalendarIcon className="h-5 w-5 text-gray-400 dark:text-gray-600" />
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        </div>
        <div className="h-64 bg-gray-100 dark:bg-gray-900 animate-pulse rounded" />
      </div>
    );
  }

  /**
   * Empty State
   */
  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          Sales Trends
        </h3>
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <p className="text-sm">No sales data available for this period</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Chart Component Selection
   */
  const ChartComponent = type === 'bar' ? BarChart : LineChart;
  const DataComponent = type === 'bar' ? Bar : Line;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
        Sales Trends
      </h3>

      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            stroke="#9ca3af"
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: '#6b7280', fontSize: 12 }}
            stroke="#9ca3af"
            tickFormatter={(value) => {
              if (metric === 'revenue' || metric === 'both') {
                return `${(value / 1000000).toFixed(1)}M`;
              }
              return value.toString();
            }}
          />
          {(metric === 'both' || metric === 'transactions') && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#9ca3af"
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="circle"
          />

          {/* Revenue Line/Bar */}
          {(metric === 'revenue' || metric === 'both') && (
            <DataComponent
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              stroke={colors.revenue}
              fill={colors.revenue}
              strokeWidth={type === 'line' ? 2 : 0}
              name="Revenue (Rp)"
              dot={type === 'line' ? { fill: colors.revenue, strokeWidth: 2, r: 4 } : false}
              activeDot={type === 'line' ? { r: 6 } : false}
            />
          )}

          {/* Transactions Line/Bar */}
          {(metric === 'transactions' || metric === 'both') && (
            <DataComponent
              yAxisId={metric === 'both' ? 'right' : 'left'}
              type="monotone"
              dataKey="transactions"
              stroke={colors.transactions}
              fill={colors.transactions}
              strokeWidth={type === 'line' ? 2 : 0}
              name="Transactions"
              dot={type === 'line' ? { fill: colors.transactions, strokeWidth: 2, r: 4 } : false}
              activeDot={type === 'line' ? { r: 6 } : false}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}