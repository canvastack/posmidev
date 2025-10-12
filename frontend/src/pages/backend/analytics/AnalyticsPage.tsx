/**
 * Analytics Page (Phase 4A Day 4 - COMPLETE, Phase 4A Day 6 - Enhanced with Cost Analysis)
 * 
 * Main analytics dashboard for POS system
 * Displays real-time metrics, trends, best sellers, and cashier performance
 * 
 * Features:
 * - Overview metric cards
 * - Sales trend charts (line/bar)
 * - Best sellers table (sortable)
 * - Cashier performance table (sortable)
 * - Period selector (day/week/month)
 * - Auto-refresh functionality
 * - Export to CSV
 * - Material Cost Analysis section (Phase 4A Day 6)
 * 
 * Design: Design tokens from index.css
 * Dark mode: Full support
 * Responsive: Mobile-optimized
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useTenantScopeStore } from '@/stores/tenantScopeStore';
import { 
  BarChart3Icon, 
  TrendingUpIcon, 
  DollarSignIcon, 
  UsersIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  LoaderIcon,
  DownloadIcon,
  CalendarIcon,
  PieChartIcon,
  InfoIcon,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { TrendPeriod } from '@/types';

// Import analytics components
import SalesOverviewCard from '@/components/analytics/SalesOverviewCard';
import SalesTrendChart from '@/components/analytics/SalesTrendChart';
import BestSellersTable from '@/components/analytics/BestSellersTable';
import CashierPerformanceTable from '@/components/analytics/CashierPerformanceTable';

// Phase 4A Day 6: Cost Analysis Components
import { MaterialCostSummary } from '@/components/cost/MaterialCostSummary';
import { ProfitMarginIndicator } from '@/components/cost/ProfitMarginIndicator';

/**
 * Analytics Dashboard Page
 */
export default function AnalyticsPage() {
  const { user } = useAuth();
  const userTenantId = user?.tenant_id || '';

  // Use selected tenant from store (works for both HQ admin and regular users)
  const { selectedTenantId } = useTenantScopeStore();
  
  // Use selectedTenantId if available (from header tenant selector), otherwise fallback to user's tenant
  const tenantId = selectedTenantId || userTenantId;

  // State for refresh interval control
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // State for trend period selector
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('week');
  
  // State for chart type
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  // Analytics hook with auto-refresh every 30 seconds
  const analytics = useAnalytics({
    tenantId,
    autoRefresh,
    refreshInterval: 30000, // 30 seconds
    fetchOnMount: true,
  });

  /**
   * Fetch trends when period changes
   */
  useEffect(() => {
    if (tenantId) {
      analytics.fetchTrends({ period: trendPeriod });
    }
  }, [trendPeriod, tenantId, analytics.fetchTrends]);

  /**
   * Manual refresh handler
   */
  const handleManualRefresh = () => {
    analytics.fetchAllAnalytics();
  };

  /**
   * Export analytics data to CSV
   */
  const handleExportCSV = () => {
    try {
      // Prepare CSV data
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      // Overview data
      csvContent += 'OVERVIEW METRICS\n';
      csvContent += 'Metric,Value\n';
      if (analytics.overview) {
        csvContent += `Total Revenue,${analytics.overview.total_revenue}\n`;
        csvContent += `Total Transactions,${analytics.overview.total_transactions}\n`;
        csvContent += `Average Ticket,${analytics.overview.average_ticket}\n`;
        if (analytics.overview.top_cashier) {
          csvContent += `Top Cashier,${analytics.overview.top_cashier.name}\n`;
        }
      }
      csvContent += '\n';

      // Best Sellers data
      csvContent += 'BEST SELLERS\n';
      csvContent += 'Rank,Product,SKU,Category,Units Sold,Revenue\n';
      analytics.bestSellers.forEach((item) => {
        csvContent += `${item.rank},"${item.product_name}",${item.sku},"${item.category}",${item.units_sold},${item.revenue}\n`;
      });
      csvContent += '\n';

      // Cashier Performance data
      csvContent += 'CASHIER PERFORMANCE\n';
      csvContent += 'Cashier,Transactions,Revenue,Avg Ticket\n';
      analytics.cashierPerformance.forEach((item) => {
        csvContent += `"${item.cashier_name}",${item.transactions_handled},${item.revenue_generated},${item.average_ticket}\n`;
      });

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  /**
   * Format number with thousand separators
   */
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4">
        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart3Icon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Real-time POS metrics and insights
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={!analytics.overview}
              className="flex items-center gap-2 px-4 py-2 bg-success-600 hover:bg-success-700 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-sm"
            >
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            {/* Manual refresh button */}
            <button
              onClick={handleManualRefresh}
              disabled={analytics.isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg transition-colors shadow-sm"
            >
              <RefreshCwIcon className={`h-4 w-4 ${analytics.isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Auto-refresh toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
            />
            <span>Auto-refresh (30s)</span>
          </label>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Period:</span>
            <div className="flex gap-1">
              {(['day', 'week', 'month'] as TrendPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setTrendPeriod(period)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    trendPeriod === period
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 hidden sm:block" />

          {/* Chart Type Selector */}
          <div className="flex items-center gap-2">
            <BarChart3Icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Chart:</span>
            <div className="flex gap-1">
              {(['line', 'bar'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                    chartType === type
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {analytics.hasError && (
        <div className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="h-5 w-5 text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-danger-800 dark:text-danger-200">
                Error loading analytics data
              </h3>
              <ul className="mt-2 text-sm text-danger-700 dark:text-danger-300 space-y-1">
                {analytics.errors.overview && <li>• Overview: {analytics.errors.overview}</li>}
                {analytics.errors.trends && <li>• Trends: {analytics.errors.trends}</li>}
                {analytics.errors.bestSellers && <li>• Best Sellers: {analytics.errors.bestSellers}</li>}
                {analytics.errors.cashierPerformance && <li>• Cashier Performance: {analytics.errors.cashierPerformance}</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Loading Analytics State */}
      {tenantId && analytics.isLoading && !analytics.overview && (
        <div className="flex items-center justify-center py-20">
          <LoaderIcon className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
        </div>
      )}

      {/* Content */}
      {tenantId && !analytics.isLoading && analytics.overview && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SalesOverviewCard
              title="Total Revenue"
              value={formatCurrency(analytics.overview.total_revenue)}
              icon={DollarSignIcon}
              iconBgColor="bg-success-100 dark:bg-success-900/30"
              iconColor="text-success-600 dark:text-success-400"
              subtitle="Today's earnings"
            />
            
            <SalesOverviewCard
              title="Transactions"
              value={formatNumber(analytics.overview.total_transactions)}
              icon={BarChart3Icon}
              iconBgColor="bg-primary-100 dark:bg-primary-900/30"
              iconColor="text-primary-600 dark:text-primary-400"
              subtitle="Completed orders"
            />
            
            <SalesOverviewCard
              title="Average Ticket"
              value={formatCurrency(analytics.overview.average_ticket)}
              icon={TrendingUpIcon}
              iconBgColor="bg-info-100 dark:bg-info-900/30"
              iconColor="text-info-600 dark:text-info-400"
              subtitle="Per transaction"
            />
            
            <SalesOverviewCard
              title="Top Cashier"
              value={analytics.overview.top_cashier?.name || 'N/A'}
              icon={UsersIcon}
              iconBgColor="bg-accent-100 dark:bg-accent-900/30"
              iconColor="text-accent-600 dark:text-accent-400"
              subtitle={
                analytics.overview.top_cashier
                  ? `${analytics.overview.top_cashier.transactions} transactions`
                  : 'No data'
              }
            />
          </div>

          {/* Sales Trend Chart */}
          <SalesTrendChart
            data={analytics.trends}
            period={trendPeriod}
            type={chartType}
            metric="both"
            isLoading={analytics.isLoadingTrends}
            height={350}
          />

          {/* Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best Sellers Table */}
            <BestSellersTable
              data={analytics.bestSellers}
              isLoading={analytics.isLoadingBestSellers}
              limit={10}
            />

            {/* Cashier Performance Table */}
            <CashierPerformanceTable
              data={analytics.cashierPerformance}
              isLoading={analytics.isLoadingCashierPerformance}
            />
          </div>

          {/* Phase 4A Day 6: Material Cost Analysis Section */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-accent-100 dark:bg-accent-900/30 rounded-lg">
                <PieChartIcon className="h-6 w-6 text-accent-600 dark:text-accent-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Material Cost Analysis
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Profit margins and cost tracking for recipe-based products
                </p>
              </div>
            </div>

            {/* Info Card: Cost Analysis Available in POS */}
            <div className="bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <InfoIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Real-Time Cost Tracking Now Available
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    Material cost analysis is now integrated directly into the POS system. When you add recipe-based products to the cart, the system automatically calculates:
                  </p>
                  <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 ml-4 list-disc">
                    <li><strong>Profit Margins</strong> - Real-time calculation per product and overall transaction</li>
                    <li><strong>Cost Alerts</strong> - Automatic warnings when margins fall below 30% or 20%</li>
                    <li><strong>Material Breakdown</strong> - Detailed cost breakdown for each ingredient/material</li>
                    <li><strong>Revenue vs Cost</strong> - Clear visibility of gross profit on every sale</li>
                  </ul>
                  
                  <div className="pt-3 border-t border-primary-200 dark:border-primary-800 mt-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">
                          Where to access:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Go to <strong className="text-primary-700 dark:text-primary-300">POS → Add Recipe Products</strong> to see live cost analysis
                        </p>
                      </div>
                      <a
                        href="/admin/pos"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shadow-sm text-sm font-medium"
                      >
                        Open POS
                        <TrendingUpIcon className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-primary-200 dark:border-primary-800">
                    <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 font-bold text-xs">
                        ✓
                      </span>
                      Manager/Admin only feature - Cost data visible on receipts and during transactions
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Cost Metrics Cards (Placeholder for future historical data) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Average Profit Margin
                  </h4>
                  <TrendingUpIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Real-time
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Calculated live in POS for each transaction
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Cost Tracking
                  </h4>
                  <PieChartIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Active
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Tracks material costs for recipe products
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Alert System
                  </h4>
                  <AlertCircleIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Enabled
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Warns when margins drop below 30%
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Cost Analysis Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-success-500"></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Automatic Calculation
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Costs calculated automatically when products with recipes are added to cart
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-success-500"></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Profit Margin Indicators
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Color-coded badges showing margin levels (High: green, Medium: yellow, Low: red)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-success-500"></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Receipt Integration
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Cost analysis appears on receipts (manager-only section with lock icon)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-success-500"></div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      Material Breakdown
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Expandable view showing cost per ingredient/material in each product
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Future Enhancement Note */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                <strong className="text-gray-700 dark:text-gray-300">Coming Soon:</strong> Historical cost trends, product profitability rankings, and automated cost optimization suggestions
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}