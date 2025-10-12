/**
 * useAnalytics Hook
 * 
 * Custom React hook for accessing POS Analytics data (Phase 4A)
 * Provides convenient access to analytics store and auto-refresh functionality
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import type {
  AnalyticsOverviewRequest,
  AnalyticsTrendsRequest,
  AnalyticsBestSellersRequest,
  AnalyticsCashierPerformanceRequest,
} from '@/types';

/**
 * Hook Options
 */
interface UseAnalyticsOptions {
  tenantId: string;
  autoRefresh?: boolean; // Enable auto-refresh (defaults to false)
  refreshInterval?: number; // Refresh interval in milliseconds (defaults to 30000 = 30s)
  fetchOnMount?: boolean; // Fetch data on component mount (defaults to true)
}

/**
 * useAnalytics Hook
 * 
 * @param options - Hook configuration
 * @returns Analytics store state and actions
 * 
 * @example
 * ```tsx
 * const analytics = useAnalytics({
 *   tenantId: '12345678-1234-1234-1234-123456789012',
 *   autoRefresh: true,
 *   refreshInterval: 30000, // 30 seconds
 * });
 * 
 * // Access data
 * console.log(analytics.overview);
 * console.log(analytics.trends);
 * 
 * // Fetch data manually
 * analytics.fetchOverview({ date: '2025-01-15' });
 * ```
 */
export function useAnalytics(options: UseAnalyticsOptions) {
  const {
    tenantId,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds default
    fetchOnMount = true,
  } = options;

  // Get store state and actions
  const {
    overview,
    comparisonData,
    trends,
    bestSellers,
    cashierPerformance,
    isLoadingOverview,
    isLoadingTrends,
    isLoadingBestSellers,
    isLoadingCashierPerformance,
    overviewError,
    trendsError,
    bestSellersError,
    cashierPerformanceError,
    fetchOverview: storeFetchOverview,
    fetchTrends: storeFetchTrends,
    fetchBestSellers: storeFetchBestSellers,
    fetchCashierPerformance: storeFetchCashierPerformance,
    clearAll,
  } = useAnalyticsStore();

  // Refs for interval management
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Wrapped fetch functions with tenantId pre-filled
   */
  const fetchOverview = useCallback(
    async (params?: AnalyticsOverviewRequest) => {
      return storeFetchOverview(tenantId, params);
    },
    [tenantId, storeFetchOverview]
  );

  const fetchTrends = useCallback(
    async (params?: AnalyticsTrendsRequest) => {
      return storeFetchTrends(tenantId, params);
    },
    [tenantId, storeFetchTrends]
  );

  const fetchBestSellers = useCallback(
    async (params?: AnalyticsBestSellersRequest) => {
      return storeFetchBestSellers(tenantId, params);
    },
    [tenantId, storeFetchBestSellers]
  );

  const fetchCashierPerformance = useCallback(
    async (params?: AnalyticsCashierPerformanceRequest) => {
      return storeFetchCashierPerformance(tenantId, params);
    },
    [tenantId, storeFetchCashierPerformance]
  );

  /**
   * Fetch all analytics data
   */
  const fetchAllAnalytics = useCallback(async () => {
    await Promise.all([
      fetchOverview(),
      fetchTrends(),
      fetchBestSellers(),
      fetchCashierPerformance(),
    ]);
  }, [fetchOverview, fetchTrends, fetchBestSellers, fetchCashierPerformance]);

  /**
   * Setup auto-refresh
   */
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      // Clear existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Setup new interval
      refreshIntervalRef.current = setInterval(() => {
        fetchAllAnalytics();
      }, refreshInterval);

      // Cleanup on unmount or when dependencies change
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchAllAnalytics]);

  /**
   * Fetch on mount if enabled
   */
  useEffect(() => {
    if (fetchOnMount) {
      fetchAllAnalytics();
    }

    // Cleanup: clear all data on unmount
    return () => {
      clearAll();
    };
  }, [fetchOnMount, fetchAllAnalytics, clearAll]);

  /**
   * Computed state
   */
  const isLoading =
    isLoadingOverview ||
    isLoadingTrends ||
    isLoadingBestSellers ||
    isLoadingCashierPerformance;

  const hasError =
    !!overviewError ||
    !!trendsError ||
    !!bestSellersError ||
    !!cashierPerformanceError;

  const errors = {
    overview: overviewError,
    trends: trendsError,
    bestSellers: bestSellersError,
    cashierPerformance: cashierPerformanceError,
  };

  /**
   * Return analytics state and actions
   */
  return {
    // Data
    overview,
    comparisonData,
    trends,
    bestSellers,
    cashierPerformance,

    // Loading states
    isLoading,
    isLoadingOverview,
    isLoadingTrends,
    isLoadingBestSellers,
    isLoadingCashierPerformance,

    // Error states
    hasError,
    errors,

    // Actions
    fetchOverview,
    fetchTrends,
    fetchBestSellers,
    fetchCashierPerformance,
    fetchAllAnalytics,
    clearAll,
  };
}

/**
 * Export type for external usage
 */
export type UseAnalyticsReturn = ReturnType<typeof useAnalytics>;