import { useState, useEffect, useCallback } from 'react';
import { historyApi } from '@/api/historyApi';
import type { ActivityLog, HistoryPaginationResponse } from '@/types/history';
import { subDays, startOfDay, endOfDay } from 'date-fns';

interface UseProductActivityOptions {
  tenantId: string;
  productId: string;
  autoFetch?: boolean; // Auto-fetch on mount
  perPage?: number;
}

type PeriodPreset = 'last_7_days' | 'last_30_days' | 'last_90_days';

interface UseProductActivityReturn {
  activities: ActivityLog[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  } | null;
  meta: {
    product_id: string;
    product_name?: string;
  } | null;
  fetchActivities: (page?: number) => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  setPeriod: (period: PeriodPreset) => void;
  currentPeriod: PeriodPreset;
}

/**
 * Custom hook to fetch and manage product activity history
 * Implements tenant-scoped data fetching with pagination
 * 
 * @param options Configuration for fetching activity logs
 * @returns Activity data, loading state, pagination controls
 */
export function useProductActivity({
  tenantId,
  productId,
  autoFetch = true,
  perPage = 20,
}: UseProductActivityOptions): UseProductActivityReturn {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  } | null>(null);
  const [meta, setMeta] = useState<{
    product_id: string;
    product_name?: string;
  } | null>(null);
  const [currentPeriod, setCurrentPeriod] = useState<PeriodPreset>('last_30_days');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    return {
      from: startOfDay(subDays(now, 30)).toISOString(),
      to: endOfDay(now).toISOString(),
    };
  });

  const fetchActivities = useCallback(async (page: number = 1) => {
    if (!tenantId || !productId) {
      setError('Tenant ID and Product ID are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response: HistoryPaginationResponse<ActivityLog> = await historyApi.getActivityLog(
        tenantId,
        productId,
        page,
        perPage,
        dateRange.from,
        dateRange.to
      );

      setActivities(response.data);
      setPagination(response.pagination);
      setMeta(response.meta);
    } catch (err: any) {
      console.error('Failed to fetch product activities:', err);
      setError(err.response?.data?.message || 'Failed to load activity history');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, productId, perPage, dateRange]);

  const refresh = useCallback(async () => {
    await fetchActivities(pagination?.currentPage || 1);
  }, [fetchActivities, pagination?.currentPage]);

  const loadMore = useCallback(async () => {
    if (!pagination || pagination.currentPage >= pagination.lastPage) {
      return;
    }

    const nextPage = pagination.currentPage + 1;
    setLoading(true);

    try {
      const response: HistoryPaginationResponse<ActivityLog> = await historyApi.getActivityLog(
        tenantId,
        productId,
        nextPage,
        perPage,
        dateRange.from,
        dateRange.to
      );

      // Append new activities
      setActivities((prev) => [...prev, ...response.data]);
      setPagination(response.pagination);
    } catch (err: any) {
      console.error('Failed to load more activities:', err);
      setError(err.response?.data?.message || 'Failed to load more activities');
    } finally {
      setLoading(false);
    }
  }, [tenantId, productId, perPage, pagination, dateRange]);

  /**
   * Set period preset and update date range
   */
  const setPeriod = useCallback((period: PeriodPreset) => {
    setCurrentPeriod(period);
    const now = new Date();
    let daysBack = 30;
    
    switch (period) {
      case 'last_7_days':
        daysBack = 7;
        break;
      case 'last_30_days':
        daysBack = 30;
        break;
      case 'last_90_days':
        daysBack = 90;
        break;
    }
    
    const newRange = {
      from: startOfDay(subDays(now, daysBack)).toISOString(),
      to: endOfDay(now).toISOString(),
    };
    
    setDateRange(newRange);
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && tenantId && productId) {
      fetchActivities(1);
    }
  }, [autoFetch, tenantId, productId, fetchActivities]);

  // Refetch when date range changes (but not on initial mount)
  useEffect(() => {
    if (tenantId && productId && activities.length > 0) {
      fetchActivities(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const hasMore = pagination ? pagination.currentPage < pagination.lastPage : false;

  return {
    activities,
    loading,
    error,
    pagination,
    meta,
    fetchActivities,
    refresh,
    hasMore,
    loadMore,
    setPeriod,
    currentPeriod,
  };
}