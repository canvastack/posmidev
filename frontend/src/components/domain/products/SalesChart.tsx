/**
 * SalesChart Component
 * 
 * Line chart visualization for product sales trends over time.
 * Displays revenue and quantity sold with dual Y-axis support.
 * 
 * Features:
 * - Dual Y-axis (revenue on left, quantity on right)
 * - Responsive design
 * - Dark mode support
 * - Tooltip with formatted values
 * - Gradient fill
 * - Empty state handling
 * 
 * @example
 * ```tsx
 * <SalesChart
 *   data={salesMetrics.sales_trend}
 *   loading={loading}
 * />
 * ```
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { SalesTrendData } from '../../../types/analytics';

interface SalesChartProps {
  data: SalesTrendData[];
  loading?: boolean;
  height?: number;
}

export const SalesChart: React.FC<SalesChartProps> = ({
  data,
  loading = false,
  height = 300,
}) => {
  /**
   * Format date for X-axis
   */
  const formatDate = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'dd MMM', { locale: idLocale });
    } catch {
      return dateString;
    }
  };
  
  /**
   * Format currency for tooltip
   */
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  /**
   * Format number for tooltip
   */
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('id-ID').format(value);
  };
  
  /**
   * Custom tooltip
   */
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    
    return (
      <div className="glass-card p-3 shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
          {formatDate(label)}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {entry.dataKey === 'revenue'
                ? formatCurrency(entry.value)
                : formatNumber(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };
  
  /**
   * Loading state
   */
  if (loading) {
    return (
      <div className="w-full animate-pulse" style={{ height }}>
        <div className="h-full bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
      </div>
    );
  }
  
  /**
   * Empty state
   */
  if (!data || data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400"
        style={{ height }}
      >
        <svg
          className="w-16 h-16 mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-sm font-medium">No sales data available</p>
        <p className="text-xs mt-1">Sales data will appear here once orders are placed</p>
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
          </linearGradient>
        </defs>
        
        <CartesianGrid
          strokeDasharray="3 3"
          className="stroke-gray-200 dark:stroke-gray-700"
        />
        
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          className="text-xs text-gray-600 dark:text-gray-400"
        />
        
        <YAxis
          yAxisId="left"
          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          className="text-xs text-gray-600 dark:text-gray-400"
        />
        
        <YAxis
          yAxisId="right"
          orientation="right"
          className="text-xs text-gray-600 dark:text-gray-400"
        />
        
        <Tooltip content={<CustomTooltip />} />
        
        <Legend
          wrapperStyle={{
            paddingTop: '10px',
          }}
          iconType="line"
        />
        
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#colorRevenue)"
          name="Revenue"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="quantity"
          stroke="hsl(var(--chart-2))"
          strokeWidth={2}
          fill="url(#colorQuantity)"
          name="Quantity Sold"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default SalesChart;