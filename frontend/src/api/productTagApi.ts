import { apiClient } from './client';

/**
 * Phase 9: Product Tags API
 * All endpoints are tenant-scoped and respect immutable multi-tenancy rules
 */

export interface ProductTag {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductTagForm {
  name: string;
  color?: string;
  description?: string;
}

interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const productTagApi = {
  /**
   * Get paginated list of tags for a tenant
   */
  getTags: async (tenantId: string, params?: PaginationParams): Promise<PaginatedResponse<ProductTag>> => {
    const response = await apiClient.get(`/tenants/${tenantId}/tags`, { params });
    return response.data;
  },

  /**
   * Get a single tag by ID
   */
  getTag: async (tenantId: string, tagId: string): Promise<ProductTag> => {
    const response = await apiClient.get(`/tenants/${tenantId}/tags/${tagId}`);
    return response.data.data;
  },

  /**
   * Create a new tag
   */
  createTag: async (tenantId: string, data: ProductTagForm): Promise<ProductTag> => {
    const response = await apiClient.post(`/tenants/${tenantId}/tags`, data);
    return response.data.data || response.data;
  },

  /**
   * Update an existing tag
   */
  updateTag: async (tenantId: string, tagId: string, data: ProductTagForm): Promise<ProductTag> => {
    const response = await apiClient.patch(`/tenants/${tenantId}/tags/${tagId}`, data);
    return response.data.data || response.data;
  },

  /**
   * Delete a tag
   */
  deleteTag: async (tenantId: string, tagId: string): Promise<void> => {
    await apiClient.delete(`/tenants/${tenantId}/tags/${tagId}`);
  },

  /**
   * Get most popular tags (most used)
   */
  getPopularTags: async (tenantId: string, limit: number = 10): Promise<ProductTag[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/tags/popular`, {
      params: { limit },
    });
    return response.data.data;
  },

  /**
   * Bulk attach tags to multiple products
   */
  bulkAttachTags: async (
    tenantId: string,
    productIds: string[],
    tagIds: string[]
  ): Promise<{ attached: number }> => {
    const response = await apiClient.post(`/tenants/${tenantId}/tags/bulk-attach`, {
      product_ids: productIds,
      tag_ids: tagIds,
    });
    return response.data;
  },

  /**
   * Bulk detach tags from multiple products
   */
  bulkDetachTags: async (
    tenantId: string,
    productIds: string[],
    tagIds: string[]
  ): Promise<{ detached: number }> => {
    const response = await apiClient.post(`/tenants/${tenantId}/tags/bulk-detach`, {
      product_ids: productIds,
      tag_ids: tagIds,
    });
    return response.data;
  },
};