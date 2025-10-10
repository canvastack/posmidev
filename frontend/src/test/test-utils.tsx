/**
 * Test Utilities
 * 
 * Custom render functions and test helpers for component testing.
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All test data includes tenant_id
 * - Mock API calls are tenant-scoped
 * - Test user has proper permissions (guard_name: 'api')
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

// ============================================================================
// CUSTOM RENDER WITH PROVIDERS
// ============================================================================

interface AllTheProvidersProps {
  children: ReactNode;
}

/**
 * Wrapper component with all necessary providers for testing
 */
const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  // Create a new QueryClient for each test to avoid state leakage
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
        gcTime: 0, // Disable garbage collection
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * Custom render function that includes all providers
 * 
 * @param ui - Component to render
 * @param options - Render options
 * @returns Render result with all testing-library utilities
 * 
 * @example
 * ```tsx
 * import { renderWithProviders } from '@/test/test-utils';
 * 
 * test('renders component', () => {
 *   const { getByText } = renderWithProviders(<MyComponent />);
 *   expect(getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export { customRender as renderWithProviders };

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

/**
 * Generate mock tenant ID
 */
export const mockTenantId = () => '550e8400-e29b-41d4-a716-446655440000';

/**
 * Generate mock product ID
 */
export const mockProductId = () => '660e8400-e29b-41d4-a716-446655440000';

/**
 * Generate mock variant ID
 */
export const mockVariantId = (index = 0) =>
  `770e8400-e29b-41d4-a716-44665544${String(index).padStart(4, '0')}`;

/**
 * Generate mock product variant
 * 
 * IMMUTABLE RULES: Includes tenant_id, all IDs are UUIDs
 */
export const mockProductVariant = (overrides?: any) => ({
  id: mockVariantId(),
  tenant_id: mockTenantId(),
  product_id: mockProductId(),
  sku: 'TEST-SKU-001',
  name: 'Test Variant',
  price: 100.0,
  cost_price: 50.0,
  stock: 10,
  low_stock_threshold: 5,
  image_url: null,
  status: 'active' as const,
  attributes: {
    color: 'Red',
    size: 'M',
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Generate mock variant matrix cell
 */
export const mockMatrixCell = (overrides?: any) => ({
  id: `cell-${Math.random().toString(36).substr(2, 9)}`,
  attributes: {
    color: 'Red',
    size: 'M',
  },
  sku: 'TEST-SKU-001',
  name: 'Test Variant',
  price: 100.0,
  cost_price: 50.0,
  stock: 10,
  low_stock_threshold: 5,
  image_url: null,
  status: 'active' as const,
  errors: {},
  ...overrides,
});

/**
 * Generate mock variant list response
 */
export const mockVariantListResponse = (count = 3) => ({
  data: Array.from({ length: count }, (_, i) =>
    mockProductVariant({
      id: mockVariantId(i),
      sku: `TEST-SKU-${String(i + 1).padStart(3, '0')}`,
      name: `Test Variant ${i + 1}`,
    })
  ),
  meta: {
    current_page: 1,
    per_page: 20,
    total: count,
    last_page: 1,
  },
  links: {
    first: '/api/v1/tenants/test/products/test/variants?page=1',
    last: '/api/v1/tenants/test/products/test/variants?page=1',
    prev: null,
    next: null,
  },
});

// ============================================================================
// MOCK API FUNCTIONS
// ============================================================================

/**
 * Create mock API function that returns resolved promise
 */
export const mockApiSuccess = <T,>(data: T) => vi.fn().mockResolvedValue(data);

/**
 * Create mock API function that returns rejected promise
 */
export const mockApiError = (message = 'API Error') =>
  vi.fn().mockRejectedValue(new Error(message));

// ============================================================================
// USER INTERACTION HELPERS
// ============================================================================

/**
 * Wait for async operations to complete
 * Useful for waiting for React Query mutations/queries
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Mock toast notifications
 */
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

// ============================================================================
// BOM MOCK DATA GENERATORS
// ============================================================================

/**
 * Generate mock material ID
 */
export const mockMaterialId = (index = 0) =>
  `880e8400-e29b-41d4-a716-44665544${String(index).padStart(4, '0')}`;

/**
 * Generate mock recipe ID
 */
export const mockRecipeId = (index = 0) =>
  `990e8400-e29b-41d4-a716-44665544${String(index).padStart(4, '0')}`;

/**
 * Generate mock material
 * 
 * IMMUTABLE RULES: Includes tenant_id, all IDs are UUIDs
 * Aligned with Material interface in bom.ts
 */
export const mockMaterial = (overrides?: any) => ({
  id: mockMaterialId(),
  tenant_id: mockTenantId(),
  name: 'Test Material',
  sku: 'MAT-001',
  description: 'Test material description',
  category: 'raw_materials',
  unit: 'kg',
  stock_quantity: 100,
  reorder_level: 30,
  unit_cost: 5000,
  supplier: 'Test Supplier',
  is_low_stock: false,
  stock_status: 'normal' as const,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  ...overrides,
});

/**
 * Generate mock recipe
 * Aligned with Recipe interface in bom.ts
 */
export const mockRecipe = (overrides?: any) => ({
  id: mockRecipeId(),
  tenant_id: mockTenantId(),
  product_id: mockProductId(),
  name: 'Test Recipe',
  description: 'Test recipe description',
  yield_quantity: 10,
  yield_unit: 'pcs' as const,
  is_active: true,
  notes: null,
  total_cost: 50000,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  deleted_at: null,
  product: {
    id: mockProductId(),
    name: 'Test Product',
    sku: 'PROD-001',
  },
  materials: [],
  ...overrides,
});

/**
 * Generate mock recipe material
 * Aligned with RecipeMaterial interface in bom.ts
 */
export const mockRecipeMaterial = (overrides?: any) => ({
  id: `rm-${Math.random().toString(36).substr(2, 9)}`,
  tenant_id: mockTenantId(),
  recipe_id: mockRecipeId(),
  material_id: mockMaterialId(),
  quantity_required: 5,
  unit: 'kg',
  waste_percentage: 0,
  effective_quantity: 5,
  notes: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  material: mockMaterial(),
  ...overrides,
});

/**
 * Generate mock stock status data
 */
export const mockStockStatus = () => ({
  normal: 15,
  low: 5,
  critical: 3,
  out_of_stock: 2,
});

/**
 * Generate mock category breakdown
 */
export const mockCategoryBreakdown = () => [
  {
    category: 'raw_materials',
    total_value: 5000000,
    material_count: 10,
    low_stock_count: 2,
  },
  {
    category: 'packaging',
    total_value: 2000000,
    material_count: 5,
    low_stock_count: 1,
  },
];

/**
 * Generate mock usage trends
 */
export const mockUsageTrends = () => [
  {
    date: '2024-01-01',
    total_usage: 100,
    total_cost: 500000,
    transaction_count: 10,
  },
  {
    date: '2024-01-02',
    total_usage: 120,
    total_cost: 600000,
    transaction_count: 12,
  },
];

/**
 * Generate mock material list response
 */
export const mockMaterialListResponse = (count = 3) => ({
  data: Array.from({ length: count }, (_, i) =>
    mockMaterial({
      id: mockMaterialId(i),
      sku: `MAT-${String(i + 1).padStart(3, '0')}`,
      name: `Test Material ${i + 1}`,
    })
  ),
  meta: {
    current_page: 1,
    per_page: 20,
    total: count,
    last_page: 1,
  },
});

/**
 * Generate mock recipe list response
 */
export const mockRecipeListResponse = (count = 3) => ({
  data: Array.from({ length: count }, (_, i) =>
    mockRecipe({
      id: mockRecipeId(i),
      name: `Test Recipe ${i + 1}`,
      version: i + 1,
    })
  ),
  meta: {
    current_page: 1,
    per_page: 20,
    total: count,
    last_page: 1,
  },
});

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';