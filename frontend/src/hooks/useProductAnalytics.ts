/**
 * useProductAnalytics Hook
 * 
 * Custom React hook for fetching and managing product analytics data.
 * Supports lazy loading, date range filtering, and automatic refresh.
 * 
 * Features:
 * - Tenant-scoped data fetching
 * - Lazy loading (fetch on demand)
 * - Date range filtering
 * - Loading and error states
 * - Manual refresh capability
 * - TypeScript type safety
 * 
 * @example
 * ```tsx
 * const {
 *   overview,
 *   salesMetrics,
 *   stockMetrics,
 *   profitMetrics,
 *   variantPerformance,
 *   loading,
 *   error,
 *   fetchOverview,
 *   fetchSales,
 *   fetchStock,
 *   fetchProfit,
 *   fetchVariants,
 *   setPeriod,
 * } = useProductAnalytics(tenantId, productId, { autoFetch: false });
 * 
 * // Fetch when tab becomes active
 * useEffect(() => {
 *   if (activeTab === 'analytics') {
 *     fetchOverview();
 *   }
 * }, [activeTab]);
 * ```
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getProductSalesMetrics,
  getProductStockMetrics,
  getProductProfitMetrics,
  getVariantPerformance,
  getProductAnalyticsOverview,
  getPeriodPresetDates,
} from '../api/analyticsApi';
import type {
  ProductSalesMetrics,
  ProductStockMetrics,
  ProductProfitMetrics,
  VariantPerformance,
  ProductAnalyticsOverview,
  AnalyticsParams,
} from '../types/analytics';

interface UseProductAnalyticsOptions {
  autoFetch?: boolean; // Auto-fetch on mount (default: false for lazy loading)
  defaultPeriod?: 'last_7_days' | 'last_30_days' | 'last_90_days'; // Default period
}

interface UseProductAnalyticsReturn {
  // Data states
  overview: ProductAnalyticsOverview | null;
  salesMetrics: ProductSalesMetrics | null;
  stockMetrics: ProductStockMetrics | null;
  profitMetrics: ProductProfitMetrics | null;
  variantPerformance: VariantPerformance[] | null;
  
  // UI states
  loading: boolean;
  error: string | null;
  
  // Fetch functions
  fetchOverview: () => Promise<void>;
  fetchSales: () => Promise<void>;
  fetchStock: () => Promise<void>;
  fetchProfit: () => Promise<void>;
  fetchVariants: (limit?: number) => Promise<void>;
  refresh: () => Promise<void>;
  
  // Period management
  setPeriod: (start: string, end: string) => void;
  setPresetPeriod: (preset: 'last_7_days' | 'last_30_days' | 'last_90_days') => void;
  currentPeriod: AnalyticsParams;
}

/**
 * Custom hook for product analytics
 */
export const useProductAnalytics = (
  tenantId: string | undefined,
  productId: string | undefined,
  options: UseProductAnalyticsOptions = {}
): UseProductAnalyticsReturn => {
  const { autoFetch = false, defaultPeriod = 'last_30_days' } = options;
  
  // Data states
  const [overview, setOverview] = useState<ProductAnalyticsOverview | null>(null);
  const [salesMetrics, setSalesMetrics] = useState<ProductSalesMetrics | null>(null);
  const [stockMetrics, setStockMetrics] = useState<ProductStockMetrics | null>(null);
  const [profitMetrics, setProfitMetrics] = useState<ProductProfitMetrics | null>(null);
  const [variantPerformance, setVariantPerformance] = useState<VariantPerformance[] | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Period state
  const [currentPeriod, setCurrentPeriod] = useState<AnalyticsParams>(() => {
    const dates = getPeriodPresetDates(defaultPeriod);
    return {
      period_start: dates.start,
      period_end: dates.end,
    };
  });
  
  /**
   * Fetch combined analytics overview
   */
  const fetchOverview = useCallback(async () => {
    if (!tenantId || !productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getProductAnalyticsOverview(tenantId, productId, currentPeriod);
      setOverview(response.data);
      
      // Also populate individual metrics from overview
      setSalesMetrics(response.data.sales);
      setStockMetrics(response.data.stock);
      setProfitMetrics(response.data.profit);
      setVariantPerformance(response.data.variants);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch analytics overview';
      setError(message);
      console.error('Error fetching analytics overview:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, productId, currentPeriod]);
  
  /**
   * Fetch sales metrics only
   */
  const fetchSales = useCallback(async () => {
    if (!tenantId || !productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getProductSalesMetrics(tenantId, productId, currentPeriod);
      setSalesMetrics(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sales metrics';
      setError(message);
      console.error('Error fetching sales metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, productId, currentPeriod]);
  
  /**
   * Fetch stock metrics only
   */
  const fetchStock = useCallback(async () => {
    if (!tenantId || !productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getProductStockMetrics(tenantId, productId, currentPeriod);
      setStockMetrics(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stock metrics';
      setError(message);
      console.error('Error fetching stock metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, productId, currentPeriod]);
  
  /**
   * Fetch profit metrics only
   */
  const fetchProfit = useCallback(async () => {
    if (!tenantId || !productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getProductProfitMetrics(tenantId, productId, currentPeriod);
      setProfitMetrics(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profit metrics';
      setError(message);
      console.error('Error fetching profit metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, productId, currentPeriod]);
  
  /**
   * Fetch variant performance only
   */
  const fetchVariants = useCallback(async (limit: number = 10) => {
    if (!tenantId || !productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getVariantPerformance(tenantId, productId, {
        ...currentPeriod,
        limit,
      });
      setVariantPerformance(response.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch variant performance';
      setError(message);
      console.error('Error fetching variant performance:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, productId, currentPeriod]);
  
  /**
   * Refresh all data (re-fetch overview)
   */
  const refresh = useCallback(async () => {
    await fetchOverview();
  }, [fetchOverview]);
  
  /**
   * Set custom period dates
   */
  const setPeriod = useCallback((start: string, end: string) => {
    setCurrentPeriod({
      period_start: start,
      period_end: end,
    });
  }, []);
  
  /**
   * Set period from preset
   */
  const setPresetPeriod = useCallback((preset: 'last_7_days' | 'last_30_days' | 'last_90_days') => {
    const dates = getPeriodPresetDates(preset);
    setCurrentPeriod({
      period_start: dates.start,
      period_end: dates.end,
    });
  }, []);
  
  /**
   * Auto-fetch on mount if enabled
   */
  useEffect(() => {
    if (autoFetch && tenantId && productId) {
      fetchOverview();
    }
  }, [autoFetch, tenantId, productId, fetchOverview]);
  
  return {
    // Data
    overview,
    salesMetrics,
    stockMetrics,
    profitMetrics,
    variantPerformance,
    
    // UI states
    loading,
    error,
    
    // Fetch functions
    fetchOverview,
    fetchSales,
    fetchStock,
    fetchProfit,
    fetchVariants,
    refresh,
    
    // Period management
    setPeriod,
    setPresetPeriod,
    currentPeriod,
  };
};

export default useProductAnalytics;