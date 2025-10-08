/**
 * StockMovementChart Component
 * 
 * Bar chart visualization for stock movements (in/out/adjustments) over time.
 * Differentiates between different adjustment types with color coding.
 * 
 * Features:
 * - Stacked bar chart for different adjustment types
 * - Color-coded by type (in=green, out=red, adjustment=blue)
 * - Responsive design
 * - Dark mode support
 * - Tooltip with formatted values
 * - Empty state handling
 * 
 * @example
 * ```tsx
 * <StockMovementChart
 *   data={stockMetrics.stock_movements}
 *   loading={loading}
 * />
 * ```
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { StockMovement } from '../../../types/analytics';

interface StockMovementChartProps {
  data: StockMovement[];
  loading?: boolean;
  height?: number;
}

export const StockMovementChart: React.FC<StockMovementChartProps> = ({
  data,
  loading = false,
  height = 300,
}) => {
  /**
   * Transform data for stacked bar chart
   * Group by date and split by adjustment type
   */
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Group by date
    const grouped = data.reduce((acc, item) => {
      const date = item.date;
      
      if (!acc[date]) {
        acc[date] = {
          date,
          in: 0,
          out: 0,
          adjustment: 0,
          return: 0,
          damage: 0,
        };
      }
      
      // Map adjustment types to chart categories
      switch (item.adjustment_type) {
        case 'in':
          acc[date].in += item.total_change;
          break;
        case 'out':
          acc[date].out += Math.abs(item.total_change); // Make positive for display
          break;
        case 'return':
          acc[date].return += item.total_change;
          break;
        case 'damage':
          acc[date].damage += Math.abs(item.total_change);
          break;
        case 'adjustment':
        default:
          acc[date].adjustment += item.total_change;
          break;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    // Convert to array and sort by date
    return Object.values(grouped).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [data]);
  
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
        {payload.map((entry: any, index: number) => {
          if (entry.value === 0) return null;
          
          return (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                {entry.name}:
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatNumber(entry.value)} units
              </span>
            </div>
          );
        })}
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
  if (!chartData || chartData.length === 0) {
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
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        <p className="text-sm font-medium">No stock movements recorded</p>
        <p className="text-xs mt-1">Stock adjustments will appear here</p>
      </div>
    );
  }
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
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
          className="text-xs text-gray-600 dark:text-gray-400"
        />
        
        <Tooltip content={<CustomTooltip />} />
        
        <Legend
          wrapperStyle={{
            paddingTop: '10px',
          }}
        />
        
        <Bar
          dataKey="in"
          stackId="a"
          fill="hsl(var(--chart-2))"
          name="Stock In"
          radius={[0, 0, 0, 0]}
        />
        
        <Bar
          dataKey="return"
          stackId="a"
          fill="hsl(var(--chart-3))"
          name="Returns"
          radius={[0, 0, 0, 0]}
        />
        
        <Bar
          dataKey="out"
          stackId="b"
          fill="hsl(var(--chart-1))"
          name="Stock Out"
          radius={[0, 0, 0, 0]}
        />
        
        <Bar
          dataKey="damage"
          stackId="b"
          fill="hsl(var(--chart-4))"
          name="Damaged"
          radius={[0, 0, 0, 0]}
        />
        
        <Bar
          dataKey="adjustment"
          stackId="c"
          fill="hsl(var(--chart-5))"
          name="Adjustments"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default StockMovementChart;