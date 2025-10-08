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
   * Endpoint: GET /tenants/{tenantId}/products/{productId}/history
   */
  getActivityLog: async (
    tenantId: string, 
    productId: string, 
    page: number = 1,
    perPage: number = 20,
    dateFrom?: string,
    dateTo?: string,
    event?: string
  ): Promise<HistoryPaginationResponse<ActivityLog>> => {
    const params: any = { page, per_page: perPage };
    
    if (dateFrom) {
      params.date_from = dateFrom;
    }
    
    if (dateTo) {
      params.date_to = dateTo;
    }
    
    if (event) {
      params.event = event;
    }
    
    const response = await apiClient.get(
      `/tenants/${tenantId}/products/${productId}/history`,
      { params }
    );
    return response.data;
  },

  /**
   * Get price change history for a product
   * Endpoint: GET /tenants/{tenantId}/products/{productId}/history/price
   */
  getPriceHistory: async (
    tenantId: string, 
    productId: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<HistoryPaginationResponse<PriceHistory>> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/products/${productId}/history/price`,
      { params: { page, per_page: perPage } }
    );
    return response.data;
  },

  /**
   * Get stock change history for a product
   * Endpoint: GET /tenants/{tenantId}/products/{productId}/history/stock
   */
  getStockHistory: async (
    tenantId: string, 
    productId: string,
    page: number = 1,
    perPage: number = 50
  ): Promise<HistoryPaginationResponse<StockHistory>> => {
    const response = await apiClient.get(
      `/tenants/${tenantId}/products/${productId}/history/stock`,
      { params: { page, per_page: perPage } }
    );
    return response.data;
  },
};