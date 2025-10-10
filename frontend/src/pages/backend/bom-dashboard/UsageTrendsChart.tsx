import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';
import type { UsageTrend } from '@/types/bom';
import { format, parseISO } from 'date-fns';

interface UsageTrendsChartProps {
  data: UsageTrend[];
  isLoading: boolean;
}

export function UsageTrendsChart({ data, isLoading }: UsageTrendsChartProps) {
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
          <p className="text-muted-foreground">No usage data available</p>
          <p className="text-sm text-muted-foreground mt-1">Material transactions will appear here</p>
        </div>
      </div>
    );
  }

  // 🛡️ FORMAT & NORMALIZE: Safe defaults for undefined values
  const chartData = data.map(item => ({
    date: format(parseISO(item.date), 'MMM dd'),
    fullDate: format(parseISO(item.date), 'MMMM dd, yyyy'),
    totalUsage: item.total_usage ?? 0,
    totalCost: item.total_cost ?? 0,
    transactionCount: item.transaction_count ?? 0,
  }));

  const chartConfig = {
    totalUsage: {
      label: 'Total Usage',
      color: '#0ea5e9', // info-500
    },
    totalCost: {
      label: 'Total Cost (Rp)',
      color: '#d97706', // warning-600
    },
    transactionCount: {
      label: 'Transactions',
      color: '#10b981', // success-500
    },
  };

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart
        width={900}
        height={300}
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <YAxis 
          yAxisId="left"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={(value) => {
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
          }}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          className="text-xs"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip 
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload;
              return (
                <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
                  <p className="font-medium text-foreground mb-2">{data.fullDate}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-info-500" />
                        <span className="text-muted-foreground">Usage:</span>
                      </div>
                      <span className="font-medium text-foreground">
                        {(data.totalUsage ?? 0).toLocaleString()} units
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-warning-600" />
                        <span className="text-muted-foreground">Cost:</span>
                      </div>
                      <span className="font-medium text-foreground">
                        Rp {(data.totalCost ?? 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-success-500" />
                        <span className="text-muted-foreground">Transactions:</span>
                      </div>
                      <span className="font-medium text-foreground">{data.transactionCount ?? 0}</span>
                    </div>
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
            if (value === 'totalUsage') return 'Total Usage';
            if (value === 'totalCost') return 'Total Cost (Rp)';
            if (value === 'transactionCount') return 'Transactions';
            return value;
          }}
        />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="totalUsage" 
          stroke="#0ea5e9" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Total Usage"
        />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="totalCost" 
          stroke="#d97706" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Total Cost"
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="transactionCount" 
          stroke="#10b981" 
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name="Transactions"
        />
      </LineChart>
    </ChartContainer>
  );
}