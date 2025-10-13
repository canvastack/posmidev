import { apiClient } from './client';
import type { Category } from '../types';

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  parent_id?: string | null;
}

export interface CategoryUpdateRequest {
  name?: string;
  description?: string;
  parent_id?: string | null;
}

export interface CategoryTreeFormat {
  format: 'tree' | 'flat';
}

export const categoryApi = {
  getCategories: async (tenantId: string, params?: CategoryTreeFormat): Promise<Category[]> => {
    const queryParams = params ? `?format=${params.format}` : '';
    const response = await apiClient.get(`/tenants/${tenantId}/categories${queryParams}`);
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },

  getCategoriesFlat: async (tenantId: string): Promise<Category[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/categories?format=flat`);
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },

  getCategoriesTree: async (tenantId: string): Promise<Category[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/categories?format=tree`);
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },

  getCategory: async (tenantId: string, categoryId: string): Promise<Category> => {
    const response = await apiClient.get(`/tenants/${tenantId}/categories/${categoryId}`);
    return response.data;
  },

  createCategory: async (tenantId: string, data: CategoryCreateRequest): Promise<Category> => {
    const response = await apiClient.post(`/tenants/${tenantId}/categories`, data);
    return response.data;
  },

  updateCategory: async (tenantId: string, categoryId: string, data: CategoryUpdateRequest): Promise<Category> => {
    const response = await apiClient.put(`/tenants/${tenantId}/categories/${categoryId}`, data);
    return response.data;
  },

  deleteCategory: async (tenantId: string, categoryId: string, deleteChildren: boolean = false): Promise<void> => {
    const queryParams = deleteChildren ? `?deleteChildren=true` : '';
    await apiClient.delete(`/tenants/${tenantId}/categories/${categoryId}${queryParams}`);
  },

  getCategoryProducts: async (tenantId: string, categoryId: string, includeSubcategories: boolean = false): Promise<any[]> => {
    const queryParams = includeSubcategories ? `?includeSubcategories=true` : '';
    const response = await apiClient.get(`/tenants/${tenantId}/categories/${categoryId}/products${queryParams}`);
    return Array.isArray(response.data) ? response.data : (response.data.data || []);
  },
};