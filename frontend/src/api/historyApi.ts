import { apiClient } from './client';
import type { 
  ActivityLog, 
  PriceHistory, 
  StockHistory, 
  HistoryPaginationResponse, 
  PriceHistoryResponse, 
  StockHistoryResponse 
} from '../types/history';

export const historyApi = {
  /**
   * Get complete activity log for a product
   */
  getActivityLog: async (
    tenantId: string, 
    productId: string, 
    page: number = 1
  ): Promise<HistoryPaginationResponse<ActivityLog>> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/products/${productId}/history`,
      { params: { page } }
    );
    return response.data;
  },

  /**
   * Get price change history for a product
   */
  getPriceHistory: async (
    tenantId: string, 
    productId: string
  ): Promise<PriceHistoryResponse> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/products/${productId}/history/price`
    );
    return response.data;
  },

  /**
   * Get stock change history for a product
   */
  getStockHistory: async (
    tenantId: string, 
    productId: string
  ): Promise<StockHistoryResponse> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/products/${productId}/history/stock`
    );
    return response.data;
  },
};