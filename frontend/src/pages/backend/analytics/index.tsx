/**
 * Tenant Analytics Dashboard
 * Phase 10: Analytics & Reporting
 * 
 * Provides comprehensive analytics and insights for tenant business performance:
 * - Revenue and profit overview
 * - Top performing products
 * - Product views analytics
 * - Search behavior insights
 * - Category performance breakdown
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useTenantAnalytics } from '@/hooks/useTenantAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TopProductsChart } from '@/components/analytics/TopProductsChart';
import { RevenueBreakdownChart } from '@/components/analytics/RevenueBreakdownChart';
import { MostViewedTable } from '@/components/analytics/MostViewedTable';
import { PopularSearchesTable } from '@/components/analytics/PopularSearchesTable';
import { TopProductsTable } from '@/components/analytics/TopProductsTable';
import type { AnalyticsPeriod } from '@/types/tenantAnalytics';

export default function TenantAnalyticsDashboard() {
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  // Analytics hook with auto-fetch
  const {
    overview,
    topProducts,
    mostViewed,
    popularSearches,
    loading,
    error,
    currentPeriod,
    setPresetPeriod,
    refresh,
  } = useTenantAnalytics(tenantId || '', {
    autoFetch: true,
    defaultPeriod: 'last_30_days',
  });

  // Check permissions
  const canView = hasPermission('products.view');

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-sm text-muted-foreground">
              You don't have permission to view analytics.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your business performance and insights
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Period Selector */}
          <Select
            value="last_30_days"
            onValueChange={(value) => {
              if (value !== 'custom') {
                setPresetPeriod(value as any);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <CalendarIcon className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_90_days">Last 90 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={loading}
            className="cursor-pointer"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Export Button (Placeholder) */}
          <Button variant="outline" className="cursor-pointer">
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">
              Failed to load analytics data. Please try refreshing.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue Card */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-success-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(overview?.summary.total_revenue || 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Orders Card */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBagIcon className="h-4 w-4 text-info-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.summary.total_orders || 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Product Views Card */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Product Views</CardTitle>
            <EyeIcon className="h-4 w-4 text-accent-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.recent_views || 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Searches Card */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Queries</CardTitle>
            <MagnifyingGlassIcon className="h-4 w-4 text-warning-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.recent_searches || 0)}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different analytics views */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="views">Views</TabsTrigger>
          <TabsTrigger value="searches">Searches</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Products Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Top Products by Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <TopProductsChart
                  data={topProducts}
                  loading={loading}
                  metric="revenue"
                />
              </CardContent>
            </Card>

            {/* Revenue Breakdown Chart */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueBreakdownChart
                  data={topProducts}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </div>

          {/* Top Products Table */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Top 10 Products</CardTitle>
            </CardHeader>
            <CardContent>
              <TopProductsTable
                data={topProducts}
                loading={loading}
                onProductClick={(productId) => {
                  window.location.href = `/admin/products/${productId}`;
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <TopProductsTable
            data={topProducts}
            loading={loading}
            onProductClick={(productId) => {
              window.location.href = `/admin/products/${productId}`;
            }}
          />
        </TabsContent>

        {/* Views Tab */}
        <TabsContent value="views" className="space-y-4">
          <MostViewedTable
            data={mostViewed}
            loading={loading}
            onProductClick={(productId) => {
              window.location.href = `/admin/products/${productId}`;
            }}
          />
        </TabsContent>

        {/* Searches Tab */}
        <TabsContent value="searches" className="space-y-4">
          <PopularSearchesTable
            data={popularSearches}
            loading={loading}
            onSearchClick={(term: any) => {
              window.location.href = `/admin/products?search=${encodeURIComponent(term)}`;
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}