import { apiClient } from './client';
import { Product, ProductForm } from '../types';

export const productApi = {
  getProducts: async (tenantId: string): Promise<Product[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/products`);
    return response.data;
  },

  getProduct: async (tenantId: string, productId: string): Promise<Product> => {
    const response = await apiClient.get(`/tenants/${tenantId}/products/${productId}`);
    return response.data;
  },

  createProduct: async (tenantId: string, data: ProductForm): Promise<Product> => {
    const response = await apiClient.post(`/tenants/${tenantId}/products`, data);
    return response.data;
  },

  updateProduct: async (tenantId: string, productId: string, data: ProductForm): Promise<Product> => {
    const response = await apiClient.put(`/tenants/${tenantId}/products/${productId}`, data);
    return response.data;
  },

  deleteProduct: async (tenantId: string, productId: string): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/products/${productId}`);
  },
};