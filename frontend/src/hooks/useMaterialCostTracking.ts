/**
 * Material Cost Tracking Hook
 * Phase 4A Day 5: Backend Cost Analysis API
 * 
 * Provides real-time cost analysis for recipe-based products in POS cart.
 * Calculates profit margins, material costs, and generates alerts.
 * 
 * Features:
 * - Calculate cost for single or multiple products
 * - Real-time profit margin calculation
 * - Low margin alerts (< 30% warning, < 20% error)
 * - Material breakdown details
 * - Cart-wide cost summary
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import type {
  MaterialCostRequest,
  MaterialCostResponse,
  ProductCostAnalysis,
  CostSummary,
} from '@/types';

/**
 * Get API base URL from environment or default
 */
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_URL || 'http://localhost:9000/api/v1';
};

interface UseMaterialCostTrackingReturn {
  calculateCosts: (products: MaterialCostRequest['products']) => Promise<MaterialCostResponse['data']>;
  costAnalysis: ProductCostAnalysis[] | null;
  costSummary: CostSummary | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

interface UseMaterialCostTrackingOptions {
  tenantId: string;
}

export function useMaterialCostTracking(
  options: UseMaterialCostTrackingOptions
): UseMaterialCostTrackingReturn {
  const { tenantId } = options;
  const [costAnalysis, setCostAnalysis] = useState<ProductCostAnalysis[] | null>(null);
  const [costSummary, setCostSummary] = useState<CostSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateCosts = useCallback(
    async (products: MaterialCostRequest['products']): Promise<MaterialCostResponse['data']> => {
      if (products.length === 0) {
        setCostAnalysis([]);
        setCostSummary({
          total_cost: 0,
          total_revenue: 0,
          total_profit: 0,
          overall_profit_margin: 0,
        });
        return {
          products: [],
          summary: {
            total_cost: 0,
            total_revenue: 0,
            total_profit: 0,
            overall_profit_margin: 0,
          },
        };
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = useAuthStore.getState().token;
        const response = await axios.post<MaterialCostResponse>(
          `${getApiBaseUrl()}/tenants/${tenantId}/analytics/pos/material-costs`,
          { products },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const { products: analysis, summary } = response.data.data;

        setCostAnalysis(analysis);
        setCostSummary(summary);

        return response.data.data;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Failed to calculate material costs';
        setError(errorMessage);
        console.error('Material cost calculation error:', err);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [tenantId]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    calculateCosts,
    costAnalysis,
    costSummary,
    isLoading,
    error,
    clearError,
  };
}