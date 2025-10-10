/**
 * BOM Engine Types
 * Type definitions for Bill of Materials functionality
 */

// ==================== ENUMS ====================

export type MaterialUnit =
  | 'kg'
  | 'g'
  | 'L'
  | 'ml'
  | 'pcs'
  | 'box'
  | 'bottle'
  | 'can'
  | 'bag';

export type RecipeYieldUnit = 'pcs' | 'kg' | 'L' | 'serving' | 'batch';

export type TransactionType = 'adjustment' | 'deduction' | 'restock';

export type TransactionReason =
  | 'purchase'
  | 'waste'
  | 'damage'
  | 'count_adjustment'
  | 'production'
  | 'sale'
  | 'other';

export type StockStatus = 'normal' | 'low' | 'critical' | 'out_of_stock';

export type AlertLevel = 'info' | 'warning' | 'critical';

// ==================== CORE ENTITIES ====================

export interface Material {
  id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  category: string | null;
  unit: MaterialUnit;
  stock_quantity: number;
  reorder_level: number;
  unit_cost: number;
  supplier: string | null;
  is_low_stock?: boolean;
  stock_status?: StockStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface Recipe {
  id: string;
  tenant_id: string;
  product_id: string;
  name: string;
  description: string | null;
  yield_quantity: number;
  yield_unit: RecipeYieldUnit;
  is_active: boolean;
  notes: string | null;
  total_cost?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  // Relations
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  materials?: RecipeMaterial[];
}

export interface RecipeMaterial {
  id: string;
  tenant_id: string;
  recipe_id: string;
  material_id: string;
  quantity_required: number;
  unit: string;
  waste_percentage: number;
  effective_quantity?: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  material?: Material;
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  material_id: string;
  transaction_type: TransactionType;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reason: TransactionReason;
  notes: string | null;
  user_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  // Relations
  material?: Material;
  user?: {
    id: string;
    name: string;
  };
}

// ==================== REQUEST/RESPONSE DTOs ====================

export interface MaterialFilters {
  search?: string;
  category?: string;
  unit?: MaterialUnit;
  status?: 'low_stock' | 'out_of_stock' | 'normal';
  sort_by?: 'name' | 'sku' | 'stock_quantity' | 'unit_cost' | 'created_at';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface MaterialCreateRequest {
  name: string;
  sku?: string | null;
  description?: string | null;
  category?: string | null;
  unit: MaterialUnit;
  stock_quantity: number;
  reorder_level?: number;
  unit_cost?: number;
  supplier?: string | null;
}

export interface MaterialUpdateRequest extends Partial<MaterialCreateRequest> {}

export interface AdjustStockRequest {
  transaction_type: 'adjustment' | 'deduction' | 'restock';
  quantity_change: number;
  reason: TransactionReason;
  notes?: string | null;
}

export interface RecipeFilters {
  product_id?: string;
  is_active?: boolean;
  search?: string;
  sort_by?: 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface RecipeCreateRequest {
  product_id: string;
  name: string;
  description?: string | null;
  yield_quantity: number;
  yield_unit: RecipeYieldUnit;
  notes?: string | null;
  materials: {
    material_id: string;
    quantity_required: number;
    unit: string;
    waste_percentage?: number;
    notes?: string | null;
  }[];
}

export interface RecipeUpdateRequest {
  name?: string;
  description?: string | null;
  yield_quantity?: number;
  yield_unit?: RecipeYieldUnit;
  notes?: string | null;
}

export interface RecipeComponentCreateRequest {
  material_id: string;
  quantity_required: number;
  unit: string;
  waste_percentage?: number;
  notes?: string | null;
}

export interface RecipeComponentUpdateRequest
  extends Partial<RecipeComponentCreateRequest> {}

// ==================== BOM CALCULATION ====================

export interface MaterialAvailability {
  material_id: string;
  material_name: string;
  required_quantity: number;
  available_stock: number;
  sufficient: boolean;
  max_producible: number;
}

export interface BOMCalculationResult {
  product_id: string;
  product_name?: string;
  maximum_producible_quantity: number;
  limiting_material: {
    material_id: string;
    material_name: string;
    required_per_unit: number;
    available_stock: number;
    max_units: number;
  } | null;
  all_materials_availability: MaterialAvailability[];
}

export interface BulkAvailabilityRequest {
  product_ids: string[];
}

export interface BulkAvailabilityResponse {
  results: BOMCalculationResult[];
}

export interface BatchRequirementsRequest {
  product_id: string;
  quantity: number;
}

export interface BatchRequirementsResponse {
  product_id: string;
  quantity_requested: number;
  can_fulfill: boolean;
  required_materials: {
    material_id: string;
    material_name: string;
    quantity_required: number;
    unit: string;
    available_stock: number;
    shortfall: number;
  }[];
  estimated_cost: number;
}

export interface MultiProductPlanRequest {
  products: {
    product_id: string;
    quantity: number;
  }[];
}

export interface MultiProductPlanResponse {
  can_fulfill_all: boolean;
  total_cost: number;
  material_summary: {
    material_id: string;
    material_name: string;
    total_required: number;
    available_stock: number;
    sufficient: boolean;
  }[];
  products: {
    product_id: string;
    product_name: string;
    quantity: number;
    cost: number;
    can_fulfill: boolean;
  }[];
}

// ==================== ANALYTICS ====================

export interface StockStatusSummary {
  total_materials: number;
  normal_stock: number;
  low_stock: number;
  out_of_stock: number;
  critical_stock: number;
  total_value: number;
}

export interface CategorySummary {
  category: string;
  material_count: number;
  total_value: number;
  low_stock_count: number;
}

export interface UsageTrend {
  date: string;
  total_usage: number;
  total_cost: number;
  transaction_count: number;
}

export interface CostAnalysis {
  material_id: string;
  material_name: string;
  category: string | null;
  total_quantity: number;
  unit_cost: number;
  total_cost: number;
  percentage_of_total: number;
}

export interface TurnoverRate {
  material_id: string;
  material_name: string;
  average_stock: number;
  total_usage: number;
  turnover_rate: number;
  days_in_period: number;
}

// ==================== ALERTS ====================

export interface StockAlert {
  id?: string;
  material_id: string;
  material_name: string;
  current_stock: number;
  reorder_level: number;
  unit: MaterialUnit;
  status: StockStatus;
  level: AlertLevel;
  message: string;
  days_until_stockout?: number;
}

export interface PredictiveAlert extends StockAlert {
  average_daily_usage: number;
  forecast_days: number;
  predicted_stockout_date: string | null;
}

export interface ReorderRecommendation {
  material_id: string;
  material_name: string;
  current_stock: number;
  reorder_level: number;
  suggested_order_quantity: number;
  unit: MaterialUnit;
  unit_cost: number;
  estimated_cost: number;
  priority: 'high' | 'medium' | 'low';
  supplier: string | null;
}

export interface AlertDashboard {
  summary: {
    total_alerts: number;
    critical: number;
    warning: number;
    info: number;
  };
  active_alerts: StockAlert[];
  predictive_alerts: PredictiveAlert[];
  reorder_recommendations: ReorderRecommendation[];
}

// ==================== PAGINATION & RESPONSES ====================

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}