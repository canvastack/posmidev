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

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';