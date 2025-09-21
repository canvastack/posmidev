import { apiClient } from './client';
import type { DashboardData } from '../types';

export const dashboardApi = {
  getDashboardData: async (tenantId: string): Promise<DashboardData> => {
    const response = await apiClient.get(`/tenants/${tenantId}/dashboard`);
    return response.data;
  },
};