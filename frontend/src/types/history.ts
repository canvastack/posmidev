// Product History Types

/**
 * Activity log event types from Spatie Activity Log
 */
export type ActivityEvent = 
  | 'created' 
  | 'updated' 
  | 'deleted' 
  | 'restored'
  | 'archived'
  | 'price_changed'
  | 'stock_adjusted'
  | 'variant_added'
  | 'variant_updated'
  | 'variant_deleted';

/**
 * Activity log entry from backend (Spatie Activity Log)
 * Matches ProductHistoryController@index response
 */
export interface ActivityLog {
  id: number;
  event: ActivityEvent; // Event name from Spatie
  description: string | null; // Human-readable description
  properties: Record<string, any>; // Full properties object
  changes: {
    old: Record<string, any> | null; // Old values
    attributes: Record<string, any> | null; // New values
  };
  causer: {
    id: string;
    name: string;
    email: string;
  } | null;
  created_at: string; // ISO 8601 format
}

export interface PriceHistory {
  id: string;
  tenant_id: string;
  product_id: string;
  old_price: number;
  new_price: number;
  old_cost_price?: number | null;
  new_cost_price?: number | null;
  price_change_percentage: number;
  price_change_direction: 'increase' | 'decrease' | 'no_change';
  changed_by: string;
  changed_by_user?: {
    id: string;
    name: string;
  } | null;
  changed_at: string;
  created_at: string;
}

export interface StockHistory {
  id: string;
  tenant_id: string;
  product_id: string;
  old_stock: number;
  new_stock: number;
  change_amount: number;
  change_direction: 'increase' | 'decrease' | 'no_change';
  change_type: 'adjustment' | 'sale' | 'purchase' | 'return' | 'manual';
  reference_id?: string | null;
  reference_type?: string | null;
  notes?: string | null;
  changed_by: string;
  changed_by_user?: {
    id: string;
    name: string;
  } | null;
  changed_at: string;
  created_at: string;
}

export interface HistoryPaginationResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  meta: {
    product_id: string;
    product_name?: string;
    current_price?: number;
    current_cost_price?: number;
    current_stock?: number;
  };
}

export interface PriceHistoryResponse {
  data: PriceHistory[];
}

export interface StockHistoryResponse {
  data: StockHistory[];
}

export type HistoryTabType = 'all' | 'price' | 'stock';