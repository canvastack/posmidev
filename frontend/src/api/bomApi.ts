/**
 * BOM Engine API
 * API client for Bill of Materials functionality
 */

import { apiClient } from './client';
import type {
  Material,
  MaterialFilters,
  MaterialCreateRequest,
  MaterialUpdateRequest,
  AdjustStockRequest,
  Recipe,
  RecipeFilters,
  RecipeCreateRequest,
  RecipeUpdateRequest,
  RecipeComponentCreateRequest,
  RecipeComponentUpdateRequest,
  RecipeMaterial,
  InventoryTransaction,
  BOMCalculationResult,
  BulkAvailabilityRequest,
  BulkAvailabilityResponse,
  BatchRequirementsRequest,
  BatchRequirementsResponse,
  MultiProductPlanRequest,
  MultiProductPlanResponse,
  StockStatusSummary,
  CategorySummary,
  UsageTrend,
  CostAnalysis,
  TurnoverRate,
  StockAlert,
  PredictiveAlert,
  ReorderRecommendation,
  AlertDashboard,
  PaginatedResponse,
  ApiResponse,
} from '../types/bom';

// ==================== MATERIALS API ====================

export const materialsApi = {
  /**
   * Get all materials for a tenant with filters and pagination
   */
  getAll: async (
    tenantId: string,
    filters?: MaterialFilters
  ): Promise<PaginatedResponse<Material>> => {
    const { data } = await apiClient.get<PaginatedResponse<Material>>(
      `/tenants/${tenantId}/materials`,
      { params: filters }
    );
    return data;
  },

  /**
   * Get a single material by ID
   */
  getById: async (tenantId: string, materialId: string): Promise<ApiResponse<Material>> => {
    const { data } = await apiClient.get<ApiResponse<Material>>(
      `/tenants/${tenantId}/materials/${materialId}`
    );
    return data;
  },

  /**
   * Create a new material
   */
  create: async (
    tenantId: string,
    material: MaterialCreateRequest
  ): Promise<ApiResponse<Material>> => {
    const { data } = await apiClient.post<ApiResponse<Material>>(
      `/tenants/${tenantId}/materials`,
      material
    );
    return data;
  },

  /**
   * Update an existing material
   */
  update: async (
    tenantId: string,
    materialId: string,
    material: MaterialUpdateRequest
  ): Promise<ApiResponse<Material>> => {
    const { data } = await apiClient.put<ApiResponse<Material>>(
      `/tenants/${tenantId}/materials/${materialId}`,
      material
    );
    return data;
  },

  /**
   * Delete a material (soft delete)
   */
  delete: async (tenantId: string, materialId: string): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(
      `/tenants/${tenantId}/materials/${materialId}`
    );
    return data;
  },

  /**
   * Bulk create materials
   */
  bulkCreate: async (
    tenantId: string,
    materials: MaterialCreateRequest[]
  ): Promise<ApiResponse<{ created: Material[]; errors: any[] }>> => {
    const { data } = await apiClient.post<
      ApiResponse<{ created: Material[]; errors: any[] }>
    >(`/tenants/${tenantId}/materials/bulk`, { materials });
    return data;
  },

  /**
   * Adjust material stock (add/subtract/set)
   */
  adjustStock: async (
    tenantId: string,
    materialId: string,
    adjustment: AdjustStockRequest
  ): Promise<ApiResponse<{ material: Material; transaction: InventoryTransaction }>> => {
    const { data } = await apiClient.post<
      ApiResponse<{ material: Material; transaction: InventoryTransaction }>
    >(`/tenants/${tenantId}/materials/${materialId}/adjust-stock`, adjustment);
    return data;
  },

  /**
   * Get materials with low stock
   */
  getLowStock: async (tenantId: string): Promise<ApiResponse<Material[]>> => {
    const { data } = await apiClient.get<ApiResponse<Material[]>>(
      `/tenants/${tenantId}/materials/low-stock`
    );
    return data;
  },

  /**
   * Export materials to CSV
   */
  export: async (tenantId: string, filters?: MaterialFilters): Promise<Blob> => {
    const { data } = await apiClient.get(`/tenants/${tenantId}/materials/export`, {
      params: filters,
      responseType: 'blob',
    });
    return data;
  },

  /**
   * Import materials from CSV
   */
  import: async (tenantId: string, file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post<ApiResponse<any>>(
      `/tenants/${tenantId}/materials/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return data;
  },

  /**
   * Download import template CSV
   */
  downloadTemplate: async (tenantId: string): Promise<Blob> => {
    const { data } = await apiClient.get(
      `/tenants/${tenantId}/materials/import-template`,
      {
        responseType: 'blob',
      }
    );
    return data;
  },

  /**
   * Get low stock report (detailed)
   */
  getLowStockReport: async (tenantId: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/materials/low-stock-report`
    );
    return data;
  },
};

// ==================== RECIPES API ====================

export const recipesApi = {
  /**
   * Get all recipes for a tenant with filters and pagination
   */
  getAll: async (
    tenantId: string,
    filters?: RecipeFilters
  ): Promise<PaginatedResponse<Recipe>> => {
    const { data } = await apiClient.get<PaginatedResponse<Recipe>>(
      `/tenants/${tenantId}/recipes`,
      { params: filters }
    );
    return data;
  },

  /**
   * Get a single recipe by ID with materials
   */
  getById: async (tenantId: string, recipeId: string): Promise<ApiResponse<Recipe>> => {
    const { data } = await apiClient.get<ApiResponse<Recipe>>(
      `/tenants/${tenantId}/recipes/${recipeId}`
    );
    return data;
  },

  /**
   * Create a new recipe with materials
   */
  create: async (
    tenantId: string,
    recipe: RecipeCreateRequest
  ): Promise<ApiResponse<Recipe>> => {
    const { data } = await apiClient.post<ApiResponse<Recipe>>(
      `/tenants/${tenantId}/recipes`,
      recipe
    );
    return data;
  },

  /**
   * Update an existing recipe (metadata only, not materials)
   */
  update: async (
    tenantId: string,
    recipeId: string,
    recipe: RecipeUpdateRequest
  ): Promise<ApiResponse<Recipe>> => {
    const { data } = await apiClient.put<ApiResponse<Recipe>>(
      `/tenants/${tenantId}/recipes/${recipeId}`,
      recipe
    );
    return data;
  },

  /**
   * Delete a recipe (soft delete)
   */
  delete: async (tenantId: string, recipeId: string): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(
      `/tenants/${tenantId}/recipes/${recipeId}`
    );
    return data;
  },

  /**
   * Activate a recipe (sets it as active for the product)
   */
  activate: async (tenantId: string, recipeId: string): Promise<ApiResponse<Recipe>> => {
    const { data } = await apiClient.post<ApiResponse<Recipe>>(
      `/tenants/${tenantId}/recipes/${recipeId}/activate`
    );
    return data;
  },

  /**
   * Get recipe cost breakdown
   */
  getCostBreakdown: async (
    tenantId: string,
    recipeId: string
  ): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/recipes/${recipeId}/cost-breakdown`
    );
    return data;
  },
};

// ==================== RECIPE COMPONENTS API ====================

export const recipeComponentsApi = {
  /**
   * Add a material component to a recipe
   */
  create: async (
    tenantId: string,
    recipeId: string,
    component: RecipeComponentCreateRequest
  ): Promise<ApiResponse<RecipeMaterial>> => {
    const { data } = await apiClient.post<ApiResponse<RecipeMaterial>>(
      `/tenants/${tenantId}/recipes/${recipeId}/components`,
      component
    );
    return data;
  },

  /**
   * Update a recipe component
   */
  update: async (
    tenantId: string,
    recipeId: string,
    componentId: string,
    component: RecipeComponentUpdateRequest
  ): Promise<ApiResponse<RecipeMaterial>> => {
    const { data } = await apiClient.put<ApiResponse<RecipeMaterial>>(
      `/tenants/${tenantId}/recipes/${recipeId}/components/${componentId}`,
      component
    );
    return data;
  },

  /**
   * Remove a component from a recipe
   */
  delete: async (
    tenantId: string,
    recipeId: string,
    componentId: string
  ): Promise<ApiResponse<void>> => {
    const { data } = await apiClient.delete<ApiResponse<void>>(
      `/tenants/${tenantId}/recipes/${recipeId}/components/${componentId}`
    );
    return data;
  },
};

// ==================== BOM CALCULATION API ====================

export const bomCalculationApi = {
  /**
   * Calculate available quantity for a product
   */
  getAvailableQuantity: async (
    tenantId: string,
    productId: string
  ): Promise<ApiResponse<BOMCalculationResult>> => {
    const { data } = await apiClient.get<ApiResponse<BOMCalculationResult>>(
      `/tenants/${tenantId}/bom/products/${productId}/available-quantity`
    );
    return data;
  },

  /**
   * Calculate available quantity for multiple products
   */
  getBulkAvailability: async (
    tenantId: string,
    request: BulkAvailabilityRequest
  ): Promise<ApiResponse<BulkAvailabilityResponse>> => {
    const { data } = await apiClient.post<ApiResponse<BulkAvailabilityResponse>>(
      `/tenants/${tenantId}/bom/bulk-availability`,
      request
    );
    return data;
  },

  /**
   * Get production capacity forecast for a product
   */
  getProductionCapacity: async (
    tenantId: string,
    productId: string
  ): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/bom/products/${productId}/production-capacity`
    );
    return data;
  },
};

// ==================== BATCH PRODUCTION API ====================

export const batchProductionApi = {
  /**
   * Calculate batch requirements and cost estimate
   */
  getBatchRequirements: async (
    tenantId: string,
    request: BatchRequirementsRequest
  ): Promise<ApiResponse<BatchRequirementsResponse>> => {
    const { data } = await apiClient.post<ApiResponse<BatchRequirementsResponse>>(
      `/tenants/${tenantId}/bom/batch-requirements`,
      request
    );
    return data;
  },

  /**
   * Calculate optimal batch size given constraints
   */
  getOptimalBatchSize: async (
    tenantId: string,
    request: {
      product_id: string;
      min_quantity?: number;
      max_quantity?: number;
      target_cost?: number;
    }
  ): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.post<ApiResponse<any>>(
      `/tenants/${tenantId}/bom/optimal-batch-size`,
      request
    );
    return data;
  },

  /**
   * Plan multi-product batch production
   */
  getMultiProductPlan: async (
    tenantId: string,
    request: MultiProductPlanRequest
  ): Promise<ApiResponse<MultiProductPlanResponse>> => {
    const { data } = await apiClient.post<ApiResponse<MultiProductPlanResponse>>(
      `/tenants/${tenantId}/bom/multi-product-plan`,
      request
    );
    return data;
  },
};

// ==================== ANALYTICS API ====================

export const bomAnalyticsApi = {
  /**
   * Get stock status summary
   */
  getStockStatus: async (tenantId: string): Promise<ApiResponse<StockStatusSummary>> => {
    const { data } = await apiClient.get<ApiResponse<StockStatusSummary>>(
      `/tenants/${tenantId}/bom/analytics/stock-status`
    );
    return data;
  },

  /**
   * Get materials grouped by category
   */
  getCategories: async (tenantId: string): Promise<ApiResponse<CategorySummary[]>> => {
    const { data } = await apiClient.get<ApiResponse<CategorySummary[]>>(
      `/tenants/${tenantId}/bom/analytics/categories`
    );
    return data;
  },

  /**
   * Get usage trends over time
   */
  getUsageTrends: async (
    tenantId: string,
    days: number = 30
  ): Promise<ApiResponse<UsageTrend[]>> => {
    const { data } = await apiClient.get<ApiResponse<UsageTrend[]>>(
      `/tenants/${tenantId}/bom/analytics/usage-trends`,
      { params: { days } }
    );
    return data;
  },

  /**
   * Get cost analysis by material
   */
  getCostAnalysis: async (
    tenantId: string,
    filters?: { categories?: string[]; start_date?: string; end_date?: string }
  ): Promise<ApiResponse<CostAnalysis[]>> => {
    const { data } = await apiClient.get<ApiResponse<CostAnalysis[]>>(
      `/tenants/${tenantId}/bom/analytics/cost-analysis`,
      { params: filters }
    );
    return data;
  },

  /**
   * Get material turnover rates
   */
  getTurnoverRate: async (
    tenantId: string,
    days: number = 30
  ): Promise<ApiResponse<TurnoverRate[]>> => {
    const { data } = await apiClient.get<ApiResponse<TurnoverRate[]>>(
      `/tenants/${tenantId}/bom/analytics/turnover-rate`,
      { params: { days } }
    );
    return data;
  },
};

// ==================== ALERTS API ====================

export const bomAlertsApi = {
  /**
   * Get active stock alerts
   */
  getActiveAlerts: async (tenantId: string): Promise<ApiResponse<StockAlert[]>> => {
    const { data } = await apiClient.get<ApiResponse<StockAlert[]>>(
      `/tenants/${tenantId}/bom/alerts/active`
    );
    return data;
  },

  /**
   * Get predictive alerts (forecast-based)
   */
  getPredictiveAlerts: async (
    tenantId: string,
    forecastDays: number = 30
  ): Promise<ApiResponse<PredictiveAlert[]>> => {
    const { data } = await apiClient.get<ApiResponse<PredictiveAlert[]>>(
      `/tenants/${tenantId}/bom/alerts/predictive`,
      { params: { forecast_days: forecastDays } }
    );
    return data;
  },

  /**
   * Get reorder recommendations
   */
  getReorderRecommendations: async (
    tenantId: string,
    targetDays: number = 30
  ): Promise<ApiResponse<ReorderRecommendation[]>> => {
    const { data } = await apiClient.get<ApiResponse<ReorderRecommendation[]>>(
      `/tenants/${tenantId}/bom/alerts/reorder-recommendations`,
      { params: { target_days_of_stock: targetDays } }
    );
    return data;
  },

  /**
   * Get comprehensive alert dashboard
   */
  getDashboard: async (tenantId: string): Promise<ApiResponse<AlertDashboard>> => {
    const { data } = await apiClient.get<ApiResponse<AlertDashboard>>(
      `/tenants/${tenantId}/bom/alerts/dashboard`
    );
    return data;
  },
};

// ==================== REPORTING API ====================

export const bomReportsApi = {
  /**
   * Get executive dashboard summary
   */
  getExecutiveDashboard: async (tenantId: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/bom/reports/executive-dashboard`
    );
    return data;
  },

  /**
   * Get material usage report
   */
  getMaterialUsage: async (
    tenantId: string,
    filters?: { start_date?: string; end_date?: string; material_ids?: string[] }
  ): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/bom/reports/material-usage`,
      { params: filters }
    );
    return data;
  },

  /**
   * Get recipe costing report
   */
  getRecipeCosting: async (tenantId: string): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/bom/reports/recipe-costing`
    );
    return data;
  },

  /**
   * Get stock movement report
   */
  getStockMovement: async (
    tenantId: string,
    filters?: { start_date?: string; end_date?: string }
  ): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/bom/reports/stock-movement`,
      { params: filters }
    );
    return data;
  },

  /**
   * Get production efficiency report
   */
  getProductionEfficiency: async (
    tenantId: string,
    filters?: { start_date?: string; end_date?: string }
  ): Promise<ApiResponse<any>> => {
    const { data } = await apiClient.get<ApiResponse<any>>(
      `/tenants/${tenantId}/bom/reports/production-efficiency`,
      { params: filters }
    );
    return data;
  },

  /**
   * Export report to PDF/Excel
   */
  export: async (
    tenantId: string,
    reportType: string,
    format: 'pdf' | 'excel' = 'pdf'
  ): Promise<Blob> => {
    const { data } = await apiClient.post(
      `/tenants/${tenantId}/bom/reports/export`,
      { report_type: reportType, format },
      { responseType: 'blob' }
    );
    return data;
  },
};

// ==================== COMBINED EXPORT ====================

export const bomApi = {
  materials: materialsApi,
  recipes: recipesApi,
  recipeComponents: recipeComponentsApi,
  bomCalculation: bomCalculationApi,
  batchProduction: batchProductionApi,
  analytics: bomAnalyticsApi,
  alerts: bomAlertsApi,
  reports: bomReportsApi,
};

export default bomApi;