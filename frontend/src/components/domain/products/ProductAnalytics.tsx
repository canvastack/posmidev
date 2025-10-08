/**
 * ProductAnalytics Component
 * 
 * Complete analytics dashboard for product performance visualization.
 * Displays key metrics, sales trends, stock movements, and variant performance.
 * 
 * Features:
 * - Key metrics cards (revenue, sold, profit margin, stock value)
 * - Sales trend chart
 * - Stock movement chart
 * - Variant performance table
 * - Date range selector
 * - Lazy loading support
 * - Error handling
 * - Empty state
 * 
 * @example
 * ```tsx
 * <ProductAnalytics
 *   tenantId="tenant-123"
 *   productId="product-456"
 * />
 * ```
 */

import React, { useEffect, useState } from 'react';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  CubeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useProductAnalytics } from '../../../hooks/useProductAnalytics';
import MetricCard from './MetricCard';
import SalesChart from './SalesChart';
import StockMovementChart from './StockMovementChart';
import VariantPerformanceTable from './VariantPerformanceTable';

interface ProductAnalyticsProps {
  tenantId: string;
  productId: string;
}

type PeriodOption = {
  label: string;
  value: 'last_7_days' | 'last_30_days' | 'last_90_days';
};

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'Last 90 Days', value: 'last_90_days' },
];

export const ProductAnalytics: React.FC<ProductAnalyticsProps> = ({
  tenantId,
  productId,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption['value']>('last_30_days');
  
  const {
    overview,
    salesMetrics,
    stockMetrics,
    profitMetrics,
    variantPerformance,
    loading,
    error,
    fetchOverview,
    refresh,
    setPresetPeriod,
  } = useProductAnalytics(tenantId, productId, {
    autoFetch: false, // Lazy load
    defaultPeriod: 'last_30_days',
  });
  
  /**
   * Handle period change
   */
  const handlePeriodChange = (period: PeriodOption['value']) => {
    setSelectedPeriod(period);
    setPresetPeriod(period);
  };
  
  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    refresh();
  };
  
  /**
   * Fetch data on mount (lazy loading triggered by parent)
   */
  useEffect(() => {
    if (tenantId && productId) {
      fetchOverview();
    }
  }, [tenantId, productId, fetchOverview]);
  
  /**
   * Error state
   */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 mb-4 rounded-full bg-danger-100 dark:bg-danger-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-danger-600 dark:text-danger-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Failed to Load Analytics
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md">
          {error}
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  /**
   * Empty state (no overview data yet)
   */
  if (!loading && !overview) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ChartBarIcon className="w-16 h-16 mb-4 text-gray-400 dark:text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Analytics Data Available
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md">
          Analytics data will appear here once orders are placed for this product.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Product Analytics
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Performance metrics and insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value as PeriodOption['value'])}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={loading}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh analytics"
          >
            <ArrowPathIcon className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={salesMetrics?.total_revenue ?? 0}
          format="currency"
          icon={CurrencyDollarIcon}
          loading={loading}
          subtitle={`${salesMetrics?.total_orders ?? 0} orders`}
        />
        
        <MetricCard
          title="Items Sold"
          value={salesMetrics?.total_quantity_sold ?? 0}
          format="number"
          icon={ShoppingCartIcon}
          loading={loading}
          subtitle="units"
        />
        
        <MetricCard
          title="Profit Margin"
          value={profitMetrics?.profit_margin ?? 0}
          format="percentage"
          icon={ChartBarIcon}
          loading={loading}
          trend={
            profitMetrics?.profit_margin 
              ? profitMetrics.profit_margin > 20 
                ? 'up' 
                : profitMetrics.profit_margin < 10 
                  ? 'down' 
                  : 'neutral'
              : undefined
          }
        />
        
        <MetricCard
          title="Stock Value"
          value={stockMetrics?.stock_value ?? 0}
          format="currency"
          icon={CubeIcon}
          loading={loading}
          subtitle={`${stockMetrics?.current_stock ?? 0} units`}
        />
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="glass-card p-6">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              Sales Trend
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Revenue and quantity over time
            </p>
          </div>
          <SalesChart
            data={salesMetrics?.sales_trend ?? []}
            loading={loading}
            height={300}
          />
        </div>
        
        {/* Stock Movement Chart */}
        <div className="glass-card p-6">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              Stock Movements
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Stock in/out transactions
            </p>
          </div>
          <StockMovementChart
            data={stockMetrics?.stock_movements ?? []}
            loading={loading}
            height={300}
          />
        </div>
      </div>
      
      {/* Variant Performance Table */}
      {variantPerformance && variantPerformance.length > 0 && (
        <div className="glass-card p-6">
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              Variant Performance
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Top performing variants by revenue
            </p>
          </div>
          <VariantPerformanceTable
            data={variantPerformance}
            loading={loading}
          />
        </div>
      )}
      
      {/* Additional Insights */}
      {profitMetrics && (
        <div className="glass-card p-6">
          <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Profit Analysis
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(profitMetrics.total_cost)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(profitMetrics.total_revenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gross Profit</p>
              <p className={`text-2xl font-bold ${
                profitMetrics.gross_profit >= 0
                  ? 'text-success-600 dark:text-success-400'
                  : 'text-danger-600 dark:text-danger-400'
              }`}>
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(profitMetrics.gross_profit)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAnalytics;