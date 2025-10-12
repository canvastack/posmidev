/**
 * Analytics Store (Zustand)
 * 
 * Centralized state management for POS Analytics Dashboard (Phase 4A)
 * Handles data fetching, caching, and error states for all analytics endpoints
 */

import { create } from 'zustand';
import axios from 'axios';
import { useAuthStore } from './authStore';
import type {
  PosOverview,
  SalesTrend,
  BestSeller,
  CashierPerformance,
  AnalyticsOverviewRequest,
  AnalyticsTrendsRequest,
  AnalyticsBestSellersRequest,
  AnalyticsCashierPerformanceRequest,
  AnalyticsApiResponse,
  AnalyticsComparison,
  TrendPeriod,
  BestSellersSortBy,
} from '@/types';

/**
 * Analytics State Interface
 */
interface AnalyticsState {
  // Data
  overview: PosOverview | null;
  comparisonData: AnalyticsComparison | null; // Phase 4A+: Historical Comparison
  trends: SalesTrend[];
  bestSellers: BestSeller[];
  cashierPerformance: CashierPerformance[];

  // Loading states
  isLoadingOverview: boolean;
  isLoadingTrends: boolean;
  isLoadingBestSellers: boolean;
  isLoadingCashierPerformance: boolean;

  // Error states
  overviewError: string | null;
  trendsError: string | null;
  bestSellersError: string | null;
  cashierPerformanceError: string | null;

  // Last fetch timestamps (for cache management)
  lastOverviewFetch: Date | null;
  lastTrendsFetch: Date | null;
  lastBestSellersFetch: Date | null;
  lastCashierPerformanceFetch: Date | null;

  // Actions
  fetchOverview: (tenantId: string, params?: AnalyticsOverviewRequest) => Promise<void>;
  fetchTrends: (tenantId: string, params?: AnalyticsTrendsRequest) => Promise<void>;
  fetchBestSellers: (tenantId: string, params?: AnalyticsBestSellersRequest) => Promise<void>;
  fetchCashierPerformance: (tenantId: string, params?: AnalyticsCashierPerformanceRequest) => Promise<void>;
  
  // Utility actions
  clearOverview: () => void;
  clearTrends: () => void;
  clearBestSellers: () => void;
  clearCashierPerformance: () => void;
  clearAll: () => void;
}

/**
 * Get API base URL from environment or default
 */
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:9000/api/v1';
};

/**
 * Create Analytics Store
 */
export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  // Initial state
  overview: null,
  comparisonData: null, // Phase 4A+
  trends: [],
  bestSellers: [],
  cashierPerformance: [],

  isLoadingOverview: false,
  isLoadingTrends: false,
  isLoadingBestSellers: false,
  isLoadingCashierPerformance: false,

  overviewError: null,
  trendsError: null,
  bestSellersError: null,
  cashierPerformanceError: null,

  lastOverviewFetch: null,
  lastTrendsFetch: null,
  lastBestSellersFetch: null,
  lastCashierPerformanceFetch: null,

  /**
   * Fetch POS Overview Metrics
   * Phase 4A+: Now supports historical comparison
   */
  fetchOverview: async (tenantId: string, params?: AnalyticsOverviewRequest) => {
    set({ isLoadingOverview: true, overviewError: null });

    try {
      const token = useAuthStore.getState().token;
      
      // Phase 4A+: Response structure changes based on comparison_period
      if (params?.comparison_period) {
        // Fetch with comparison
        const response = await axios.post<AnalyticsApiResponse<AnalyticsComparison>>(
          `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/overview`,
          params,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        set({
          overview: response.data.data.current,
          comparisonData: response.data.data,
          isLoadingOverview: false,
          overviewError: null,
          lastOverviewFetch: new Date(),
        });
      } else {
        // Fetch without comparison (backward compatible)
        const response = await axios.post<AnalyticsApiResponse<AnalyticsComparison>>(
          `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/overview`,
          params || {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        // Backend always returns {current, comparison, variance} structure now
        set({
          overview: response.data.data.current,
          comparisonData: response.data.data.comparison ? response.data.data : null,
          isLoadingOverview: false,
          overviewError: null,
          lastOverviewFetch: new Date(),
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch overview metrics';
      set({
        isLoadingOverview: false,
        overviewError: errorMessage,
      });
      console.error('Analytics Overview Error:', error);
    }
  },

  /**
   * Fetch Sales Trends
   */
  fetchTrends: async (tenantId: string, params?: AnalyticsTrendsRequest) => {
    set({ isLoadingTrends: true, trendsError: null });

    try {
      const token = useAuthStore.getState().token;
      const response = await axios.post<AnalyticsApiResponse<SalesTrend[]>>(
        `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/trends`,
        params || {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      set({
        trends: response.data.data,
        isLoadingTrends: false,
        trendsError: null,
        lastTrendsFetch: new Date(),
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch trends data';
      set({
        isLoadingTrends: false,
        trendsError: errorMessage,
      });
      console.error('Analytics Trends Error:', error);
    }
  },

  /**
   * Fetch Best Sellers
   */
  fetchBestSellers: async (tenantId: string, params?: AnalyticsBestSellersRequest) => {
    set({ isLoadingBestSellers: true, bestSellersError: null });

    try {
      const token = useAuthStore.getState().token;
      const response = await axios.post<AnalyticsApiResponse<BestSeller[]>>(
        `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/best-sellers`,
        params || {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      set({
        bestSellers: response.data.data,
        isLoadingBestSellers: false,
        bestSellersError: null,
        lastBestSellersFetch: new Date(),
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch best sellers';
      set({
        isLoadingBestSellers: false,
        bestSellersError: errorMessage,
      });
      console.error('Analytics Best Sellers Error:', error);
    }
  },

  /**
   * Fetch Cashier Performance
   */
  fetchCashierPerformance: async (tenantId: string, params?: AnalyticsCashierPerformanceRequest) => {
    set({ isLoadingCashierPerformance: true, cashierPerformanceError: null });

    try {
      const token = useAuthStore.getState().token;
      const response = await axios.post<AnalyticsApiResponse<CashierPerformance[]>>(
        `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/cashier-performance`,
        params || {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      set({
        cashierPerformance: response.data.data,
        isLoadingCashierPerformance: false,
        cashierPerformanceError: null,
        lastCashierPerformanceFetch: new Date(),
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch cashier performance';
      set({
        isLoadingCashierPerformance: false,
        cashierPerformanceError: errorMessage,
      });
      console.error('Analytics Cashier Performance Error:', error);
    }
  },

  /**
   * Clear individual data sets
   */
  clearOverview: () => set({ overview: null, comparisonData: null, overviewError: null, lastOverviewFetch: null }),
  clearTrends: () => set({ trends: [], trendsError: null, lastTrendsFetch: null }),
  clearBestSellers: () => set({ bestSellers: [], bestSellersError: null, lastBestSellersFetch: null }),
  clearCashierPerformance: () => set({ cashierPerformance: [], cashierPerformanceError: null, lastCashierPerformanceFetch: null }),

  /**
   * Clear all analytics data
   */
  clearAll: () => set({
    overview: null,
    comparisonData: null,
    trends: [],
    bestSellers: [],
    cashierPerformance: [],
    overviewError: null,
    trendsError: null,
    bestSellersError: null,
    cashierPerformanceError: null,
    lastOverviewFetch: null,
    lastTrendsFetch: null,
    lastBestSellersFetch: null,
    lastCashierPerformanceFetch: null,
  }),
}));

/**
 * Export convenience selectors
 */
export const selectOverview = (state: AnalyticsState) => state.overview;
export const selectTrends = (state: AnalyticsState) => state.trends;
export const selectBestSellers = (state: AnalyticsState) => state.bestSellers;
export const selectCashierPerformance = (state: AnalyticsState) => state.cashierPerformance;

export const selectIsLoading = (state: AnalyticsState) => 
  state.isLoadingOverview || 
  state.isLoadingTrends || 
  state.isLoadingBestSellers || 
  state.isLoadingCashierPerformance;

export const selectHasAnyError = (state: AnalyticsState) =>
  !!state.overviewError ||
  !!state.trendsError ||
  !!state.bestSellersError ||
  !!state.cashierPerformanceError;