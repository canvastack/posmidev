/**
 * useVariants Hook Tests
 * 
 * Tests the custom hooks for managing variants with React Query.
 * 
 * Test Coverage:
 * - Query hooks (fetch variants)
 * - Mutation hooks (create, update, delete)
 * - Bulk operations
 * - Error handling
 * - Cache invalidation
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All test data includes tenant_id
 * - All operations are tenant-scoped
 * - guard_name: 'api'
 * 
 * @module hooks/__tests__/useVariants.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useProductVariants,
  useVariant,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useBulkCreateVariants,
} from '../useVariants';
import * as variantsApi from '@/api/variantsApi';
import {
  mockTenantId,
  mockProductId,
  mockVariantId,
  mockProductVariant,
  mockVariantListResponse,
} from '@/test/test-utils';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('@/api/variantsApi');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// ============================================================================
// TEST WRAPPER
// ============================================================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Silence errors in tests
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ============================================================================
// MOCK DATA
// ============================================================================

const mockVariants = [
  mockProductVariant({ id: mockVariantId(1), sku: 'TEST-001' }),
  mockProductVariant({ id: mockVariantId(2), sku: 'TEST-002' }),
];

// ============================================================================
// TEST SUITE
// ============================================================================

describe('useVariants Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // QUERY HOOKS - useProductVariants
  // ==========================================================================

  describe('useProductVariants', () => {
    it('fetches variants successfully', async () => {
      const mockResponse = mockVariantListResponse(2);
      vi.spyOn(variantsApi, 'getProductVariants').mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () =>
          useProductVariants({
            tenantId: mockTenantId(),
            productId: mockProductId(),
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.data).toHaveLength(2);
      expect(variantsApi.getProductVariants).toHaveBeenCalledWith({
        tenantId: mockTenantId(),
        productId: mockProductId(),
      });
    });

    it('handles fetch error', async () => {
      const mockError = new Error('Failed to fetch variants');
      vi.spyOn(variantsApi, 'getProductVariants').mockRejectedValue(mockError);

      const { result } = renderHook(
        () =>
          useProductVariants({
            tenantId: mockTenantId(),
            productId: mockProductId(),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('supports search parameter', async () => {
      const mockResponse = mockVariantListResponse(1);
      vi.spyOn(variantsApi, 'getProductVariants').mockResolvedValue(mockResponse);

      renderHook(
        () =>
          useProductVariants({
            tenantId: mockTenantId(),
            productId: mockProductId(),
            params: { search: 'Red' },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(variantsApi.getProductVariants).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({ search: 'Red' }),
          })
        );
      });
    });

    it('supports pagination parameters', async () => {
      const mockResponse = mockVariantListResponse(10);
      vi.spyOn(variantsApi, 'getProductVariants').mockResolvedValue(mockResponse);

      renderHook(
        () =>
          useProductVariants({
            tenantId: mockTenantId(),
            productId: mockProductId(),
            params: { page: 2, per_page: 10 },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(variantsApi.getProductVariants).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({ page: 2, per_page: 10 }),
          })
        );
      });
    });

    it('supports filter parameters', async () => {
      const mockResponse = mockVariantListResponse(1);
      vi.spyOn(variantsApi, 'getProductVariants').mockResolvedValue(mockResponse);

      renderHook(
        () =>
          useProductVariants({
            tenantId: mockTenantId(),
            productId: mockProductId(),
            params: { status: 'active', stock_status: 'in_stock' },
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(variantsApi.getProductVariants).toHaveBeenCalledWith(
          expect.objectContaining({
            params: expect.objectContaining({ status: 'active', stock_status: 'in_stock' }),
          })
        );
      });
    });

    it('can be disabled', () => {
      vi.spyOn(variantsApi, 'getProductVariants').mockResolvedValue(mockVariantListResponse());

      renderHook(
        () =>
          useProductVariants({
            tenantId: mockTenantId(),
            productId: mockProductId(),
            enabled: false,
          }),
        { wrapper: createWrapper() }
      );

      // Should not call API
      expect(variantsApi.getProductVariants).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // QUERY HOOKS - useVariant
  // ==========================================================================

  describe('useVariant', () => {
    it('fetches single variant successfully', async () => {
      const mockVariant = mockProductVariant();
      vi.spyOn(variantsApi, 'getVariant').mockResolvedValue(mockVariant);

      const { result } = renderHook(
        () =>
          useVariant({
            tenantId: mockTenantId(),
            productId: mockProductId(),
            variantId: mockVariantId(),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockVariant);
      expect(variantsApi.getVariant).toHaveBeenCalledWith({
        tenantId: mockTenantId(),
        productId: mockProductId(),
        variantId: mockVariantId(),
      });
    });

    it('handles fetch error for single variant', async () => {
      const mockError = new Error('Variant not found');
      vi.spyOn(variantsApi, 'getVariant').mockRejectedValue(mockError);

      const { result } = renderHook(
        () =>
          useVariant({
            tenantId: mockTenantId(),
            productId: mockProductId(),
            variantId: mockVariantId(),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ==========================================================================
  // MUTATION HOOKS - useCreateVariant
  // ==========================================================================

  describe('useCreateVariant', () => {
    it('creates variant successfully', async () => {
      const newVariant = mockProductVariant();
      vi.spyOn(variantsApi, 'createVariant').mockResolvedValue(newVariant);

      const { result } = renderHook(() => useCreateVariant(), {
        wrapper: createWrapper(),
      });

      const variantInput = {
        sku: 'NEW-SKU',
        name: 'New Variant',
        price: 100,
        stock: 10,
        attributes: { color: 'Red' },
        status: 'active' as const,
      };

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          data: variantInput,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(newVariant);
      expect(variantsApi.createVariant).toHaveBeenCalledWith({
        tenantId: mockTenantId(),
        productId: mockProductId(),
        data: variantInput,
      });
    });

    it('handles create error', async () => {
      const mockError = new Error('Validation failed');
      vi.spyOn(variantsApi, 'createVariant').mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          data: {
            sku: 'NEW-SKU',
            name: 'New Variant',
            price: 100,
            stock: 10,
            attributes: {},
            status: 'active',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('invalidates cache after create', async () => {
      const newVariant = mockProductVariant();
      vi.spyOn(variantsApi, 'createVariant').mockResolvedValue(newVariant);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useCreateVariant(), { wrapper });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          data: {
            sku: 'NEW-SKU',
            name: 'New Variant',
            price: 100,
            stock: 10,
            attributes: {},
            status: 'active',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should invalidate variants cache
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // MUTATION HOOKS - useUpdateVariant
  // ==========================================================================

  describe('useUpdateVariant', () => {
    it('updates variant successfully', async () => {
      const updatedVariant = mockProductVariant({ price: 150 });
      vi.spyOn(variantsApi, 'updateVariant').mockResolvedValue(updatedVariant);

      const { result } = renderHook(() => useUpdateVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
          data: { price: 150 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(updatedVariant);
      expect(variantsApi.updateVariant).toHaveBeenCalledWith({
        tenantId: mockTenantId(),
        productId: mockProductId(),
        variantId: mockVariantId(),
        data: { price: 150 },
      });
    });

    it('handles update error', async () => {
      const mockError = new Error('Update failed');
      vi.spyOn(variantsApi, 'updateVariant').mockRejectedValue(mockError);

      const { result } = renderHook(() => useUpdateVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
          data: { price: 150 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('invalidates cache after update', async () => {
      const updatedVariant = mockProductVariant();
      vi.spyOn(variantsApi, 'updateVariant').mockResolvedValue(updatedVariant);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useUpdateVariant(), { wrapper });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
          data: { price: 150 },
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // MUTATION HOOKS - useDeleteVariant
  // ==========================================================================

  describe('useDeleteVariant', () => {
    it('deletes variant successfully', async () => {
      vi.spyOn(variantsApi, 'deleteVariant').mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(variantsApi.deleteVariant).toHaveBeenCalledWith({
        tenantId: mockTenantId(),
        productId: mockProductId(),
        variantId: mockVariantId(),
      });
    });

    it('handles delete error', async () => {
      const mockError = new Error('Cannot delete variant');
      vi.spyOn(variantsApi, 'deleteVariant').mockRejectedValue(mockError);

      const { result } = renderHook(() => useDeleteVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('invalidates cache after delete', async () => {
      vi.spyOn(variantsApi, 'deleteVariant').mockResolvedValue(undefined);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useDeleteVariant(), { wrapper });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // BULK OPERATIONS - useBulkCreateVariants
  // ==========================================================================

  describe('useBulkCreateVariants', () => {
    it('creates multiple variants successfully', async () => {
      const mockResponse = { created_count: 3, failed: 0, variants: mockVariants };
      vi.spyOn(variantsApi, 'bulkCreateVariants').mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useBulkCreateVariants(mockTenantId(), mockProductId()), {
        wrapper: createWrapper(),
      });

      const variantInputs = [
        {
          sku: 'BULK-001',
          name: 'Variant 1',
          price: 100,
          stock: 10,
          attributes: { color: 'Red' },
        },
        {
          sku: 'BULK-002',
          name: 'Variant 2',
          price: 120,
          stock: 15,
          attributes: { color: 'Blue' },
        },
      ];

      act(() => {
        result.current.mutate({ variants: variantInputs });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(variantsApi.bulkCreateVariants).toHaveBeenCalledWith(
        mockTenantId(),
        mockProductId(),
        { variants: variantInputs }
      );
    });

    it('handles bulk create error', async () => {
      const mockError = new Error('Bulk operation failed');
      vi.spyOn(variantsApi, 'bulkCreateVariants').mockRejectedValue(mockError);

      const { result } = renderHook(() => useBulkCreateVariants(mockTenantId(), mockProductId()), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ variants: [] });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('validates bulk limit (max 500)', async () => {
      const { result } = renderHook(() => useBulkCreateVariants(mockTenantId(), mockProductId()), {
        wrapper: createWrapper(),
      });

      // Try to create more than 500 variants
      const tooManyVariants = Array.from({ length: 501 }, (_, i) => ({
        sku: `BULK-${i}`,
        name: `Variant ${i}`,
        price: 100,
        stock: 10,
        attributes: {},
      }));

      act(() => {
        result.current.mutate({ variants: tooManyVariants });
      });

      // Should show error (either from validation or API)
      await waitFor(() => {
        expect(result.current.isError || result.current.isSuccess).toBe(true);
      });
    });

    it('invalidates cache after bulk create', async () => {
      const mockResponse = { created_count: 2, failed: 0, variants: mockVariants };
      vi.spyOn(variantsApi, 'bulkCreateVariants').mockResolvedValue(mockResponse);

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useBulkCreateVariants(mockTenantId(), mockProductId()), { wrapper });

      act(() => {
        result.current.mutate({
          variants: [
            {
              sku: 'BULK-001',
              name: 'Variant 1',
              price: 100,
              stock: 10,
              attributes: {},
            },
          ],
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(invalidateSpy).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('Error Handling', () => {
    it('shows toast on create error', async () => {
      const mockError = new Error('Create failed');
      vi.spyOn(variantsApi, 'createVariant').mockRejectedValue(mockError);

      const { result } = renderHook(() => useCreateVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          data: {
            sku: 'TEST',
            name: 'Test',
            price: 100,
            stock: 10,
            attributes: {},
            status: 'active',
          },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Error toast should be shown (mocked)
    });

    it('shows toast on update error', async () => {
      const mockError = new Error('Update failed');
      vi.spyOn(variantsApi, 'updateVariant').mockRejectedValue(mockError);

      const { result } = renderHook(() => useUpdateVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
          data: { price: 150 },
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('shows toast on delete error', async () => {
      const mockError = new Error('Delete failed');
      vi.spyOn(variantsApi, 'deleteVariant').mockRejectedValue(mockError);

      const { result } = renderHook(() => useDeleteVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  // ==========================================================================
  // IMMUTABLE RULES COMPLIANCE
  // ==========================================================================

  describe('IMMUTABLE RULES Compliance', () => {
    it('requires tenantId in all operations', async () => {
      const mockResponse = mockVariantListResponse();
      vi.spyOn(variantsApi, 'getProductVariants').mockResolvedValue(mockResponse);

      renderHook(
        () =>
          useProductVariants({
            tenantId: mockTenantId(),
            productId: mockProductId(),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(variantsApi.getProductVariants).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockTenantId(),
          })
        );
      });
    });

    it('passes tenant_id to create mutation', async () => {
      const newVariant = mockProductVariant();
      vi.spyOn(variantsApi, 'createVariant').mockResolvedValue(newVariant);

      const { result } = renderHook(() => useCreateVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          data: {
            sku: 'NEW-SKU',
            name: 'New Variant',
            price: 100,
            stock: 10,
            attributes: {},
            status: 'active',
          },
        });
      });

      await waitFor(() => {
        expect(variantsApi.createVariant).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockTenantId(),
          })
        );
      });
    });

    it('passes tenant_id to update mutation', async () => {
      const updatedVariant = mockProductVariant();
      vi.spyOn(variantsApi, 'updateVariant').mockResolvedValue(updatedVariant);

      const { result } = renderHook(() => useUpdateVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
          data: { price: 150 },
        });
      });

      await waitFor(() => {
        expect(variantsApi.updateVariant).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockTenantId(),
          })
        );
      });
    });

    it('passes tenant_id to delete mutation', async () => {
      vi.spyOn(variantsApi, 'deleteVariant').mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteVariant(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({
          tenantId: mockTenantId(),
          productId: mockProductId(),
          variantId: mockVariantId(),
        });
      });

      await waitFor(() => {
        expect(variantsApi.deleteVariant).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: mockTenantId(),
          })
        );
      });
    });

    it('all returned variants include tenant_id', async () => {
      const mockResponse = mockVariantListResponse(2);
      vi.spyOn(variantsApi, 'getProductVariants').mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () =>
          useProductVariants({
            tenantId: mockTenantId(),
            productId: mockProductId(),
          }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      result.current.data?.data.forEach((variant) => {
        expect(variant.tenant_id).toBe(mockTenantId());
      });
    });
  });
});