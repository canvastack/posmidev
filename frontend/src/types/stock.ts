/**
 * Stock Management Types
 * Phase 5 Sprint 4: Frontend Components
 * 
 * IMMUTABLE RULES ENFORCED:
 * - All data is tenant-scoped (tenant_id required)
 * - UUIDs for all primary keys
 * - Strictly tenant-isolated operations
 */

// ============================================================================
// Stock Alert Types
// ============================================================================

export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'dismissed';
export type AlertSeverity = 'low' | 'critical' | 'out_of_stock';

export interface StockAlert {
  id: string;
  tenant_id: string;
  product_id: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    image_url?: string | null;
    thumbnail_url?: string | null;
    category_id?: string;
    category?: {
      id: string;
      name: string;
    };
  };
  
  // Alert details
  severity: AlertSeverity;
  current_stock: number;
  reorder_point: number;
  reorder_quantity: number;
  
  // Status tracking
  status: AlertStatus;
  notified_at: string | null;
  
  // User actions
  acknowledged_by_id: string | null;
  acknowledged_by?: {
    id: string;
    name: string;
    email: string;
  };
  acknowledged_at: string | null;
  acknowledged_notes: string | null;
  
  resolved_by_id: string | null;
  resolved_by?: {
    id: string;
    name: string;
    email: string;
  };
  resolved_at: string | null;
  resolved_notes: string | null;
  
  dismissed_by_id: string | null;
  dismissed_by?: {
    id: string;
    name: string;
    email: string;
  };
  dismissed_at: string | null;
  dismissed_notes: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Computed properties
  severity_color?: string;
  status_color?: string;
  is_actionable?: boolean;
  is_closed?: boolean;
}

export interface StockAlertStats {
  total_alerts: number;
  by_status: {
    pending: number;
    acknowledged: number;
    resolved: number;
    dismissed: number;
  };
  by_severity: {
    low: number;
    critical: number;
    out_of_stock: number;
  };
  actionable_count: number; // pending + acknowledged
  not_notified: number;
}

export interface StockAlertFilters {
  status?: AlertStatus;
  severity?: AlertSeverity;
  product_id?: string;
  actionable_only?: boolean;
  sort_by?: 'created_at' | 'current_stock' | 'severity' | 'status';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface StockAlertAction {
  notes?: string;
}

// ============================================================================
// Low Stock Product Types
// ============================================================================

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  reorder_point: number;
  reorder_quantity: number;
  stock_status: 'in_stock' | 'low_stock' | 'critical_stock' | 'out_of_stock';
  stock_percentage: number;
  severity: AlertSeverity;
  recommended_order_quantity: number;
  
  category_id?: string;
  category?: {
    id: string;
    name: string;
  };
  
  price: number;
  cost_price?: number;
  image_url?: string | null;
  thumbnail_url?: string | null;
  
  low_stock_alert_enabled: boolean;
  last_alerted_at: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface LowStockProductsFilters {
  severity?: AlertSeverity | 'all';
  sort_by?: 'stock' | 'name' | 'reorder_point' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface LowStockSummary {
  total: number;
  critical: number;
  out_of_stock: number;
}

export interface LowStockProductsResponse {
  data: LowStockProduct[];
  summary: LowStockSummary;
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ============================================================================
// Stock Adjustment Types
// ============================================================================

export type AdjustmentType = 
  | 'inventory_count' 
  | 'damage' 
  | 'return' 
  | 'theft' 
  | 'expired' 
  | 'correction' 
  | 'manual' 
  | 'initial_stock'
  | 'adjustment'
  | 'restock'
  | 'audit'
  | 'other';

export interface AdjustmentReason {
  value: AdjustmentType;
  label: string;
  description: string;
  type: 'addition' | 'deduction' | 'both';
}

export interface StockAdjustmentForm {
  adjustment: number; // Positive = add, Negative = deduct
  change_type: AdjustmentType;
  notes?: string;
}

export interface StockAdjustmentPreview {
  current_stock: number;
  adjustment: number;
  new_stock: number;
  change_type: AdjustmentType;
  is_valid: boolean;
  error?: string;
}

// ============================================================================
// Paginated Response (for consistency with backend)
// ============================================================================

export interface PaginatedAlertsResponse {
  data: StockAlert[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiSuccessResponse<T = any> {
  message: string;
  data: T;
}

export interface StockAlertActionResponse {
  message: string;
  data: StockAlert;
}