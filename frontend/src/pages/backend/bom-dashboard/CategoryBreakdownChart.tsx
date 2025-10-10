import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { CategorySummary } from '@/types/bom';

interface CategoryBreakdownChartProps {
  data: CategorySummary[];
  isLoading: boolean;
}

export function CategoryBreakdownChart({ data, isLoading }: CategoryBreakdownChartProps) {
  // Debug logging untuk memvalidasi asumsi
  console.log('🔍 CategoryBreakdownChart Debug:', {
    data,
    dataType: typeof data,
    isArray: Array.isArray(data),
    dataLength: data?.length,
    isLoading,
    timestamp: new Date().toISOString()
  });

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No category data available</p>
          <p className="text-sm text-muted-foreground mt-1">Add materials with categories to see breakdown</p>
        </div>
      </div>
    );
  }

  // Validasi tambahan untuk memastikan data adalah array
  if (!Array.isArray(data)) {
    console.error('❌ CategoryBreakdownChart Error: data is not an array!', { data, dataType: typeof data });
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error: Invalid data format</p>
          <p className="text-sm text-muted-foreground mt-1">Expected array but received {typeof data}</p>
        </div>
      </div>
    );
  }

  // 🛡️ SORT & NORMALIZE: Safe defaults for undefined values
  const chartData = [...data]
    .sort((a, b) => (b.total_value ?? 0) - (a.total_value ?? 0))
    .slice(0, 10)
    .map(item => ({
      category: item.category || 'Uncategorized',
      totalValue: item.total_value ?? 0,
      materialCount: item.material_count ?? 0,
      lowStockCount: item.low_stock_count ?? 0,
    }));

  const chartConfig = {
    totalValue: {
      label: 'Total Value (Rp)',
      color: '#2563eb', // primary-600
    },
    materialCount: {
      label: 'Material Count',
      color: '#0ea5e9', // info-500
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart
        width={445}
        height={300}
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis 
          dataKey="category" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
          }}
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
                  <p className="font-medium text-foreground mb-2">{data.category}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Total Value:</span>
                      <span className="font-medium text-foreground">
                        Rp {(data.totalValue ?? 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Materials:</span>
                      <span className="font-medium text-foreground">{data.materialCount ?? 0}</span>
                    </div>
                    {(data.lowStockCount ?? 0) > 0 && (
                      <div className="flex justify-between gap-4">
                        <span className="text-warning-600">Low Stock:</span>
                        <span className="font-medium text-warning-600">{data.lowStockCount ?? 0}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend 
          verticalAlign="top" 
          height={36}
          formatter={(value) => {
            if (value === 'totalValue') return 'Total Value';
            if (value === 'materialCount') return 'Material Count';
            return value;
          }}
        />
        <Bar 
          dataKey="totalValue" 
          fill="#2563eb" 
          radius={[8, 8, 0, 0]}
          name="Total Value"
        />
      </BarChart>
    </ChartContainer>
  );
}