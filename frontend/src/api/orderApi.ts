import { apiClient } from './client';
import type { Order, OrderForm } from '../types';

interface OrdersResponse {
  data: Order[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const orderApi = {
  getOrders: async (
    tenantId: string,
    params?: { per_page?: number; page?: number }
  ): Promise<OrdersResponse> => {
    const response = await apiClient.get(`/tenants/${tenantId}/orders`, { params });
    return response.data;
  },

  createOrder: async (tenantId: string, data: OrderForm): Promise<Order> => {
    const response = await apiClient.post(`/tenants/${tenantId}/orders`, data);
    return response.data;
  },
};