import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { CubeIcon, CurrencyDollarIcon, ExclamationTriangleIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import type { ProductStats } from '@/api/productApi';

interface ProductStatsCardsProps {
  stats: ProductStats | null;
  loading: boolean;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const ProductStatsCards: React.FC<ProductStatsCardsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-24 bg-muted/50 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statsConfig = [
    {
      id: 'total',
      title: 'Total Products',
      value: stats.total_products || 0,
      icon: CubeIcon,
      bgColor: 'bg-primary-50 dark:bg-primary-900/20',
      iconColor: 'text-primary-600 dark:text-primary-400',
      format: (v: number) => v.toLocaleString(),
    },
    {
      id: 'value',
      title: 'Total Value',
      value: stats.total_value || 0,
      icon: CurrencyDollarIcon,
      bgColor: 'bg-success-50 dark:bg-success-900/20',
      iconColor: 'text-success-600 dark:text-success-400',
      format: (v: number) => formatCurrency(v),
    },
    {
      id: 'low',
      title: 'Low Stock Items',
      value: stats.low_stock_count || 0,
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-warning-50 dark:bg-warning-900/20',
      iconColor: 'text-warning-600 dark:text-warning-400',
      format: (v: number) => v.toLocaleString(),
    },
    {
      id: 'avg',
      title: 'Avg. Price',
      value: stats.average_price || 0,
      icon: ChartBarIcon,
      bgColor: 'bg-info-50 dark:bg-info-900/20',
      iconColor: 'text-info-600 dark:text-info-400',
      format: (v: number) => formatCurrency(v),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statsConfig.map((stat) => (
        <Card key={stat.id} className="transition-all duration-200 hover:shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.format(stat.value)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};