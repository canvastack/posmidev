/**
 * useTenantAnalytics Hook
 * 
 * Manages tenant-wide analytics data fetching and state management.
 * Provides easy access to all analytics endpoints with loading/error states.
 * 
 * @example
 * ```tsx
 * const { overview, topProducts, loading, error, refresh } = useTenantAnalytics(
 *   tenantId,
 *   { autoFetch: true, defaultPeriod: 'last_30_days' }
 * );
 * 
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * 
 * return <Dashboard data={overview} />;
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getTenantAnalyticsOverview,
  getTopProducts,
  getRevenueBreakdown,
  getProfitAnalysis,
  getCategoryPerformance,
  getMostViewedProducts,
  getPopularSearchTerms,
  getSearchTrends,
  getSearchStats,
  getZeroResultSearches,
  getPeriodPresetDates,
} from '../api/tenantAnalyticsApi';
import type {
  TenantAnalyticsOverview,
  TopProduct,
  RevenueBreakdown,
  ProfitAnalysis,
  CategoryPerformance,
  MostViewedProduct,
  PopularSearchTerm,
  SearchTrendData,
  SearchStats,
  ZeroResultSearch,
  TenantAnalyticsParams,
  TenantAnalyticsPeriodPreset,
} from '../types/tenantAnalytics';

export interface UseTenantAnalyticsOptions {
  autoFetch?: boolean;
  defaultPeriod?: TenantAnalyticsPeriodPreset;
  refreshInterval?: number; // Auto-refresh interval in ms (0 = disabled)
}

export interface UseTenantAnalyticsResult {
  // Data
  overview: TenantAnalyticsOverview | null;
  topProducts: TopProduct[] | null;
  revenueBreakdown: RevenueBreakdown | null;
  profitAnalysis: ProfitAnalysis | null;
  categoryPerformance: CategoryPerformance[] | null;
  mostViewed: MostViewedProduct[] | null;
  popularSearches: PopularSearchTerm[] | null;
  searchTrends: SearchTrendData[] | null;
  searchStats: SearchStats | null;
  zeroResultSearches: ZeroResultSearch[] | null;
  
  // State
  loading: boolean;
  error: string | null;
  currentPeriod: { start: string; end: string };
  
  // Actions
  fetchOverview: () => Promise<void>;
  fetchTopProducts: (metric?: 'revenue' | 'quantity' | 'profit' | 'views', limit?: number) => Promise<void>;
  fetchRevenueBreakdown: (limit?: number) => Promise<void>;
  fetchProfitAnalysis: (limit?: number) => Promise<void>;
  fetchCategoryPerformance: () => Promise<void>;
  fetchMostViewed: (limit?: number) => Promise<void>;
  fetchPopularSearches: (limit?: number) => Promise<void>;
  fetchSearchTrends: (groupBy?: 'day' | 'week' | 'month') => Promise<void>;
  fetchSearchStats: () => Promise<void>;
  fetchZeroResultSearches: (limit?: number) => Promise<void>;
  fetchAll: () => Promise<void>;
  refresh: () => Promise<void>;
  setPeriod: (start: string, end: string) => void;
  setPresetPeriod: (preset: TenantAnalyticsPeriodPreset) => void;
}

/**
 * Hook for managing tenant analytics data
 */
export const useTenantAnalytics = (
  tenantId: string,
  options: UseTenantAnalyticsOptions = {}
): UseTenantAnalyticsResult => {
  const {
    autoFetch = true,
    defaultPeriod = 'last_30_days',
    refreshInterval = 0,
  } = options;

  // State
  const [overview, setOverview] = useState<TenantAnalyticsOverview | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[] | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [profitAnalysis, setProfitAnalysis] = useState<ProfitAnalysis | null>(null);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[] | null>(null);
  const [mostViewed, setMostViewed] = useState<MostViewedProduct[] | null>(null);
  const [popularSearches, setPopularSearches] = useState<PopularSearchTerm[] | null>(null);
  const [searchTrends, setSearchTrends] = useState<SearchTrendData[] | null>(null);
  const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
  const [zeroResultSearches, setZeroResultSearches] = useState<ZeroResultSearch[] | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState(() => getPeriodPresetDates(defaultPeriod));

  // Fetch overview
  const fetchOverview = useCallback(async () => {
    try {
      setError(null);
      const response = await getTenantAnalyticsOverview(tenantId, {
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
      });
      setOverview(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch overview';
      setError(message);
      console.error('Error fetching analytics overview:', err);
    }
  }, [tenantId, currentPeriod]);

  // Fetch top products
  const fetchTopProducts = useCallback(
    async (metric: 'revenue' | 'quantity' | 'profit' | 'views' = 'revenue', limit = 10) => {
      try {
        setError(null);
        const response = await getTopProducts(tenantId, {
          metric,
          limit,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end,
        });
        setTopProducts(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch top products';
        setError(message);
        console.error('Error fetching top products:', err);
      }
    },
    [tenantId, currentPeriod]
  );

  // Fetch revenue breakdown
  const fetchRevenueBreakdown = useCallback(
    async (limit = 10) => {
      try {
        setError(null);
        const response = await getRevenueBreakdown(tenantId, {
          limit,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end,
        });
        setRevenueBreakdown(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch revenue breakdown';
        setError(message);
        console.error('Error fetching revenue breakdown:', err);
      }
    },
    [tenantId, currentPeriod]
  );

  // Fetch profit analysis
  const fetchProfitAnalysis = useCallback(
    async (limit = 10) => {
      try {
        setError(null);
        const response = await getProfitAnalysis(tenantId, {
          limit,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end,
        });
        setProfitAnalysis(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch profit analysis';
        setError(message);
        console.error('Error fetching profit analysis:', err);
      }
    },
    [tenantId, currentPeriod]
  );

  // Fetch category performance
  const fetchCategoryPerformance = useCallback(async () => {
    try {
      setError(null);
      const response = await getCategoryPerformance(tenantId, {
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
      });
      setCategoryPerformance(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch category performance';
      setError(message);
      console.error('Error fetching category performance:', err);
    }
  }, [tenantId, currentPeriod]);

  // Fetch most viewed
  const fetchMostViewed = useCallback(
    async (limit = 10) => {
      try {
        setError(null);
        const response = await getMostViewedProducts(tenantId, {
          limit,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end,
        });
        setMostViewed(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch most viewed';
        setError(message);
        console.error('Error fetching most viewed:', err);
      }
    },
    [tenantId, currentPeriod]
  );

  // Fetch popular searches
  const fetchPopularSearches = useCallback(
    async (limit = 10) => {
      try {
        setError(null);
        const response = await getPopularSearchTerms(tenantId, {
          limit,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end,
        });
        setPopularSearches(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch popular searches';
        setError(message);
        console.error('Error fetching popular searches:', err);
      }
    },
    [tenantId, currentPeriod]
  );

  // Fetch search trends
  const fetchSearchTrends = useCallback(
    async (groupBy: 'day' | 'week' | 'month' = 'day') => {
      try {
        setError(null);
        const response = await getSearchTrends(tenantId, {
          group_by: groupBy,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end,
        });
        setSearchTrends(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch search trends';
        setError(message);
        console.error('Error fetching search trends:', err);
      }
    },
    [tenantId, currentPeriod]
  );

  // Fetch search stats
  const fetchSearchStats = useCallback(async () => {
    try {
      setError(null);
      const response = await getSearchStats(tenantId, {
        period_start: currentPeriod.start,
        period_end: currentPeriod.end,
      });
      setSearchStats(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch search stats';
      setError(message);
      console.error('Error fetching search stats:', err);
    }
  }, [tenantId, currentPeriod]);

  // Fetch zero result searches
  const fetchZeroResultSearches = useCallback(
    async (limit = 10) => {
      try {
        setError(null);
        const response = await getZeroResultSearches(tenantId, {
          limit,
          period_start: currentPeriod.start,
          period_end: currentPeriod.end,
        });
        setZeroResultSearches(response.data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch zero result searches';
        setError(message);
        console.error('Error fetching zero result searches:', err);
      }
    },
    [tenantId, currentPeriod]
  );

  // Fetch all data
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchOverview(),
        fetchTopProducts(),
        fetchRevenueBreakdown(),
        fetchProfitAnalysis(),
        fetchCategoryPerformance(),
        fetchMostViewed(),
        fetchPopularSearches(),
        fetchSearchTrends(),
        fetchSearchStats(),
        fetchZeroResultSearches(),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    fetchOverview,
    fetchTopProducts,
    fetchRevenueBreakdown,
    fetchProfitAnalysis,
    fetchCategoryPerformance,
    fetchMostViewed,
    fetchPopularSearches,
    fetchSearchTrends,
    fetchSearchStats,
    fetchZeroResultSearches,
  ]);

  // Refresh (alias for fetchAll)
  const refresh = useCallback(() => fetchAll(), [fetchAll]);

  // Set custom period
  const setPeriod = useCallback((start: string, end: string) => {
    setCurrentPeriod({ start, end });
  }, []);

  // Set preset period
  const setPresetPeriod = useCallback((preset: TenantAnalyticsPeriodPreset) => {
    if (preset === 'custom') return; // Custom is handled by setPeriod
    const dates = getPeriodPresetDates(preset);
    setCurrentPeriod(dates);
  }, []);

  // Auto-fetch on mount and period change
  useEffect(() => {
    if (autoFetch && tenantId) {
      fetchAll();
    }
  }, [autoFetch, tenantId, currentPeriod, fetchAll]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        refresh();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refresh]);

  return {
    // Data
    overview,
    topProducts,
    revenueBreakdown,
    profitAnalysis,
    categoryPerformance,
    mostViewed,
    popularSearches,
    searchTrends,
    searchStats,
    zeroResultSearches,
    
    // State
    loading,
    error,
    currentPeriod,
    
    // Actions
    fetchOverview,
    fetchTopProducts,
    fetchRevenueBreakdown,
    fetchProfitAnalysis,
    fetchCategoryPerformance,
    fetchMostViewed,
    fetchPopularSearches,
    fetchSearchTrends,
    fetchSearchStats,
    fetchZeroResultSearches,
    fetchAll,
    refresh,
    setPeriod,
    setPresetPeriod,
  };
};