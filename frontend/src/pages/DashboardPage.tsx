import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { useAuth } from '../hooks/useAuth';
import { dashboardApi } from '../api/dashboardApi';
import type { DashboardData } from '../types';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';

export const DashboardPage: React.FC = () => {
  const { tenantId } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!tenantId) return;
      
      try {
        const dashboardData = await dashboardApi.getDashboardData(tenantId);
        setData(dashboardData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const stats = [
    {
      name: "Today's Revenue",
      value: formatCurrency(data?.today_revenue || 0),
      icon: CurrencyDollarIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: "Today's Transactions",
      value: data?.today_transactions || 0,
      icon: ShoppingCartIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Low Stock Products',
      value: data?.low_stock_products || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back! Here's what's happening with your store today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alerts */}
      {data?.low_stock_alerts && data.low_stock_alerts.length > 0 && (
        <Card>
          <CardContent>
            <div className="flex items-center mb-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Low Stock Alerts</h3>
            </div>
            <div className="space-y-3">
              {data.low_stock_alerts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center">
                    <CubeIcon className="h-5 w-5 text-yellow-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-yellow-800">
                      {product.stock} left
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};