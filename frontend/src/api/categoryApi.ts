import { apiClient } from './client';
import type { Category } from '../types';

export const categoryApi = {
  getCategories: async (tenantId: string): Promise<Category[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/categories`);
    // Handle both plain array and Laravel resource collection format
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },

  getCategory: async (tenantId: string, categoryId: string): Promise<Category> => {
    const response = await apiClient.get(`/tenants/${tenantId}/categories/${categoryId}`);
    return response.data;
  },

  createCategory: async (tenantId: string, data: { name: string; description?: string }): Promise<Category> => {
    const response = await apiClient.post(`/tenants/${tenantId}/categories`, data);
    return response.data;
  },

  updateCategory: async (tenantId: string, categoryId: string, data: { name: string; description?: string }): Promise<Category> => {
    const response = await apiClient.put(`/tenants/${tenantId}/categories/${categoryId}`, data);
    return response.data;
  },

  deleteCategory: async (tenantId: string, categoryId: string): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/categories/${categoryId}`);
  },
};