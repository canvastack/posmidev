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
  BackendAnomaly,
  AnalyticsPreferences,
  AnalyticsPreferencesUpdate,
  AnomalyFilters,
  PaginatedAnomaliesResponse,
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

  // Phase 5: Backend-Powered Analytics
  anomalies: BackendAnomaly[];
  anomaliesMeta: PaginatedAnomaliesResponse['meta'] | null;
  preferences: AnalyticsPreferences | null;

  // Loading states
  isLoadingOverview: boolean;
  isLoadingTrends: boolean;
  isLoadingBestSellers: boolean;
  isLoadingCashierPerformance: boolean;
  isLoadingAnomalies: boolean; // Phase 5
  isLoadingPreferences: boolean; // Phase 5

  // Error states
  overviewError: string | null;
  trendsError: string | null;
  bestSellersError: string | null;
  cashierPerformanceError: string | null;
  anomaliesError: string | null; // Phase 5
  preferencesError: string | null; // Phase 5

  // Last fetch timestamps (for cache management)
  lastOverviewFetch: Date | null;
  lastTrendsFetch: Date | null;
  lastBestSellersFetch: Date | null;
  lastCashierPerformanceFetch: Date | null;
  lastAnomaliesFetch: Date | null; // Phase 5

  // Actions
  fetchOverview: (tenantId: string, params?: AnalyticsOverviewRequest) => Promise<void>;
  fetchTrends: (tenantId: string, params?: AnalyticsTrendsRequest) => Promise<void>;
  fetchBestSellers: (tenantId: string, params?: AnalyticsBestSellersRequest) => Promise<void>;
  fetchCashierPerformance: (tenantId: string, params?: AnalyticsCashierPerformanceRequest) => Promise<void>;
  
  // Phase 5: Backend-Powered Actions
  fetchAnomalies: (tenantId: string, filters?: AnomalyFilters) => Promise<void>;
  acknowledgeAnomaly: (tenantId: string, anomalyId: string) => Promise<void>;
  fetchPreferences: (tenantId: string) => Promise<void>;
  updatePreferences: (tenantId: string, prefs: AnalyticsPreferencesUpdate) => Promise<void>;
  
  // Utility actions
  clearOverview: () => void;
  clearTrends: () => void;
  clearBestSellers: () => void;
  clearCashierPerformance: () => void;
  clearAnomalies: () => void; // Phase 5
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
export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  // Initial state
  overview: null,
  comparisonData: null, // Phase 4A+
  trends: [],
  bestSellers: [],
  cashierPerformance: [],

  // Phase 5: Backend-Powered
  anomalies: [],
  anomaliesMeta: null,
  preferences: null,

  isLoadingOverview: false,
  isLoadingTrends: false,
  isLoadingBestSellers: false,
  isLoadingCashierPerformance: false,
  isLoadingAnomalies: false,
  isLoadingPreferences: false,

  overviewError: null,
  trendsError: null,
  bestSellersError: null,
  cashierPerformanceError: null,
  anomaliesError: null,
  preferencesError: null,

  lastOverviewFetch: null,
  lastTrendsFetch: null,
  lastBestSellersFetch: null,
  lastCashierPerformanceFetch: null,
  lastAnomaliesFetch: null,

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
   * Phase 5: Fetch Anomalies from Backend
   * Fetches stored anomalies with filtering and pagination
   */
  fetchAnomalies: async (tenantId: string, filters?: AnomalyFilters) => {
    set({ isLoadingAnomalies: true, anomaliesError: null });

    try {
      const token = useAuthStore.getState().token;
      const queryParams = new URLSearchParams();

      // Build query parameters
      if (filters?.severity) queryParams.append('severity', filters.severity);
      if (filters?.metric_type) queryParams.append('metric_type', filters.metric_type);
      if (filters?.anomaly_type) queryParams.append('anomaly_type', filters.anomaly_type);
      if (filters?.acknowledged !== undefined) queryParams.append('acknowledged', String(filters.acknowledged));
      if (filters?.start_date) queryParams.append('start_date', filters.start_date);
      if (filters?.end_date) queryParams.append('end_date', filters.end_date);
      if (filters?.page) queryParams.append('page', String(filters.page));
      if (filters?.per_page) queryParams.append('per_page', String(filters.per_page));

      const response = await axios.get<PaginatedAnomaliesResponse>(
        `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/anomalies?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      set({
        anomalies: response.data.data,
        anomaliesMeta: response.data.meta,
        isLoadingAnomalies: false,
        anomaliesError: null,
        lastAnomaliesFetch: new Date(),
      });
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || 'Failed to fetch anomalies'
        : 'Failed to fetch anomalies';
      set({
        isLoadingAnomalies: false,
        anomaliesError: errorMessage,
      });
      console.error('Analytics Anomalies Error:', error);
    }
  },

  /**
   * Phase 5: Acknowledge Anomaly
   * Mark an anomaly as acknowledged
   */
  acknowledgeAnomaly: async (tenantId: string, anomalyId: string) => {
    try {
      const token = useAuthStore.getState().token;
      await axios.post(
        `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/anomalies/${anomalyId}/acknowledge`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      set((state) => ({
        anomalies: state.anomalies.map((anomaly) =>
          anomaly.id === anomalyId
            ? { ...anomaly, acknowledged: true, acknowledged_at: new Date().toISOString() }
            : anomaly
        ),
      }));
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || 'Failed to acknowledge anomaly'
        : 'Failed to acknowledge anomaly';
      console.error('Acknowledge Anomaly Error:', error);
      throw new Error(errorMessage);
    }
  },

  /**
   * Phase 5: Fetch Analytics Preferences
   * Get user or tenant-wide preferences
   */
  fetchPreferences: async (tenantId: string) => {
    set({ isLoadingPreferences: true, preferencesError: null });

    try {
      const token = useAuthStore.getState().token;
      const response = await axios.get<AnalyticsApiResponse<AnalyticsPreferences>>(
        `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/preferences`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      set({
        preferences: response.data.data,
        isLoadingPreferences: false,
        preferencesError: null,
      });
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || 'Failed to fetch preferences'
        : 'Failed to fetch preferences';
      set({
        isLoadingPreferences: false,
        preferencesError: errorMessage,
      });
      console.error('Analytics Preferences Error:', error);
    }
  },

  /**
   * Phase 5: Update Analytics Preferences
   * Save user preferences
   */
  updatePreferences: async (tenantId: string, prefs: AnalyticsPreferencesUpdate) => {
    set({ isLoadingPreferences: true, preferencesError: null });

    try {
      const token = useAuthStore.getState().token;
      const response = await axios.put<AnalyticsApiResponse<AnalyticsPreferences>>(
        `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/preferences`,
        prefs,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      set({
        preferences: response.data.data,
        isLoadingPreferences: false,
        preferencesError: null,
      });
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error) 
        ? error.response?.data?.message || 'Failed to update preferences'
        : 'Failed to update preferences';
      set({
        isLoadingPreferences: false,
        preferencesError: errorMessage,
      });
      console.error('Update Preferences Error:', error);
      throw new Error(errorMessage);
    }
  },

  /**
   * Clear individual data sets
   */
  clearOverview: () => set({ overview: null, comparisonData: null, overviewError: null, lastOverviewFetch: null }),
  clearTrends: () => set({ trends: [], trendsError: null, lastTrendsFetch: null }),
  clearBestSellers: () => set({ bestSellers: [], bestSellersError: null, lastBestSellersFetch: null }),
  clearCashierPerformance: () => set({ cashierPerformance: [], cashierPerformanceError: null, lastCashierPerformanceFetch: null }),
  clearAnomalies: () => set({ anomalies: [], anomaliesMeta: null, anomaliesError: null, lastAnomaliesFetch: null }),

  /**
   * Clear all analytics data
   */
  clearAll: () => set({
    overview: null,
    comparisonData: null,
    trends: [],
    bestSellers: [],
    cashierPerformance: [],
    anomalies: [],
    anomaliesMeta: null,
    preferences: null,
    overviewError: null,
    trendsError: null,
    bestSellersError: null,
    cashierPerformanceError: null,
    anomaliesError: null,
    preferencesError: null,
    lastOverviewFetch: null,
    lastTrendsFetch: null,
    lastBestSellersFetch: null,
    lastCashierPerformanceFetch: null,
    lastAnomaliesFetch: null,
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