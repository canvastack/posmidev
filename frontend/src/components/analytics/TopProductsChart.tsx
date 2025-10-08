/**
 * Top Products Chart Component
 * Displays horizontal bar chart of top products by selected metric
 */

import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { TopProduct } from '@/types/tenantAnalytics';

interface TopProductsChartProps {
  data: TopProduct[];
  loading?: boolean;
  metric?: 'revenue' | 'quantity' | 'profit';
  limit?: number;
}

export function TopProductsChart({
  data,
  loading = false,
  metric = 'revenue',
  limit = 10,
}: TopProductsChartProps) {
  if (loading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-sm text-muted-foreground">No data available</div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.slice(0, limit).map((product) => ({
    name: product.product_name.length > 20
      ? product.product_name.substring(0, 20) + '...'
      : product.product_name,
    fullName: product.product_name,
    revenue: parseFloat(product.total_revenue),
    quantity: product.total_quantity,
    profit: parseFloat(product.total_profit || '0'),
  }));

  // Sort by selected metric (descending)
  chartData.sort((a, b) => b[metric] - a[metric]);

  const formatValue = (value: number) => {
    if (metric === 'quantity') {
      return new Intl.NumberFormat('id-ID').format(value);
    }
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartConfig = {
    [metric]: {
      label: metric === 'revenue' ? 'Revenue' : metric === 'quantity' ? 'Quantity Sold' : 'Profit',
      color: 'hsl(var(--chart-1))',
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            tickFormatter={formatValue}
            className="text-xs"
          />
          <YAxis
            dataKey="name"
            type="category"
            width={150}
            className="text-xs"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <div className="font-medium text-sm mb-1">{data.fullName}</div>
                  <div className="text-xs text-muted-foreground">
                    {metric === 'revenue' && `Revenue: ${formatValue(data.revenue)}`}
                    {metric === 'quantity' && `Quantity: ${formatValue(data.quantity)}`}
                    {metric === 'profit' && `Profit: ${formatValue(data.profit)}`}
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey={metric}
            fill="hsl(var(--chart-1))"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}