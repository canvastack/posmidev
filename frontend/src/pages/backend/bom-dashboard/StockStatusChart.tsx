import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { StockStatusSummary } from '@/types/bom';

interface StockStatusChartProps {
  data?: StockStatusSummary;
  isLoading: boolean;
}

export function StockStatusChart({ data, isLoading }: StockStatusChartProps) {
  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (!data || data.total_materials === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No data available</p>
          <p className="text-sm text-muted-foreground mt-1">Add materials to see stock status distribution</p>
        </div>
      </div>
    );
  }

  // Prepare chart data with proper colors
  const chartData = [
    {
      name: 'Normal Stock',
      value: data.normal_stock || 0,
      color: '#10b981', // success-500
      fill: '#10b981',
      total: data.total_materials,
    },
    {
      name: 'Low Stock',
      value: data.low_stock || 0,
      color: '#f59e0b', // warning-500
      fill: '#f59e0b',
      total: data.total_materials,
    },
    {
      name: 'Critical',
      value: data.critical_stock || 0,
      color: '#f43f5e', // danger-600
      fill: '#f43f5e',
      total: data.total_materials,
    },
    {
      name: 'Out of Stock',
      value: data.out_of_stock || 0,
      color: '#be123c', // danger-700
      fill: '#be123c',
      total: data.total_materials,
    },
  ].filter(item => item.value > 0); // Only show non-zero items

  const chartConfig = {
    normal: {
      label: 'Normal Stock',
      color: '#10b981',
    },
    low: {
      label: 'Low Stock',
      color: '#f59e0b',
    },
    critical: {
      label: 'Critical',
      color: '#f43f5e',
    },
    outOfStock: {
      label: 'Out of Stock',
      color: '#be123c',
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <PieChart width={445} height={300}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0];
              return (
                <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: data.payload.color }}
                    />
                    <span className="font-medium text-foreground">{data.name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Count: </span>
                    <span className="font-medium text-foreground">{data.value}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {((Number(data.value) / data.payload.total) * 100).toFixed(1)}% of total
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          iconType="circle"
          formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
        />
      </PieChart>
    </ChartContainer>
  );
}