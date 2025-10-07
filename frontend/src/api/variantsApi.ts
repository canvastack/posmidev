/**
 * Variants API Client
 * Phase 6: Product Variants
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All endpoints require tenantId parameter (tenant-scoped)
 * - All requests include bearer token authentication
 * - No cross-tenant data access
 */

import { apiClient } from './client';
import type {
  ProductVariant,
  ProductVariantInput,
  VariantListResponse,
  VariantQueryParams,
  BulkVariantCreateInput,
  BulkVariantUpdateInput,
  BulkVariantDeleteInput,
  BulkCreateResponse,
  BulkUpdateResponse,
  BulkDeleteResponse,
  VariantAttribute,
  VariantAttributeInput,
  VariantAttributeListResponse,
  AttributeQueryParams,
  VariantTemplate,
  VariantTemplateInput,
  VariantTemplateListResponse,
  TemplateQueryParams,
  ApplyTemplateInput,
  ApplyTemplatePreview,
  VariantAnalytics,
  VariantAnalyticsParams,
  TopPerformersResponse,
  VariantComparisonResponse,
  StockAdjustment,
  VariantImportResponse,
} from '../types/variant';

// ========================================
// PRODUCT VARIANTS CRUD
// ========================================

/**
 * Get all variants for a product (or all variants in tenant)
 */
export const getVariants = async (
  tenantId: string,
  params?: VariantQueryParams
): Promise<VariantListResponse> => {
  const response = await apiClient.get(`/tenants/${tenantId}/product-variants`, {
    params,
  });
  return response.data;
};

/**
 * Get variants for a specific product
 */
export const getProductVariants = async (
  tenantId: string,
  productId: string,
  params?: VariantQueryParams
): Promise<VariantListResponse> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/variants`,
    { params }
  );
  return response.data;
};

/**
 * Get a single variant by ID
 */
export const getVariant = async (
  tenantId: string,
  productId: string,
  variantId: string
): Promise<ProductVariant> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/variants/${variantId}`
  );
  return response.data.data;
};

/**
 * Create a new variant
 */
export const createVariant = async (
  tenantId: string,
  productId: string,
  data: ProductVariantInput
): Promise<ProductVariant> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/products/${productId}/variants`,
    data
  );
  return response.data.data;
};

/**
 * Update a variant
 */
export const updateVariant = async (
  tenantId: string,
  productId: string,
  variantId: string,
  data: Partial<ProductVariantInput>
): Promise<ProductVariant> => {
  const response = await apiClient.patch(
    `/tenants/${tenantId}/products/${productId}/variants/${variantId}`,
    data
  );
  return response.data.data;
};

/**
 * Delete a variant
 */
export const deleteVariant = async (
  tenantId: string,
  productId: string,
  variantId: string
): Promise<void> => {
  await apiClient.delete(
    `/tenants/${tenantId}/products/${productId}/variants/${variantId}`
  );
};

// ========================================
// BULK OPERATIONS
// ========================================

/**
 * Bulk create variants
 */
export const bulkCreateVariants = async (
  tenantId: string,
  productId: string,
  data: BulkVariantCreateInput
): Promise<BulkCreateResponse> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/products/${productId}/variants/bulk`,
    data
  );
  return response.data;
};

/**
 * Bulk update variants
 */
export const bulkUpdateVariants = async (
  tenantId: string,
  data: BulkVariantUpdateInput
): Promise<BulkUpdateResponse> => {
  const response = await apiClient.patch(
    `/tenants/${tenantId}/product-variants/bulk`,
    data
  );
  return response.data;
};

/**
 * Bulk delete variants
 */
export const bulkDeleteVariants = async (
  tenantId: string,
  data: BulkVariantDeleteInput
): Promise<BulkDeleteResponse> => {
  const response = await apiClient.delete(
    `/tenants/${tenantId}/product-variants/bulk`,
    { data }
  );
  return response.data;
};

// ========================================
// STOCK MANAGEMENT
// ========================================

/**
 * Adjust variant stock
 */
export const adjustVariantStock = async (
  tenantId: string,
  productId: string,
  variantId: string,
  adjustment: StockAdjustment
): Promise<ProductVariant> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/products/${productId}/variants/${variantId}/stock/adjust`,
    adjustment
  );
  return response.data.data;
};

/**
 * Reserve variant stock
 */
export const reserveVariantStock = async (
  tenantId: string,
  productId: string,
  variantId: string,
  quantity: number
): Promise<ProductVariant> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/products/${productId}/variants/${variantId}/stock/reserve`,
    { quantity }
  );
  return response.data.data;
};

/**
 * Release reserved stock
 */
export const releaseVariantStock = async (
  tenantId: string,
  productId: string,
  variantId: string,
  quantity: number
): Promise<ProductVariant> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/products/${productId}/variants/${variantId}/stock/release`,
    { quantity }
  );
  return response.data.data;
};

// ========================================
// VARIANT ATTRIBUTES
// ========================================

/**
 * Get all variant attributes
 */
export const getVariantAttributes = async (
  tenantId: string,
  params?: AttributeQueryParams
): Promise<VariantAttributeListResponse> => {
  const response = await apiClient.get(`/tenants/${tenantId}/variant-attributes`, {
    params,
  });
  return response.data;
};

/**
 * Get popular variant attributes (most used)
 */
export const getPopularAttributes = async (
  tenantId: string,
  limit: number = 10
): Promise<VariantAttribute[]> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/variant-attributes/popular`,
    { params: { limit } }
  );
  return response.data.data;
};

/**
 * Get a single variant attribute
 */
export const getVariantAttribute = async (
  tenantId: string,
  attributeId: string
): Promise<VariantAttribute> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/variant-attributes/${attributeId}`
  );
  return response.data.data;
};

/**
 * Create a variant attribute
 */
export const createVariantAttribute = async (
  tenantId: string,
  data: VariantAttributeInput
): Promise<VariantAttribute> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/variant-attributes`,
    data
  );
  return response.data.data;
};

/**
 * Update a variant attribute
 */
export const updateVariantAttribute = async (
  tenantId: string,
  attributeId: string,
  data: Partial<VariantAttributeInput>
): Promise<VariantAttribute> => {
  const response = await apiClient.patch(
    `/tenants/${tenantId}/variant-attributes/${attributeId}`,
    data
  );
  return response.data.data;
};

/**
 * Delete a variant attribute
 */
export const deleteVariantAttribute = async (
  tenantId: string,
  attributeId: string
): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}/variant-attributes/${attributeId}`);
};

/**
 * Add value to attribute
 */
export const addAttributeValue = async (
  tenantId: string,
  attributeId: string,
  value: string
): Promise<VariantAttribute> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/variant-attributes/${attributeId}/values`,
    { value }
  );
  return response.data.data;
};

/**
 * Remove value from attribute
 */
export const removeAttributeValue = async (
  tenantId: string,
  attributeId: string,
  value: string
): Promise<VariantAttribute> => {
  const response = await apiClient.delete(
    `/tenants/${tenantId}/variant-attributes/${attributeId}/values/${value}`
  );
  return response.data.data;
};

// ========================================
// VARIANT TEMPLATES
// ========================================

/**
 * Get all variant templates
 */
export const getVariantTemplates = async (
  tenantId: string,
  params?: TemplateQueryParams
): Promise<VariantTemplateListResponse> => {
  const response = await apiClient.get(`/tenants/${tenantId}/variant-templates`, {
    params,
  });
  return response.data;
};

/**
 * Get a single variant template
 */
export const getVariantTemplate = async (
  tenantId: string,
  templateId: string
): Promise<VariantTemplate> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/variant-templates/${templateId}`
  );
  return response.data.data;
};

/**
 * Create a variant template
 */
export const createVariantTemplate = async (
  tenantId: string,
  data: VariantTemplateInput
): Promise<VariantTemplate> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/variant-templates`,
    data
  );
  return response.data.data;
};

/**
 * Update a variant template
 */
export const updateVariantTemplate = async (
  tenantId: string,
  templateId: string,
  data: Partial<VariantTemplateInput>
): Promise<VariantTemplate> => {
  const response = await apiClient.patch(
    `/tenants/${tenantId}/variant-templates/${templateId}`,
    data
  );
  return response.data.data;
};

/**
 * Delete a variant template
 */
export const deleteVariantTemplate = async (
  tenantId: string,
  templateId: string
): Promise<void> => {
  await apiClient.delete(`/tenants/${tenantId}/variant-templates/${templateId}`);
};

/**
 * Preview template application (spec-aligned)
 * Maps FE params to backend: uses data.template_id as path param and sends { product_id }
 */
export const previewTemplate = async (
  tenantId: string,
  productId: string,
  data: ApplyTemplateInput
): Promise<ApplyTemplatePreview> => {
  const templateId = data.template_id;
  const response = await apiClient.post(
    `/tenants/${tenantId}/variant-templates/${templateId}/preview`,
    { product_id: productId }
  );

  const preview = response.data?.preview;
  return {
    expected_count: preview?.variant_count ?? 0,
    variants: preview?.variants ?? [],
    warnings: [],
  };
};

/**
 * Apply template to product (spec-aligned)
 * Maps FE params to backend: uses data.template_id as path param and sends { product_id, override_existing }
 */
export const applyTemplate = async (
  tenantId: string,
  productId: string,
  data: ApplyTemplateInput
): Promise<BulkCreateResponse> => {
  const templateId = data.template_id;
  const response = await apiClient.post(
    `/tenants/${tenantId}/variant-templates/${templateId}/apply`,
    {
      product_id: productId,
      ...(data.override_existing !== undefined ? { override_existing: data.override_existing } : {}),
    }
  );

  // Adapt backend response to BulkCreateResponse shape expected by UI
  const createdCount: number = response.data?.variants_created ?? 0;
  return {
    success: true,
    created_count: createdCount,
    failed_count: 0,
    variants: [],
  };
};

// ========================================
// VARIANT ANALYTICS
// ========================================

/**
 * Get analytics for a single variant
 */
export const getVariantAnalytics = async (
  tenantId: string,
  productId: string,
  variantId: string,
  params?: VariantAnalyticsParams
): Promise<VariantAnalytics[]> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/variants/${variantId}/analytics`,
    { params }
  );
  return response.data.data;
};

/**
 * Get analytics for all variants of a product
 */
export const getProductVariantAnalytics = async (
  tenantId: string,
  productId: string,
  params?: VariantAnalyticsParams
): Promise<VariantAnalytics[]> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/products/${productId}/variants/analytics`,
    { params }
  );
  return response.data.data;
};

/**
 * Get top performing variants
 */
export const getTopPerformers = async (
  tenantId: string,
  params?: VariantAnalyticsParams
): Promise<TopPerformersResponse> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/variant-analytics/top-performers`,
    { params }
  );
  return response.data;
};

/**
 * Compare multiple variants
 */
export const compareVariants = async (
  tenantId: string,
  variantIds: string[],
  params?: VariantAnalyticsParams
): Promise<VariantComparisonResponse> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/variant-analytics/compare`,
    { variant_ids: variantIds, ...params }
  );
  return response.data;
};

/**
 * Get performance summary for all variants
 */
export const getVariantPerformanceSummary = async (
  tenantId: string,
  params?: VariantAnalyticsParams
): Promise<any> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/variant-analytics/performance-summary`,
    { params }
  );
  return response.data;
};

// ========================================
// IMPORT/EXPORT
// ========================================

/**
 * Export variants to Excel/CSV
 */
export const exportVariants = async (
  tenantId: string,
  params?: {
    format?: 'xlsx' | 'csv';
    product_id?: string;
    search?: string;
    is_active?: boolean;
  }
): Promise<Blob> => {
  const response = await apiClient.get(`/tenants/${tenantId}/product-variants/export`, {
    params,
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Download import template
 */
export const downloadImportTemplate = async (tenantId: string): Promise<Blob> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/product-variants/import/template`,
    { responseType: 'blob' }
  );
  return response.data;
};

/**
 * Import variants from Excel/CSV
 */
export const importVariants = async (
  tenantId: string,
  file: File,
  options?: {
    update_existing?: boolean;
  }
): Promise<VariantImportResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.update_existing !== undefined) {
    formData.append('update_existing', options.update_existing ? '1' : '0');
  }

  const response = await apiClient.post(
    `/tenants/${tenantId}/product-variants/import`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generate SKU for variant (based on pattern)
 */
export const generateVariantSKU = async (
  tenantId: string,
  data: {
    product_id: string;
    attributes: Record<string, string>;
    pattern?: string;
  }
): Promise<{ sku: string }> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/product-variants/generate-sku`,
    data
  );
  return response.data;
};

/**
 * Calculate variant price with modifiers
 */
export const calculateVariantPrice = async (
  tenantId: string,
  data: {
    base_price: number;
    attributes: Record<string, string>;
    price_modifier?: number;
  }
): Promise<{ price: number; breakdown: Record<string, number> }> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/product-variants/calculate-price`,
    data
  );
  return response.data;
};

// Default export with all methods
export const variantsApi = {
  // CRUD
  getVariants,
  getProductVariants,
  getVariant,
  createVariant,
  updateVariant,
  deleteVariant,
  
  // Bulk operations
  bulkCreateVariants,
  bulkUpdateVariants,
  bulkDeleteVariants,
  
  // Stock management
  adjustVariantStock,
  reserveVariantStock,
  releaseVariantStock,
  
  // Attributes
  getVariantAttributes,
  getPopularAttributes,
  getVariantAttribute,
  createVariantAttribute,
  updateVariantAttribute,
  deleteVariantAttribute,
  addAttributeValue,
  removeAttributeValue,
  
  // Templates
  getVariantTemplates,
  getVariantTemplate,
  createVariantTemplate,
  updateVariantTemplate,
  deleteVariantTemplate,
  previewTemplate,
  applyTemplate,
  
  // Analytics
  getVariantAnalytics,
  getProductVariantAnalytics,
  getTopPerformers,
  compareVariants,
  getVariantPerformanceSummary,
  
  // Import/Export
  exportVariants,
  downloadImportTemplate,
  importVariants,
  
  // Utilities
  generateVariantSKU,
  calculateVariantPrice,
};

export default variantsApi;