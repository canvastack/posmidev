/**
 * MaterialsPage Component Tests
 * 
 * Tests the Materials management page functionality.
 * 
 * Test Coverage:
 * - Page rendering with data
 * - Filter functionality (status, stock status, category)
 * - Search functionality
 * - Pagination
 * - Stock adjustment dialog
 * - Loading and error states
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All test data includes tenant_id
 * - All operations are tenant-scoped
 * - guard_name: 'api'
 * 
 * @module pages/backend/materials/__tests__/MaterialsPage.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockTenantId, mockMaterialListResponse } from '@/test/test-utils';
import MaterialsPage from '../MaterialsPage';

// ============================================================================
// MOCKS
// ============================================================================

// Mock useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: '123e4567-e89b-12d3-a456-426614174000',
      tenant_id: mockTenantId(),
      email: 'test@example.com',
      name: 'Test User',
    },
    tenantId: mockTenantId(),
    token: 'mock-token',
  }),
}));

// Mock bomApi
vi.mock('@/api/bomApi', () => ({
  bomApi: {
    materials: {
      getAll: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      adjustStock: vi.fn(),
    },
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

import { bomApi } from '@/api/bomApi';

// ============================================================================
// TEST SUITE
// ============================================================================

describe('MaterialsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock: successful materials fetch
    vi.mocked(bomApi.materials.getAll).mockResolvedValue(
      mockMaterialListResponse(5)
    );
  });

  // --------------------------------------------------------------------------
  // RENDERING TESTS
  // --------------------------------------------------------------------------

  it('should render page title and header', async () => {
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Materials Management')).toBeInTheDocument();
    });
  });

  it('should render materials list when data is loaded', async () => {
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
      expect(screen.getByText('Test Material 2')).toBeInTheDocument();
    });
  });

  it('should display loading skeleton while fetching data', () => {
    renderWithProviders(<MaterialsPage />);
    
    // Check for loading indicators (adjust selector based on your implementation)
    expect(screen.getByRole('status', { name: /loading/i }) || 
           document.querySelector('[data-loading="true"]')).toBeTruthy();
  });

  it('should display error message when fetch fails', async () => {
    vi.mocked(bomApi.materials.getAll).mockRejectedValue(
      new Error('Failed to fetch materials')
    );
    
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no materials exist', async () => {
    vi.mocked(bomApi.materials.getAll).mockResolvedValue(
      mockMaterialListResponse(0)
    );
    
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no materials|empty/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // FILTER TESTS
  // --------------------------------------------------------------------------

  it('should filter materials by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    // Find and click status filter
    const statusFilter = screen.getByLabelText(/status/i);
    await user.click(statusFilter);
    
    // Select "Active" option
    const activeOption = screen.getByRole('option', { name: /active/i });
    await user.click(activeOption);
    
    await waitFor(() => {
      expect(bomApi.materials.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.objectContaining({ is_active: true })
      );
    });
  });

  it('should filter materials by stock status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    // Find and click stock status filter
    const stockFilter = screen.getByLabelText(/stock status/i);
    await user.click(stockFilter);
    
    // Select "Low Stock" option
    const lowStockOption = screen.getByRole('option', { name: /low/i });
    await user.click(lowStockOption);
    
    await waitFor(() => {
      expect(bomApi.materials.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.objectContaining({ stock_status: 'low' })
      );
    });
  });

  it('should filter materials by category', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    // Find and click category filter
    const categoryFilter = screen.getByLabelText(/category/i);
    await user.click(categoryFilter);
    
    // Select "Raw Materials" option
    const rawOption = screen.getByRole('option', { name: /raw materials/i });
    await user.click(rawOption);
    
    await waitFor(() => {
      expect(bomApi.materials.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.objectContaining({ category: 'raw_materials' })
      );
    });
  });

  it('should clear all filters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    // Apply filters first
    const statusFilter = screen.getByLabelText(/status/i);
    await user.click(statusFilter);
    await user.click(screen.getByRole('option', { name: /active/i }));
    
    // Clear filters
    const clearButton = screen.getByRole('button', { name: /clear|reset/i });
    await user.click(clearButton);
    
    await waitFor(() => {
      expect(bomApi.materials.getAll).toHaveBeenLastCalledWith(
        mockTenantId(),
        expect.not.objectContaining({ is_active: expect.anything() })
      );
    });
  });

  // --------------------------------------------------------------------------
  // SEARCH TESTS
  // --------------------------------------------------------------------------

  it('should search materials by name/code', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Flour');
    
    // Wait for debounced search
    await waitFor(
      () => {
        expect(bomApi.materials.getAll).toHaveBeenCalledWith(
          mockTenantId(),
          expect.objectContaining({ search: 'Flour' })
        );
      },
      { timeout: 1000 }
    );
  });

  it('should debounce search input', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    
    // Type rapidly
    await user.type(searchInput, 'abc');
    
    // Should not call API for each keystroke
    expect(bomApi.materials.getAll).not.toHaveBeenCalledWith(
      mockTenantId(),
      expect.objectContaining({ search: 'a' })
    );
    
    // Wait for debounce
    await waitFor(
      () => {
        expect(bomApi.materials.getAll).toHaveBeenCalledWith(
          mockTenantId(),
          expect.objectContaining({ search: 'abc' })
        );
      },
      { timeout: 1000 }
    );
  });

  // --------------------------------------------------------------------------
  // PAGINATION TESTS
  // --------------------------------------------------------------------------

  it('should handle pagination', async () => {
    const user = userEvent.setup();
    vi.mocked(bomApi.materials.getAll).mockResolvedValue({
      data: mockMaterialListResponse(20).data,
      meta: {
        current_page: 1,
        per_page: 20,
        total: 50,
        last_page: 3,
      },
    });
    
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    // Click next page button
    const nextButton = screen.getByRole('button', { name: /next|>|→/i });
    await user.click(nextButton);
    
    await waitFor(() => {
      expect(bomApi.materials.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.objectContaining({ page: 2 })
      );
    });
  });

  // --------------------------------------------------------------------------
  // STOCK ADJUSTMENT TESTS
  // --------------------------------------------------------------------------

  it('should open stock adjustment dialog', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    // Click adjust stock button (first material)
    const adjustButtons = screen.getAllByRole('button', { name: /adjust|stock/i });
    await user.click(adjustButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/adjust stock|stock adjustment/i)).toBeInTheDocument();
    });
  });

  it('should submit stock adjustment', async () => {
    const user = userEvent.setup();
    vi.mocked(bomApi.materials.adjustStock).mockResolvedValue({
      success: true,
      message: 'Stock adjusted successfully',
    });
    
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Material 1')).toBeInTheDocument();
    });
    
    // Open dialog
    const adjustButtons = screen.getAllByRole('button', { name: /adjust|stock/i });
    await user.click(adjustButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText(/adjust stock/i)).toBeInTheDocument();
    });
    
    // Fill form
    const quantityInput = screen.getByLabelText(/quantity|amount/i);
    await user.clear(quantityInput);
    await user.type(quantityInput, '10');
    
    const typeSelect = screen.getByLabelText(/type|transaction/i);
    await user.click(typeSelect);
    await user.click(screen.getByRole('option', { name: /in|receive/i }));
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /submit|save|adjust/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(bomApi.materials.adjustStock).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // TENANT ISOLATION TEST
  // --------------------------------------------------------------------------

  it('should always use tenant_id from auth context', async () => {
    renderWithProviders(<MaterialsPage />);
    
    await waitFor(() => {
      expect(bomApi.materials.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.any(Object)
      );
    });
    
    // Verify tenant_id is always the first parameter
    const calls = vi.mocked(bomApi.materials.getAll).mock.calls;
    calls.forEach((call) => {
      expect(call[0]).toBe(mockTenantId());
    });
  });
});