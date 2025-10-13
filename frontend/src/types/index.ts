// API Response Types
export interface User {
  id: string;
  name: string;
  email: string;
  tenant_id: string;
  status?: 'active' | 'inactive' | 'pending' | 'banned';
  roles: string[];
  permissions: string[];
  is_hq_super_admin?: boolean;
  display_name?: string | null;
  photo?: string | null;
  photo_thumb?: string | null;
  phone_number?: string | null;
  
  // Location fields (Day 3 Enhancement)
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  has_photo?: boolean;
  has_location?: boolean;
  location_coordinates?: string | null; // Computed accessor: "lat,lng"
  
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

// Phase 7: Multi-Image Gallery
export interface ProductImage {
  id: string;
  product_id: string;
  tenant_id: string;
  image_url: string;
  thumbnail_url: string | null;
  is_primary: boolean;
  sort_order: number;
}

// Phase 9: Supplier
export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
}

// Phase 9: Product Tag
export interface ProductTag {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  color: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  tenant_id: string;
  category_id?: string;
  category?: Category;
  categories?: Category[];
  primary_category_id?: string | null;
  primaryCategory?: Category;
  description?: string;
  cost_price?: number;
  status?: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
  has_variants?: boolean;
  manage_stock_by_variant?: boolean;
  variant_count?: number;
  images?: ProductImage[]; // Phase 7: Multi-image support
  primary_image?: ProductImage; // Phase 7: Primary image relationship
  
  // Phase 9: Additional Business Features
  supplier_id?: string | null;
  supplier?: Supplier | null;
  uom?: string | null; // Unit of Measurement
  formatted_uom?: string; // e.g., "pcs", "kg"
  stock_with_uom?: string; // e.g., "100 pcs"
  tax_rate?: number | null; // Percentage (0-100)
  tax_inclusive?: boolean; // Is tax included in price?
  price_without_tax?: number; // Calculated
  price_with_tax?: number; // Calculated
  tax_amount?: number; // Calculated
  tags?: ProductTag[]; // Array of tags
  
  // Phase 11: Archive & Soft Delete
  deleted_at?: string | null; // Soft delete timestamp
  
  // Phase 4A Day 5: Material Cost Tracking
  has_recipe?: boolean;
  material_cost_per_unit?: number;
  profit_margin?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;
  parent_id?: string | null;
  full_path?: string;
  depth?: number;
  children?: Category[];
  parent?: Category;
  products_count?: number;
  children_count?: number;
  created_at: string;
}

export interface Order {
  id: string;
  invoice_number: string;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  change_amount: number;
  items: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
}

export interface DashboardData {
  today_revenue: number;
  today_transactions: number;
  low_stock_products: number;
  low_stock_alerts: {
    id: string;
    name: string;
    stock: number;
    sku: string;
  }[];
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  tenant_name: string;
  user_name: string;
  email: string;
  password: string;
}

export interface ProductForm {
  name?: string;
  sku?: string;
  price?: number;
  stock?: number;
  category_id?: string;
  category_ids?: string[];
  primary_category_id?: string | null;
  description?: string;
  cost_price?: number;
  status?: 'active' | 'inactive' | 'discontinued';
  has_variants?: boolean;
  manage_stock_by_variant?: boolean;
  
  // Phase 9: Additional Business Features
  supplier_id?: string | null;
  uom?: string | null;
  tax_rate?: number | null;
  tax_inclusive?: boolean;
  tag_ids?: string[]; // Array of tag IDs
}

export interface OrderForm {
  items: {
    product_id: string;
    quantity: number;
  }[];
  payment_method: string;
  amount_paid: number;
  customer_id?: string;
}

export interface RoleForm {
  name: string;
  permissions: string[];
}

// Cart Types
export interface CartItem {
  product: Product;
  quantity: number;
}

// API Error Type
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Footer Content Types
export interface FooterLink {
  label: string;
  url: string;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface FooterBranding {
  logo: string;
  tagline: string;
}

export interface FooterContent {
  branding: FooterBranding;
  sections: FooterSection[];
  copyright: string;
}

export interface FooterResponse {
  tenantId: string;
  footer: FooterContent;
}

export interface FooterManagementResponse {
  tenantId: string;
  footer: FooterContent | null;
  hasCustomFooter: boolean;
}

// Public Products Types (Paginated Response from Laravel)
export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
}

export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category_id?: string;
  image_url?: string;
  thumbnail_url?: string;
}

export interface PublicProductsResponse {
  data: PublicProduct[];
  links: PaginationLinks;
  meta: PaginationMeta;
}

// Content Page types (CMS)
export interface ContentPage {
  id: string;
  tenant_id?: string;
  slug: string;
  title: string;
  content: Record<string, any>; // Flexible JSON structure
  status?: 'draft' | 'published';
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContentPageSummary {
  id: string;
  slug: string;
  title: string;
  published_at: string;
}

export interface ContentPageForm {
  slug: string;
  title: string;
  content: Record<string, any>;
  status: 'draft' | 'published';
  published_at?: string | null;
}

// Export history types
export * from './history';

// Export stock management types (Phase 5)
export * from './stock';

// Export variant types (Phase 6)
export * from './variant';

// Export analytics types (Phase 4A)
export * from './analytics';

// Export customer display types (Phase 4A)
export * from './customer-display';

// ========================================
// Phase 4A Day 5: Material Cost Tracking Types
// ========================================

export interface MaterialBreakdown {
  material_id: string;
  material_name: string;
  quantity_required: number;
  waste_percentage: number;
  effective_quantity: number;
  unit: string;
  unit_cost: number;
  component_cost: number;
}

export interface CostAlert {
  type: 'warning' | 'error';
  message: string;
}

export interface ProductCostAnalysis {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  selling_price: number;
  has_recipe: boolean;
  material_cost_per_unit: number;
  total_material_cost: number;
  total_selling_price: number;
  profit_amount: number;
  profit_margin: number;
  material_breakdown: MaterialBreakdown[];
  alert: CostAlert | null;
}

export interface CostSummary {
  total_cost: number;
  total_revenue: number;
  total_profit: number;
  overall_profit_margin: number;
}

export interface MaterialCostResponse {
  data: {
    products: ProductCostAnalysis[];
    summary: CostSummary;
  };
}

export interface MaterialCostRequest {
  products: {
    product_id: string;
    quantity: number;
    selling_price?: number;
  }[];
}