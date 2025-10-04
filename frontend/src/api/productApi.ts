import { apiClient } from './client';
import type { Product, ProductForm } from '../types';

interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  stock_filter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  min_price?: number;
  max_price?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ProductStats {
  total_products: number;
  monthly_products_growth: number;
  total_value: number;
  monthly_value_growth: number;
  low_stock_items: number;
  monthly_low_stock_growth: number;
  out_of_stock_items: number;
  top_seller: {
    product_id: string | null;
    name: string;
    total_sold: number;
    total_revenue: number;
  };
  total_revenue: number;
  total_products_sold: number;
  period: {
    current_month: string;
    current_month_name: string;
  };
}

export const productApi = {
  getProducts: async (tenantId: string, params?: PaginationParams): Promise<PaginatedResponse<Product>> => {
    const response = await apiClient.get(`/tenants/${tenantId}/products`, { params });
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

  getProductStats: async (tenantId: string): Promise<ProductStats> => {
    const response = await apiClient.get(`/tenants/${tenantId}/products/stats`);
    return response.data.data;
  },

  uploadImage: async (tenantId: string, productId: string, imageFile: File): Promise<{ image_url: string; thumbnail_url: string }> => {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await apiClient.post(
      `/tenants/${tenantId}/products/${productId}/upload-image`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data;
  },

  // Bulk Operations
  bulkDelete: async (tenantId: string, productIds: string[]): Promise<{ success: number; errors: number }> => {
    const response = await apiClient.delete(`/tenants/${tenantId}/products/bulk`, {
      data: { product_ids: productIds },
    });
    return response.data;
  },

  bulkUpdateStatus: async (tenantId: string, productIds: string[], status: 'active' | 'inactive' | 'discontinued'): Promise<{ updated: number }> => {
    const response = await apiClient.patch(`/tenants/${tenantId}/products/bulk/status`, {
      product_ids: productIds,
      status,
    });
    return response.data;
  },

  bulkUpdateCategory: async (tenantId: string, productIds: string[], categoryId: string): Promise<{ updated: number }> => {
    const response = await apiClient.patch(`/tenants/${tenantId}/products/bulk/category`, {
      product_ids: productIds,
      category_id: categoryId,
    });
    return response.data;
  },

  bulkUpdatePrice: async (
    tenantId: string,
    productIds: string[],
    adjustment: {
      type: 'percentage' | 'fixed';
      operation: 'increase' | 'decrease' | 'set';
      value: number;
    }
  ): Promise<{ updated: number }> => {
    const response = await apiClient.patch(`/tenants/${tenantId}/products/bulk/price`, {
      product_ids: productIds,
      adjustment_type: adjustment.type,
      operation: adjustment.operation,
      value: adjustment.value,
    });
    return response.data;
  },
};