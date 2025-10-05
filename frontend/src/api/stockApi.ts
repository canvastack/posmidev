/**
 * Stock Management API Client
 * Phase 5 Sprint 4: Frontend Components
 * 
 * IMMUTABLE RULES ENFORCED:
 * - All requests are tenant-scoped (tenantId in URL)
 * - Bearer token authentication (via apiClient interceptor)
 * - Strictly tenant-isolated data access
 */

import { apiClient } from './client';
import type {
  StockAlert,
  StockAlertStats,
  StockAlertFilters,
  StockAlertAction,
  StockAlertActionResponse,
  PaginatedAlertsResponse,
  LowStockProduct,
  LowStockProductsFilters,
  LowStockProductsResponse,
  AdjustmentReason,
  StockAdjustmentForm,
  ApiSuccessResponse,
} from '../types/stock';

// ============================================================================
// Stock Alerts API
// ============================================================================

/**
 * Get paginated list of stock alerts
 * Endpoint: GET /tenants/{tenantId}/stock-alerts
 */
export const getStockAlerts = async (
  tenantId: string,
  filters?: StockAlertFilters
): Promise<PaginatedAlertsResponse> => {
  const response = await apiClient.get(`/tenants/${tenantId}/stock-alerts`, {
    params: filters,
  });
  return response.data;
};

/**
 * Get stock alert statistics
 * Endpoint: GET /tenants/{tenantId}/stock-alerts/stats
 */
export const getStockAlertStats = async (
  tenantId: string
): Promise<StockAlertStats> => {
  const response = await apiClient.get(`/tenants/${tenantId}/stock-alerts/stats`);
  return response.data;
};

/**
 * Acknowledge a stock alert
 * Endpoint: POST /tenants/{tenantId}/stock-alerts/{alertId}/acknowledge
 * 
 * Requirements:
 * - User must have 'inventory.view' or 'products.view' permission
 * - Alert must be in 'pending' status
 * - Alert must belong to the same tenant
 */
export const acknowledgeAlert = async (
  tenantId: string,
  alertId: string,
  action: StockAlertAction
): Promise<StockAlertActionResponse> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/stock-alerts/${alertId}/acknowledge`,
    action
  );
  return response.data;
};

/**
 * Resolve a stock alert
 * Endpoint: POST /tenants/{tenantId}/stock-alerts/{alertId}/resolve
 * 
 * Requirements:
 * - User must have 'inventory.adjust' permission
 * - Alert must not be closed (resolved/dismissed)
 * - Alert must belong to the same tenant
 */
export const resolveAlert = async (
  tenantId: string,
  alertId: string,
  action: StockAlertAction
): Promise<StockAlertActionResponse> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/stock-alerts/${alertId}/resolve`,
    action
  );
  return response.data;
};

/**
 * Dismiss a stock alert
 * Endpoint: POST /tenants/{tenantId}/stock-alerts/{alertId}/dismiss
 * 
 * Requirements:
 * - User must have 'inventory.view' or 'products.view' permission
 * - Alert must not be closed (resolved/dismissed)
 * - Alert must belong to the same tenant
 */
export const dismissAlert = async (
  tenantId: string,
  alertId: string,
  action: StockAlertAction
): Promise<StockAlertActionResponse> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/stock-alerts/${alertId}/dismiss`,
    action
  );
  return response.data;
};

/**
 * Get list of low stock products
 * Endpoint: GET /tenants/{tenantId}/stock-alerts/low-stock-products
 */
export const getLowStockProducts = async (
  tenantId: string,
  filters?: LowStockProductsFilters
): Promise<LowStockProductsResponse> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/stock-alerts/low-stock-products`,
    { params: filters }
  );
  return response.data;
};

// ============================================================================
// Stock Adjustments API
// ============================================================================

/**
 * Get available adjustment reasons
 * Endpoint: GET /tenants/{tenantId}/stock-adjustments/reasons
 */
export const getAdjustmentReasons = async (
  tenantId: string
): Promise<AdjustmentReason[]> => {
  const response = await apiClient.get(
    `/tenants/${tenantId}/stock-adjustments/reasons`
  );
  return response.data.data;
};

/**
 * Adjust product stock
 * Endpoint: POST /tenants/{tenantId}/products/{productId}/stock/adjust
 * 
 * Requirements:
 * - User must have 'inventory.adjust' permission
 * - Product must belong to the same tenant
 * - Adjustment must not result in negative stock
 */
export const adjustStock = async (
  tenantId: string,
  productId: string,
  adjustment: StockAdjustmentForm
): Promise<ApiSuccessResponse<any>> => {
  const response = await apiClient.post(
    `/tenants/${tenantId}/products/${productId}/stock/adjust`,
    adjustment
  );
  return response.data;
};

// ============================================================================
// Stock API Object (for consistency with other API files)
// ============================================================================

export const stockApi = {
  // Alerts
  getStockAlerts,
  getStockAlertStats,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  getLowStockProducts,
  
  // Adjustments
  getAdjustmentReasons,
  adjustStock,
};

export default stockApi;