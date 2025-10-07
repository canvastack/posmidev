/**
 * Product Variant Types
 * Based on OpenAPI specification - Phase 6: Product Variants
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All types include tenant_id (tenant-scoped)
 * - No global data structures
 * - All operations must respect tenant boundaries
 */

// ========================================
// PRODUCT VARIANT
// ========================================

export interface ProductVariant {
  id: string;
  product_id: string;
  tenant_id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  display_name: string;
  
  // Attributes (JSONB)
  attributes: Record<string, string>;
  // Example: { "color": "Red", "size": "M" }
  
  // Pricing
  price: number;
  cost_price?: number | null;
  price_modifier?: number | null;
  profit_margin: number; // Calculated field
  
  // Stock Management
  stock: number;
  reserved_stock: number;
  available_stock: number; // Computed: stock - reserved_stock
  manage_stock: boolean;
  reorder_level?: number | null;
  reorder_quantity?: number | null;
  is_low_stock: boolean;
  is_critical_stock: boolean;
  
  // Images
  images: string[];
  image_url?: string | null;
  
  // Status & Display
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations (optional)
  product?: {
    id: string;
    name: string;
    sku: string;
    has_variants?: boolean;
  };
  
  analytics?: VariantAnalytics;
}

// Form/Input type for creating/updating variants
export interface ProductVariantInput {
  sku: string;
  barcode?: string | null;
  name: string;
  attributes: Record<string, string>;
  price: number;
  cost_price?: number | null;
  price_modifier?: number | null;
  stock: number;
  reserved_stock?: number;
  manage_stock?: boolean;
  reorder_level?: number | null;
  reorder_quantity?: number | null;
  images?: string[];
  is_active?: boolean;
  is_default?: boolean;
  sort_order?: number;
}

// Bulk operations
export interface BulkVariantCreateInput {
  variants: ProductVariantInput[];
}

export interface BulkVariantUpdateInput {
  ids: string[];
  updates: Partial<ProductVariantInput>;
}

export interface BulkVariantDeleteInput {
  ids: string[];
}

// ========================================
// VARIANT ATTRIBUTE
// ========================================

export interface VariantAttribute {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  display_type: 'select' | 'radio' | 'button' | 'swatch' | 'color_swatch';
  values: string[];
  value_count: number;
  
  // Pricing modifiers per value
  price_modifiers?: Record<string, number>;
  // Example: { "Red": 0, "Blue": 0, "Black": 2 }
  
  // Visual settings (for color_swatch, etc.)
  visual_settings?: Record<string, any>;
  // Example: { "Red": { "hex": "#FF0000" }, "Blue": { "hex": "#0000FF" } }
  
  // Display
  sort_order: number;
  is_active: boolean;
  
  // Stats
  usage_count: number;
  total_combinations: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface VariantAttributeInput {
  name: string;
  display_type: 'select' | 'radio' | 'button' | 'swatch' | 'color_swatch';
  values: string[];
  price_modifiers?: Record<string, number>;
  visual_settings?: Record<string, any>;
  sort_order?: number;
  is_active?: boolean;
}

// ========================================
// VARIANT TEMPLATE
// ========================================

export interface VariantTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  
  // Template Configuration
  attributes: TemplateAttribute[];
  pricing_rules?: Record<string, Record<string, number>>;
  // Example: { "Size": { "S": 0, "M": 0, "L": 2, "XL": 5 } }
  
  // Metadata
  is_system: boolean;
  usage_count: number;
  expected_variant_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface TemplateAttribute {
  name: string;
  values: string[];
}

export interface VariantTemplateInput {
  name: string;
  description?: string;
  category?: string;
  attributes: TemplateAttribute[];
  pricing_rules?: Record<string, Record<string, number>>;
}

// Apply template to product
export interface ApplyTemplateInput {
  template_id: string;
  base_price?: number; // reserved for future use (backend computes based on product price now)
  base_stock?: number; // reserved for future use
  override_pricing?: boolean; // reserved for future use
  override_existing?: boolean; // maps to backend apply { override_existing }
}

export interface ApplyTemplatePreview {
  expected_count: number; // maps from backend preview.preview.variant_count
  variants: ProductVariantInput[]; // maps from backend preview.preview.variants
  warnings?: string[];
}

// ========================================
// VARIANT ANALYTICS
// ========================================

export interface VariantAnalytics {
  id: string;
  tenant_id: string;
  product_variant_id: string;
  
  // Time Period
  period_start: string; // Date
  period_end: string;   // Date
  period_type: 'daily' | 'weekly' | 'monthly';
  
  // Sales Metrics
  units_sold: number;
  revenue: number;
  profit: number;
  
  // Stock Metrics
  stock_turnover_rate?: number | null;
  days_out_of_stock: number;
  
  // Computed Metrics
  avg_daily_sales?: number | null;
  profit_margin?: number | null;
  
  // Rankings
  sales_rank?: number | null;
  revenue_rank?: number | null;
  
  // Performance Status
  performance_status?: 'excellent' | 'good' | 'average' | 'poor';
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations (optional)
  variant?: ProductVariant;
}

// Analytics query params
export interface VariantAnalyticsParams {
  period_start?: string;
  period_end?: string;
  period_type?: 'daily' | 'weekly' | 'monthly';
  limit?: number;
}

// Top performers response
export interface TopPerformersResponse {
  top_by_sales: VariantAnalytics[];
  top_by_revenue: VariantAnalytics[];
  top_by_profit: VariantAnalytics[];
}

// Comparison response
export interface VariantComparisonResponse {
  variants: VariantAnalytics[];
  comparison_metrics: {
    total_sales: number;
    total_revenue: number;
    total_profit: number;
    avg_profit_margin: number;
  };
}

// ========================================
// API RESPONSE TYPES
// ========================================

export interface VariantListResponse {
  data: ProductVariant[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  links?: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
}

export interface VariantAttributeListResponse {
  data: VariantAttribute[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface VariantTemplateListResponse {
  data: VariantTemplate[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

// Bulk operation responses
export interface BulkCreateResponse {
  success: boolean;
  created_count: number;
  failed_count: number;
  variants: ProductVariant[];
  errors?: Array<{
    index: number;
    errors: Record<string, string[]>;
  }>;
}

export interface BulkUpdateResponse {
  success: boolean;
  updated_count: number;
  variants: ProductVariant[];
}

export interface BulkDeleteResponse {
  success: boolean;
  deleted_count: number;
  message: string;
}

// Import/Export
export interface VariantImportResponse {
  success: boolean;
  imported_count: number;
  failed_count: number;
  errors?: Array<{
    row: number;
    errors: Record<string, string[]>;
  }>;
}

// ========================================
// QUERY PARAMS
// ========================================

export interface VariantQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  product_id?: string;
  attributes?: Record<string, string>;
  is_active?: boolean;
  is_low_stock?: boolean;
  price_min?: number;
  price_max?: number;
  stock_min?: number;
  stock_max?: number;
  sort_by?: 'name' | 'sku' | 'price' | 'stock' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface AttributeQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  is_active?: boolean;
  display_type?: string;
}

export interface TemplateQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  is_system?: boolean;
}

// ========================================
// UI HELPER TYPES
// ========================================

// For matrix builder
export interface VariantMatrixCell {
  id: string; // stable identifier derived from combination
  combination: Record<string, string>;
  variant?: ProductVariant;
  isNew: boolean;
  isDirty: boolean;
  sku?: string;
  price?: number;
  stock?: number;
  errors?: string[];
}

export interface VariantMatrixConfig {
  attributes: {
    name: string;
    values: string[];
  }[];
  basePrice: number;
  baseStock: number;
  pricingRules?: Record<string, Record<string, number>>;
}

// Stock adjustment
export interface StockAdjustment {
  variant_id: string;
  adjustment_type: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason?: string;
}

// Variant filter state
export interface VariantFilters {
  search: string;
  product_id?: string;
  attributes: Record<string, string>;
  is_active?: boolean;
  is_low_stock?: boolean;
  price_range?: [number, number];
  stock_range?: [number, number];
}