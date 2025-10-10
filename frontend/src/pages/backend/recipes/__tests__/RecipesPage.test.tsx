/**
 * RecipesPage Component Tests
 * 
 * Tests the Recipes management page functionality.
 * 
 * Test Coverage:
 * - Page rendering with data
 * - Filter functionality (status, product)
 * - Search functionality
 * - Recipe activation/deactivation
 * - Navigation to detail page
 * - Loading and error states
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All test data includes tenant_id
 * - All operations are tenant-scoped
 * - guard_name: 'api'
 * 
 * @module pages/backend/recipes/__tests__/RecipesPage.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockTenantId, mockRecipeListResponse } from '@/test/test-utils';
import RecipesPage from '../index';

// ============================================================================
// MOCKS
// ============================================================================

const mockNavigate = vi.fn();

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
    recipes: {
      getAll: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      activate: vi.fn(),
      deactivate: vi.fn(),
      delete: vi.fn(),
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
    useNavigate: () => mockNavigate,
  };
});

import { bomApi } from '@/api/bomApi';

// ============================================================================
// TEST SUITE
// ============================================================================

describe('RecipesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    
    // Default mock: successful recipes fetch
    vi.mocked(bomApi.recipes.getAll).mockResolvedValue(
      mockRecipeListResponse(5)
    );
  });

  // --------------------------------------------------------------------------
  // RENDERING TESTS
  // --------------------------------------------------------------------------

  it('should render page title and header', async () => {
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe Management')).toBeInTheDocument();
    });
  });

  it('should render recipes list when data is loaded', async () => {
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
      expect(screen.getByText('Test Recipe 2')).toBeInTheDocument();
    });
  });

  it('should display loading skeleton while fetching data', () => {
    renderWithProviders(<RecipesPage />);
    
    // Check for loading indicators
    expect(screen.getByRole('status', { name: /loading/i }) || 
           document.querySelector('[data-loading="true"]')).toBeTruthy();
  });

  it('should display error message when fetch fails', async () => {
    vi.mocked(bomApi.recipes.getAll).mockRejectedValue(
      new Error('Failed to fetch recipes')
    );
    
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it('should display empty state when no recipes exist', async () => {
    vi.mocked(bomApi.recipes.getAll).mockResolvedValue(
      mockRecipeListResponse(0)
    );
    
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/no recipes|empty/i)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // FILTER TESTS
  // --------------------------------------------------------------------------

  it('should filter recipes by status', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Find and click status filter
    const statusFilter = screen.getByLabelText(/status/i);
    await user.click(statusFilter);
    
    // Select "Active" option
    const activeOption = screen.getByRole('option', { name: /active/i });
    await user.click(activeOption);
    
    await waitFor(() => {
      expect(bomApi.recipes.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.objectContaining({ status: 'active' })
      );
    });
  });

  it('should filter recipes by product', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Find and click product filter
    const productFilter = screen.getByLabelText(/product/i);
    await user.click(productFilter);
    
    // Select product option
    const productOption = screen.getAllByRole('option')[1]; // First actual option
    await user.click(productOption);
    
    await waitFor(() => {
      expect(bomApi.recipes.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.objectContaining({ product_id: expect.any(String) })
      );
    });
  });

  it('should clear all filters', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Apply filter first
    const statusFilter = screen.getByLabelText(/status/i);
    await user.click(statusFilter);
    await user.click(screen.getByRole('option', { name: /active/i }));
    
    // Clear filters
    const clearButton = screen.getByRole('button', { name: /clear|reset/i });
    await user.click(clearButton);
    
    await waitFor(() => {
      expect(bomApi.recipes.getAll).toHaveBeenLastCalledWith(
        mockTenantId(),
        expect.not.objectContaining({ status: expect.anything() })
      );
    });
  });

  // --------------------------------------------------------------------------
  // SEARCH TESTS
  // --------------------------------------------------------------------------

  it('should search recipes by name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Type in search input
    const searchInput = screen.getByPlaceholderText(/search/i);
    await user.type(searchInput, 'Chocolate Cake');
    
    // Wait for debounced search
    await waitFor(
      () => {
        expect(bomApi.recipes.getAll).toHaveBeenCalledWith(
          mockTenantId(),
          expect.objectContaining({ search: 'Chocolate Cake' })
        );
      },
      { timeout: 1000 }
    );
  });

  // --------------------------------------------------------------------------
  // RECIPE ACTIVATION TESTS
  // --------------------------------------------------------------------------

  it('should activate a recipe', async () => {
    const user = userEvent.setup();
    const inactiveRecipe = mockRecipeListResponse(1);
    inactiveRecipe.data[0].status = 'inactive';
    
    vi.mocked(bomApi.recipes.getAll).mockResolvedValue(inactiveRecipe);
    vi.mocked(bomApi.recipes.activate).mockResolvedValue({
      success: true,
      message: 'Recipe activated',
    });
    
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Click activate button
    const activateButton = screen.getByRole('button', { name: /activate/i });
    await user.click(activateButton);
    
    // Confirm action
    const confirmButton = screen.getByRole('button', { name: /confirm|yes/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(bomApi.recipes.activate).toHaveBeenCalled();
    });
  });

  it('should deactivate a recipe', async () => {
    const user = userEvent.setup();
    vi.mocked(bomApi.recipes.deactivate).mockResolvedValue({
      success: true,
      message: 'Recipe deactivated',
    });
    
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Click deactivate button
    const deactivateButton = screen.getByRole('button', { name: /deactivate/i });
    await user.click(deactivateButton);
    
    // Confirm action
    const confirmButton = screen.getByRole('button', { name: /confirm|yes/i });
    await user.click(confirmButton);
    
    await waitFor(() => {
      expect(bomApi.recipes.deactivate).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // NAVIGATION TESTS
  // --------------------------------------------------------------------------

  it('should navigate to recipe detail page when clicking view button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Click view/edit button
    const viewButtons = screen.getAllByRole('button', { name: /view|edit|detail/i });
    await user.click(viewButtons[0]);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/')
      );
    });
  });

  it('should navigate to create recipe page when clicking create button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Recipe Management')).toBeInTheDocument();
    });
    
    // Click create button
    const createButton = screen.getByRole('button', { name: /create|new|add/i });
    await user.click(createButton);
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/recipes/create')
      );
    });
  });

  // --------------------------------------------------------------------------
  // COST DISPLAY TESTS
  // --------------------------------------------------------------------------

  it('should display recipe cost information', async () => {
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Check for cost display (formatted as IDR)
    const costElements = screen.getAllByText(/Rp|IDR|5,000/i);
    expect(costElements.length).toBeGreaterThan(0);
  });

  it('should display recipe yield information', async () => {
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Check for yield quantity/unit display
    const yieldElements = screen.queryAllByText(/pcs|yield/i);
    expect(yieldElements.length).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // PAGINATION TESTS
  // --------------------------------------------------------------------------

  it('should handle pagination', async () => {
    const user = userEvent.setup();
    vi.mocked(bomApi.recipes.getAll).mockResolvedValue({
      data: mockRecipeListResponse(20).data,
      meta: {
        current_page: 1,
        per_page: 20,
        total: 50,
        last_page: 3,
      },
    });
    
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Recipe 1')).toBeInTheDocument();
    });
    
    // Click next page button
    const nextButton = screen.getByRole('button', { name: /next|>|→/i });
    await user.click(nextButton);
    
    await waitFor(() => {
      expect(bomApi.recipes.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.objectContaining({ page: 2 })
      );
    });
  });

  // --------------------------------------------------------------------------
  // TENANT ISOLATION TEST
  // --------------------------------------------------------------------------

  it('should always use tenant_id from auth context', async () => {
    renderWithProviders(<RecipesPage />);
    
    await waitFor(() => {
      expect(bomApi.recipes.getAll).toHaveBeenCalledWith(
        mockTenantId(),
        expect.any(Object)
      );
    });
    
    // Verify tenant_id is always the first parameter
    const calls = vi.mocked(bomApi.recipes.getAll).mock.calls;
    calls.forEach((call) => {
      expect(call[0]).toBe(mockTenantId());
    });
  });
});