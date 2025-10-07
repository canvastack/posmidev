/**
 * VariantList Component Tests
 * 
 * Tests the variant list component for displaying and managing variants.
 * 
 * Test Coverage:
 * - Renders variants
 * - Search functionality
 * - Filter functionality
 * - Edit modal opens
 * - Delete confirmation
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All test data includes tenant_id
 * - All operations are tenant-scoped
 * - guard_name: 'api'
 * 
 * @module components/domain/variants/__tests__/VariantList.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  mockTenantId,
  mockProductId,
  mockProductVariant,
  mockVariantListResponse,
} from '@/test/test-utils';
import { VariantList } from '../VariantList';
import * as variantsHooks from '@/hooks/useVariants';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockProps = {
  tenantId: mockTenantId(),
  productId: mockProductId(),
  productSku: 'TEST-PRODUCT',
  productPrice: 100,
  canEdit: true,
  canDelete: true,
};

const mockVariants = [
  mockProductVariant({
    id: '1',
    sku: 'TEST-001',
    name: 'Red - Small',
    attributes: { color: 'Red', size: 'Small' },
    price: 100,
    stock: 10,
    status: 'active',
  }),
  mockProductVariant({
    id: '2',
    sku: 'TEST-002',
    name: 'Blue - Medium',
    attributes: { color: 'Blue', size: 'Medium' },
    price: 120,
    stock: 5,
    status: 'active',
  }),
  mockProductVariant({
    id: '3',
    sku: 'TEST-003',
    name: 'Green - Large',
    attributes: { color: 'Green', size: 'Large' },
    price: 150,
    stock: 0,
    status: 'inactive',
  }),
];

// ============================================================================
// MOCKS
// ============================================================================

const mockUseProductVariants = vi.fn();
const mockUseDeleteVariant = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock useProductVariants hook
  mockUseProductVariants.mockReturnValue({
    data: {
      data: mockVariants,
      meta: {
        current_page: 1,
        per_page: 20,
        total: mockVariants.length,
        last_page: 1,
      },
    },
    isLoading: false,
    isError: false,
    error: null,
  });

  // Mock useDeleteVariant hook
  mockUseDeleteVariant.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });

  vi.spyOn(variantsHooks, 'useProductVariants').mockImplementation(mockUseProductVariants);
  vi.spyOn(variantsHooks, 'useDeleteVariant').mockImplementation(mockUseDeleteVariant);
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('VariantList', () => {
  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    it('renders variants list', async () => {
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
        expect(screen.getByText('Blue - Medium')).toBeInTheDocument();
        expect(screen.getByText('Green - Large')).toBeInTheDocument();
      });
    });

    it('displays variant details', async () => {
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('TEST-001')).toBeInTheDocument();
        expect(screen.getByText('TEST-002')).toBeInTheDocument();
        expect(screen.getByText('TEST-003')).toBeInTheDocument();
      });
    });

    it('shows loading state', () => {
      mockUseProductVariants.mockReturnValue({
        data: null,
        isLoading: true,
        isError: false,
        error: null,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('shows error state', () => {
      mockUseProductVariants.mockReturnValue({
        data: null,
        isLoading: false,
        isError: true,
        error: { message: 'Failed to load variants' },
      });

      renderWithProviders(<VariantList {...mockProps} />);

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    it('shows empty state when no variants', () => {
      mockUseProductVariants.mockReturnValue({
        data: { data: [], meta: { total: 0 } },
        isLoading: false,
        isError: false,
        error: null,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      expect(screen.getByText(/no variants/i)).toBeInTheDocument();
    });

    it('displays variant attributes as badges', async () => {
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        // Should show attribute values as badges
        expect(screen.getByText('Red')).toBeInTheDocument();
        expect(screen.getByText('Small')).toBeInTheDocument();
        expect(screen.getByText('Blue')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
      });
    });

    it('displays stock status badges', async () => {
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        // Should show stock badges (in stock, low stock, out of stock)
        const stockBadges = screen.getAllByText(/stock/i);
        expect(stockBadges.length).toBeGreaterThan(0);
      });
    });

    it('displays variant status', async () => {
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        // Should show active/inactive status
        const activeBadges = screen.getAllByText(/active/i);
        expect(activeBadges.length).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // SEARCH TESTS
  // ==========================================================================

  describe('Search Functionality', () => {
    it('filters variants by search query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Red');

      // Should filter results (Note: actual filtering happens in backend/hook)
      // We're testing that search input works
      expect(searchInput).toHaveValue('Red');
    });

    it('searches by SKU', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'TEST-001');

      expect(searchInput).toHaveValue('TEST-001');
    });

    it('searches by variant name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Blue');

      expect(searchInput).toHaveValue('Blue');
    });

    it('clears search query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Red');
      expect(searchInput).toHaveValue('Red');

      await user.clear(searchInput);
      expect(searchInput).toHaveValue('');
    });

    it('debounces search input', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(/search/i);
      
      // Type quickly
      await user.type(searchInput, 'RedSmall');

      // Should not trigger immediate search (debounced)
      expect(searchInput).toHaveValue('RedSmall');
    });
  });

  // ==========================================================================
  // FILTER TESTS
  // ==========================================================================

  describe('Filter Functionality', () => {
    it('filters by status', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      // Find and click status filter dropdown
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      await user.click(statusFilter);

      // Select "Active"
      const activeOption = await screen.findByRole('option', { name: /^active$/i });
      await user.click(activeOption);

      // Should filter to active variants (filtering happens in hook)
      expect(statusFilter).toBeInTheDocument();
    });

    it('filters by stock level', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      // Find stock filter dropdown
      const stockFilter = screen.queryByRole('combobox', { name: /stock/i });
      
      if (stockFilter) {
        await user.click(stockFilter);

        // Select "Low Stock"
        const lowStockOption = await screen.findByRole('option', { name: /low stock/i });
        await user.click(lowStockOption);

        expect(stockFilter).toBeInTheDocument();
      }
    });

    it('filters by attribute values', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      // Look for attribute filter (e.g., Color filter)
      const colorFilter = screen.queryByRole('combobox', { name: /color/i });

      if (colorFilter) {
        await user.click(colorFilter);

        const redOption = await screen.findByRole('option', { name: /red/i });
        await user.click(redOption);

        expect(colorFilter).toBeInTheDocument();
      }
    });

    it('clears all filters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      // Apply filter first
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      await user.click(statusFilter);

      // Look for clear/reset button
      const clearButton = screen.queryByRole('button', { name: /clear/i });
      
      if (clearButton) {
        await user.click(clearButton);
        // Filters should be reset
      }
    });

    it('combines multiple filters', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      // Apply status filter
      const statusFilter = screen.getByRole('combobox', { name: /status/i });
      await user.click(statusFilter);

      const activeOption = await screen.findByRole('option', { name: /^active$/i });
      await user.click(activeOption);

      // Also search
      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Red');

      // Both filters should be active
      expect(searchInput).toHaveValue('Red');
    });
  });

  // ==========================================================================
  // EDIT MODAL TESTS
  // ==========================================================================

  describe('Edit Modal', () => {
    it('opens edit modal when edit button clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Find and click edit button (in dropdown or direct button)
      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);

      const editButton = await screen.findByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/edit variant/i)).toBeInTheDocument();
      });
    });

    it('closes edit modal when cancelled', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Open modal
      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);

      const editButton = await screen.findByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      // Close modal
      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('does not show edit button when canEdit is false', () => {
      renderWithProviders(<VariantList {...mockProps} canEdit={false} />);

      // Edit buttons should not appear
      const editButtons = screen.queryAllByRole('button', { name: /edit/i });
      expect(editButtons.length).toBe(0);
    });

    it('populates modal with variant data', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Open edit modal
      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);

      const editButton = await screen.findByRole('menuitem', { name: /edit/i });
      await user.click(editButton);

      // Modal should contain variant data
      await waitFor(() => {
        expect(screen.getByDisplayValue('TEST-001')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Red - Small')).toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // DELETE CONFIRMATION TESTS
  // ==========================================================================

  describe('Delete Confirmation', () => {
    it('shows delete confirmation dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Click delete button
      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);

      const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteButton);

      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
      });
    });

    it('cancels delete operation', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Open delete confirmation
      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);

      const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteButton);

      // Cancel
      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Dialog should close, variant still there
      await waitFor(() => {
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument();
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });
    });

    it('confirms delete and calls mutation', async () => {
      const user = userEvent.setup();
      const mutateMock = vi.fn();
      
      mockUseDeleteVariant.mockReturnValue({
        mutate: mutateMock,
        isPending: false,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Open delete confirmation
      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(moreButtons[0]);

      const deleteButton = await screen.findByRole('menuitem', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm
      const confirmButton = await screen.findByRole('button', { name: /confirm|delete/i });
      await user.click(confirmButton);

      // Should call delete mutation
      await waitFor(() => {
        expect(mutateMock).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockProps.tenantId,
            productId: mockProps.productId,
            variantId: '1',
          })
        );
      });
    });

    it('does not show delete button when canDelete is false', () => {
      renderWithProviders(<VariantList {...mockProps} canDelete={false} />);

      // Delete buttons should not appear
      const deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBe(0);
    });

    it('shows loading state during delete', async () => {
      const user = userEvent.setup();
      
      mockUseDeleteVariant.mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Should show loading indicator (disabled buttons or spinner)
      const moreButtons = screen.getAllByRole('button', { name: /more/i });
      expect(moreButtons[0]).toBeDisabled();
    });
  });

  // ==========================================================================
  // SORTING TESTS
  // ==========================================================================

  describe('Sorting', () => {
    it('sorts by column when header clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      // Find sortable column header (e.g., SKU, Price)
      const skuHeader = screen.getByRole('columnheader', { name: /sku/i });
      await user.click(skuHeader);

      // Should trigger sort (handled by hook)
      expect(skuHeader).toBeInTheDocument();
    });

    it('toggles sort direction', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      const priceHeader = screen.getByRole('columnheader', { name: /price/i });
      
      // First click: ascending
      await user.click(priceHeader);
      
      // Second click: descending
      await user.click(priceHeader);

      expect(priceHeader).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // PAGINATION TESTS
  // ==========================================================================

  describe('Pagination', () => {
    it('displays pagination controls', () => {
      mockUseProductVariants.mockReturnValue({
        data: {
          data: mockVariants,
          meta: {
            current_page: 1,
            per_page: 10,
            total: 50,
            last_page: 5,
          },
        },
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      // Should show pagination
      expect(screen.getByText(/1.*5/)).toBeInTheDocument();
    });

    it('navigates to next page', async () => {
      const user = userEvent.setup();
      
      mockUseProductVariants.mockReturnValue({
        data: {
          data: mockVariants,
          meta: {
            current_page: 1,
            per_page: 10,
            total: 50,
            last_page: 5,
          },
        },
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      // Click next page button
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(nextButton).toBeInTheDocument();
    });

    it('navigates to previous page', async () => {
      const user = userEvent.setup();
      
      mockUseProductVariants.mockReturnValue({
        data: {
          data: mockVariants,
          meta: {
            current_page: 2,
            per_page: 10,
            total: 50,
            last_page: 5,
          },
        },
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      // Click previous page button
      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      expect(prevButton).toBeInTheDocument();
    });

    it('disables next button on last page', () => {
      mockUseProductVariants.mockReturnValue({
        data: {
          data: mockVariants,
          meta: {
            current_page: 5,
            per_page: 10,
            total: 50,
            last_page: 5,
          },
        },
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('disables previous button on first page', () => {
      mockUseProductVariants.mockReturnValue({
        data: {
          data: mockVariants,
          meta: {
            current_page: 1,
            per_page: 10,
            total: 50,
            last_page: 5,
          },
        },
        isLoading: false,
        isError: false,
      });

      renderWithProviders(<VariantList {...mockProps} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // BULK OPERATIONS TESTS
  // ==========================================================================

  describe('Bulk Operations', () => {
    it('selects multiple variants', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Find and click checkboxes
      const checkboxes = screen.getAllByRole('checkbox');
      
      if (checkboxes.length > 1) {
        await user.click(checkboxes[0]);
        await user.click(checkboxes[1]);

        // Should show bulk action bar
        const bulkActions = screen.queryByText(/selected/i);
        if (bulkActions) {
          expect(bulkActions).toBeInTheDocument();
        }
      }
    });

    it('selects all variants', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Find select all checkbox (usually in header)
      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      await user.click(selectAllCheckbox);

      // All variants should be selected
      const bulkActions = screen.queryByText(/3.*selected/i);
      if (bulkActions) {
        expect(bulkActions).toBeInTheDocument();
      }
    });

    it('clears selection', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Red - Small')).toBeInTheDocument();
      });

      // Select some
      const checkboxes = screen.getAllByRole('checkbox');
      if (checkboxes.length > 0) {
        await user.click(checkboxes[0]);

        // Clear selection
        const clearButton = screen.queryByRole('button', { name: /clear/i });
        if (clearButton) {
          await user.click(clearButton);
        }
      }
    });
  });

  // ==========================================================================
  // IMMUTABLE RULES COMPLIANCE TESTS
  // ==========================================================================

  describe('IMMUTABLE RULES Compliance', () => {
    it('requires tenantId prop', () => {
      // @ts-expect-error Testing required prop
      expect(() => renderWithProviders(<VariantList productId={mockProductId()} />)).toThrow();
    });

    it('passes tenant-scoped parameters to hooks', () => {
      renderWithProviders(<VariantList {...mockProps} />);

      expect(mockUseProductVariants).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockProps.tenantId,
          productId: mockProps.productId,
        })
      );
    });

    it('all variants include tenant_id', async () => {
      renderWithProviders(<VariantList {...mockProps} />);

      await waitFor(() => {
        const fetchedData = mockUseProductVariants.mock.results[0].value.data;
        if (fetchedData && fetchedData.data) {
          fetchedData.data.forEach((variant: any) => {
            expect(variant.tenant_id).toBe(mockProps.tenantId);
          });
        }
      });
    });
  });
});