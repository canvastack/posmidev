import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { bomApi } from '@/api/bomApi';
import { useAuth } from '@/hooks/useAuth';
import { StockStatusChart } from './StockStatusChart';
import { CategoryBreakdownChart } from './CategoryBreakdownChart';
import { UsageTrendsChart } from './UsageTrendsChart';
import { AlertsList } from './AlertsList';
import { ReorderRecommendationsTable } from './ReorderRecommendationsTable';

export function BOMDashboardPage() {
  const { tenantId } = useAuth();
  const [usageTrendsDays, setUsageTrendsDays] = useState(7);

  // Validasi tenantId
  if (!tenantId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Authentication Error</h2>
          <p className="text-muted-foreground">Unable to determine tenant. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  // Fetch Analytics Data with lazy loading and staleTime
  const { data: stockStatus, isLoading: loadingStock, refetch: refetchStock, isFetching: fetchingStock } = useQuery({
    queryKey: ['bom-stock-status', tenantId],
    queryFn: () => bomApi.analytics.getStockStatus(tenantId),
    enabled: !!tenantId,
    staleTime: 60000, // 1 minute
    retry: 2,
  });

  const { data: categories, isLoading: loadingCategories, refetch: refetchCategories, isFetching: fetchingCategories } = useQuery({
    queryKey: ['bom-categories', tenantId],
    queryFn: async () => {
      const response = await bomApi.analytics.getCategories(tenantId);
      console.log('🔍 Categories API Response:', {
        response,
        dataType: typeof response?.data,
        isArray: Array.isArray(response?.data),
        dataLength: response?.data?.length,
        timestamp: new Date().toISOString()
      });
      return response;
    },
    enabled: !!tenantId,
    staleTime: 60000,
    retry: 2,
  });

  const { data: usageTrends, isLoading: loadingTrends, refetch: refetchTrends, isFetching: fetchingTrends } = useQuery({
    queryKey: ['bom-usage-trends', tenantId, usageTrendsDays],
    queryFn: () => bomApi.analytics.getUsageTrends(tenantId, usageTrendsDays),
    enabled: !!tenantId,
    staleTime: 60000,
    retry: 2,
  });

  // Fetch Alerts Data
  const { data: activeAlerts, isLoading: loadingAlerts, refetch: refetchAlerts, isFetching: fetchingAlerts } = useQuery({
    queryKey: ['bom-active-alerts', tenantId],
    queryFn: () => bomApi.alerts.getActiveAlerts(tenantId),
    enabled: !!tenantId,
    staleTime: 60000,
    retry: 2,
  });

  const { data: reorderRecommendations, isLoading: loadingReorder, refetch: refetchReorder, isFetching: fetchingReorder } = useQuery({
    queryKey: ['bom-reorder-recommendations', tenantId],
    queryFn: () => bomApi.alerts.getReorderRecommendations(tenantId),
    enabled: !!tenantId,
    staleTime: 60000,
    retry: 2,
  });

  const handleRefreshAll = () => {
    // Refetch all dashboard data
    refetchStock();
    refetchCategories();
    refetchTrends();
    refetchAlerts();
    refetchReorder();
  };

  const isRefreshing = fetchingStock || fetchingCategories || fetchingTrends || fetchingAlerts || fetchingReorder;

  const isLoading = loadingStock || loadingCategories || loadingTrends || loadingAlerts || loadingReorder;

  // Extract summary data
  const stockSummary = stockStatus?.data;
  const activeAlertsCount = activeAlerts?.data?.length || 0;
  const criticalAlertsCount = activeAlerts?.data?.filter(a => a.level === 'critical').length || 0;

  // Loading Skeleton
  if (isLoading && !stockStatus && !categories && !usageTrends) {
    return (
      <div className="min-h-screen bg-gradient-bg">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-96 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-10 w-32 bg-muted animate-pulse rounded"></div>
          </div>

          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                  <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
                  <div className="h-3 w-32 bg-muted animate-pulse rounded"></div>
                </div>
              </Card>
            ))}
          </div>

          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="h-5 w-48 bg-muted animate-pulse rounded"></div>
                  <div className="h-[300px] bg-muted/30 animate-pulse rounded"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-primary-600" />
              BOM Analytics Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Bill of Materials analytics, stock monitoring, and alerts
            </p>
          </div>
          <Button
            onClick={handleRefreshAll}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Materials */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Materials</p>
                <p className="text-3xl font-bold text-foreground">
                  {loadingStock ? '...' : stockSummary?.total_materials || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Active inventory items
                </p>
              </div>
              <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
                <Package className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </Card>

          {/* Low Stock Count */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Low Stock Items</p>
                <p className="text-3xl font-bold text-warning-600">
                  {loadingStock ? '...' : (stockSummary?.low_stock || 0) + (stockSummary?.critical_stock || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Requires attention
                </p>
              </div>
              <div className="p-3 bg-warning-100 dark:bg-warning-900/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-warning-600" />
              </div>
            </div>
          </Card>

          {/* Total Inventory Value */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Inventory Value</p>
                <p className="text-3xl font-bold text-foreground">
                  {loadingStock ? '...' : `Rp ${(stockSummary?.total_value || 0).toLocaleString('id-ID')}`}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Current stock value
                </p>
              </div>
              <div className="p-3 bg-success-100 dark:bg-success-900/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-success-600" />
              </div>
            </div>
          </Card>

          {/* Active Alerts */}
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Alerts</p>
                <p className="text-3xl font-bold text-danger-600">
                  {loadingAlerts ? '...' : activeAlertsCount}
                </p>
                {criticalAlertsCount > 0 && (
                  <Badge variant="destructive" className="mt-2">
                    {criticalAlertsCount} Critical
                  </Badge>
                )}
              </div>
              <div className="p-3 bg-danger-100 dark:bg-danger-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-danger-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row 1: Stock Status + Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Status Distribution */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Stock Status Distribution</h3>
              <p className="text-sm text-muted-foreground">Material stock levels overview</p>
            </div>
            <StockStatusChart 
              data={stockSummary} 
              isLoading={loadingStock} 
            />
          </Card>

          {/* Category Breakdown */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Category Breakdown</h3>
              <p className="text-sm text-muted-foreground">Materials grouped by category</p>
            </div>
            <CategoryBreakdownChart 
              data={categories?.data || []} 
              isLoading={loadingCategories} 
            />
          </Card>
        </div>

        {/* Charts Row 2: Usage Trends */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Usage Trends</h3>
              <p className="text-sm text-muted-foreground">Material consumption over time</p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <select
                value={usageTrendsDays}
                onChange={(e) => setUsageTrendsDays(Number(e.target.value))}
                className="input py-1 px-3 text-sm"
                disabled={fetchingTrends}
              >
                <option value={7}>Last 7 Days</option>
                <option value={14}>Last 14 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={60}>Last 60 Days</option>
              </select>
              {fetchingTrends && (
                <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
              )}
            </div>
          </div>
          <UsageTrendsChart 
            data={usageTrends?.data || []} 
            isLoading={loadingTrends || fetchingTrends} 
          />
        </Card>

        {/* Alerts & Recommendations Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Alerts */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning-600" />
                Active Stock Alerts
              </h3>
              <p className="text-sm text-muted-foreground">Top 5 most critical alerts</p>
            </div>
            <AlertsList 
              alerts={activeAlerts?.data || []} 
              isLoading={loadingAlerts} 
            />
          </Card>

          {/* Reorder Recommendations */}
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5 text-info-600" />
                Reorder Recommendations
              </h3>
              <p className="text-sm text-muted-foreground">Suggested materials to reorder</p>
            </div>
            <ReorderRecommendationsTable 
              recommendations={reorderRecommendations?.data || []} 
              isLoading={loadingReorder} 
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export default BOMDashboardPage;