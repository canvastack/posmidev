/**
 * Revenue Breakdown Chart Component
 * Displays pie/donut chart showing revenue distribution across products
 */

import React from 'react';
import {
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { TopProduct } from '@/types/tenantAnalytics';

interface RevenueBreakdownChartProps {
  data: TopProduct[];
  loading?: boolean;
  limit?: number;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#00C49F',
];

export function RevenueBreakdownChart({
  data,
  loading = false,
  limit = 10,
}: RevenueBreakdownChartProps) {
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
  const topData = data.slice(0, limit);
  const chartData = topData.map((product, index) => ({
    name: product.product_name.length > 25
      ? product.product_name.substring(0, 25) + '...'
      : product.product_name,
    fullName: product.product_name,
    value: parseFloat(product.total_revenue),
    percentage: 0, // Will be calculated
    fill: COLORS[index % COLORS.length],
  }));

  // Calculate total and percentages
  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  chartData.forEach((item) => {
    item.percentage = (item.value / total) * 100;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartConfig = {
    revenue: {
      label: 'Revenue',
    },
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    // Only show label if percentage is > 5%
    if (percentage < 5) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  return (
    <ChartContainer config={chartConfig} className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props) => <CustomLabel {...props} percentage={props.percentage} />}
            outerRadius={120}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-sm">
                  <div className="font-medium text-sm mb-1">{data.fullName}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Revenue: {formatCurrency(data.value)}</div>
                    <div>Share: {data.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            content={({ payload }) => {
              if (!payload) return null;
              
              return (
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {payload.slice(0, 5).map((entry: any, index: number) => (
                    <div key={`legend-${index}`} className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {entry.payload.name}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}