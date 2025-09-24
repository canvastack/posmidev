import { apiClient } from './client';
import type { User } from '../types';

export const userApi = {
  getUsers: async (tenantId: string): Promise<User[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/users`);
    return response.data;
  },

  getUser: async (tenantId: string, userId: string): Promise<User> => {
    const response = await apiClient.get(`/tenants/${tenantId}/users/${userId}`);
    return response.data;
  },
};