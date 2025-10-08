import { apiClient } from './client';

/**
 * Phase 9: SKU Auto-Generation API
 * All endpoints are tenant-scoped and respect immutable multi-tenancy rules
 */

export interface SkuPattern {
  pattern: string;
  example: string;
  description: string;
}

export interface SkuGenerateRequest {
  pattern: string;
  category_id?: string;
}

export interface SkuGenerateResponse {
  sku: string;
  pattern_used: string;
}

export interface SkuValidateRequest {
  sku: string;
}

export interface SkuValidateResponse {
  available: boolean;
  suggested_sku?: string;
}

export const skuApi = {
  /**
   * Get available SKU patterns
   */
  getPatterns: async (tenantId: string): Promise<SkuPattern[]> => {
    const response = await apiClient.get(`/tenants/${tenantId}/sku/patterns`);
    return response.data.data;
  },

  /**
   * Generate a new SKU (increments sequence)
   */
  generateSku: async (tenantId: string, data: SkuGenerateRequest): Promise<SkuGenerateResponse> => {
    const response = await apiClient.post(`/tenants/${tenantId}/sku/generate`, data);
    return response.data.data;
  },

  /**
   * Preview SKU without incrementing sequence
   */
  previewSku: async (tenantId: string, data: SkuGenerateRequest): Promise<SkuGenerateResponse> => {
    const response = await apiClient.post(`/tenants/${tenantId}/sku/preview`, data);
    return response.data.data;
  },

  /**
   * Validate if SKU is available
   */
  validateSku: async (tenantId: string, data: SkuValidateRequest): Promise<SkuValidateResponse> => {
    const response = await apiClient.post(`/tenants/${tenantId}/sku/validate`, data);
    return response.data.data;
  },
};