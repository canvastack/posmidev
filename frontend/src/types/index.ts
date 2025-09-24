// API Response Types
export interface User {
  id: string;
  name: string;
  email: string;
  tenant_id: string;
  status?: 'active' | 'inactive' | 'pending' | 'banned';
  roles: string[];
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
  description?: string;
  cost_price?: number;
  created_at: string;
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