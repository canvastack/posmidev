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
  created_at?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
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
  description?: string;
  cost_price?: number;
  status?: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  image_url?: string | null;
  thumbnail_url?: string | null;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;
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
  name: string;
  sku: string;
  price: number;
  stock: number;
  category_id?: string;
  description?: string;
  cost_price?: number;
  status?: 'active' | 'inactive' | 'discontinued';
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