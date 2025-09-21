import { apiClient } from './client';
import type { Order, OrderForm } from '../types';

export const orderApi = {
  createOrder: async (tenantId: string, data: OrderForm): Promise<Order> => {
    const response = await apiClient.post(`/tenants/${tenantId}/orders`, data);
    return response.data;
  },
};