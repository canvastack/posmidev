/**
 * Custom hook for managing product variants using React Query
 * 
 * Features:
 * - Fetch variants with filters and pagination
 * - Create, update, delete variants (with mutations)
 * - Bulk operations (create, update, delete)
 * - Stock management (adjust, reserve, release)
 * - Automatic cache invalidation
 * - Loading states and error handling
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All operations require tenantId (tenant-scoped)
 * - Uses 'api' guard for permissions
 * - No cross-tenant data access
 * 
 * @module hooks/useVariants
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { 
  getVariants, 
  getProductVariants,
  getVariant,
  createVariant,
  updateVariant,
  deleteVariant,
  bulkCreateVariants,
  bulkUpdateVariants,
  bulkDeleteVariants,
  adjustVariantStock,
  reserveVariantStock,
  releaseVariantStock,
  type VariantQueryParams,
  type ProductVariantInput,
  type BulkVariantCreateInput,
  type BulkVariantUpdateInput,
  type BulkVariantDeleteInput,
  type StockAdjustment,
} from '../api/variantsApi';
import { type ProductVariant, type VariantListResponse } from '../types/variant';
import { useToast } from './use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

/**
 * Query key factory for variants
 * Ensures consistent cache keys across the application
 */
export const variantKeys = {
  all: ['variants'] as const,
  lists: () => [...variantKeys.all, 'list'] as const,
  list: (tenantId: string, filters?: VariantQueryParams) => 
    [...variantKeys.lists(), tenantId, filters] as const,
  productVariants: (tenantId: string, productId: string, filters?: VariantQueryParams) =>
    [...variantKeys.all, 'product', tenantId, productId, filters] as const,
  details: () => [...variantKeys.all, 'detail'] as const,
  detail: (tenantId: string, variantId: string) => 
    [...variantKeys.details(), tenantId, variantId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch variants list with optional filters
 * 
 * @param tenantId - Tenant ID (REQUIRED for tenant-scoping)
 * @param params - Query parameters (filters, pagination, sorting)
 * @param options - React Query options
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useVariantsList(tenantId, {
 *   page: 1,
 *   per_page: 20,
 *   search: 'red',
 * });
 * ```
 */
export function useVariantsList(
  tenantId: string,
  params?: VariantQueryParams,
  options?: Omit<UseQueryOptions<VariantListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VariantListResponse>({
    queryKey: variantKeys.list(tenantId, params),
    queryFn: () => getVariants(tenantId, params),
    enabled: !!tenantId,
    staleTime: 30000, // 30 seconds
    ...options,
  });
}

/**
 * Hook to fetch variants for a specific product
 * 
 * @param tenantId - Tenant ID (REQUIRED)
 * @param productId - Product ID
 * @param params - Query parameters
 * 
 * @example
 * ```tsx
 * const { data } = useProductVariants(tenantId, productId);
 * ```
 */
export function useProductVariants(
  tenantId: string,
  productId: string,
  params?: VariantQueryParams,
  options?: Omit<UseQueryOptions<ProductVariant[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProductVariant[]>({
    queryKey: variantKeys.productVariants(tenantId, productId, params),
    // Unwrap API response shape { data: ProductVariant[], meta, links } to just the array for consumers
    queryFn: async () => {
      const res = await getProductVariants(tenantId, productId, params);
      return res.data;
    },
    enabled: !!tenantId && !!productId,
    staleTime: 30000,
    ...options,
  });
}

/**
 * Hook to fetch a single variant by ID
 * 
 * @param tenantId - Tenant ID (REQUIRED)
 * @param variantId - Variant ID
 * 
 * @example
 * ```tsx
 * const { data: variant } = useVariantDetail(tenantId, variantId);
 * ```
 */
export function useVariantDetail(
  tenantId: string,
  variantId: string,
  options?: Omit<UseQueryOptions<ProductVariant>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProductVariant>({
    queryKey: variantKeys.detail(tenantId, variantId),
    queryFn: () => getVariant(tenantId, variantId),
    enabled: !!tenantId && !!variantId,
    staleTime: 30000,
    ...options,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new variant
 * Automatically invalidates variant list cache on success
 * 
 * @example
 * ```tsx
 * const { mutate: create, isPending } = useCreateVariant(tenantId);
 * 
 * create({
 *   product_id: 'xxx',
 *   sku: 'TSHIRT-M-RED',
 *   attributes: { Size: 'M', Color: 'Red' },
 *   // ...
 * });
 * ```
 */
export function useCreateVariant(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: ProductVariantInput) => createVariant(tenantId, data),
    onSuccess: (newVariant) => {
      // Invalidate variant lists
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.productVariants(tenantId, newVariant.product_id) 
      });
      
      toast({
        title: 'Variant created',
        description: `Variant "${newVariant.sku}" has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create variant',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing variant
 * 
 * @example
 * ```tsx
 * const { mutate: update } = useUpdateVariant(tenantId);
 * 
 * update({
 *   variantId: 'xxx',
 *   data: { price: 29.99, stock_quantity: 100 }
 * });
 * ```
 */
export function useUpdateVariant(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ variantId, data }: { variantId: string; data: Partial<ProductVariantInput> }) =>
      updateVariant(tenantId, variantId, data),
    onSuccess: (updatedVariant) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.productVariants(tenantId, updatedVariant.product_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.detail(tenantId, updatedVariant.id) 
      });
      
      toast({
        title: 'Variant updated',
        description: `Variant "${updatedVariant.sku}" has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update variant',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a variant
 * 
 * @example
 * ```tsx
 * const { mutate: remove } = useDeleteVariant(tenantId);
 * 
 * remove(variantId);
 * ```
 */
export function useDeleteVariant(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (variantId: string) => deleteVariant(tenantId, variantId),
    onSuccess: () => {
      // Invalidate all variant lists
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: variantKeys.all });
      
      toast({
        title: 'Variant deleted',
        description: 'Variant has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete variant',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// BULK OPERATION HOOKS
// ============================================================================

/**
 * Hook to bulk create variants
 * 
 * @example
 * ```tsx
 * const { mutate: bulkCreate } = useBulkCreateVariants(tenantId);
 * 
 * bulkCreate({
 *   product_id: 'xxx',
 *   variants: [
 *     { sku: 'V1', attributes: {...}, price: 10 },
 *     { sku: 'V2', attributes: {...}, price: 12 },
 *   ]
 * });
 * ```
 */
export function useBulkCreateVariants(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: BulkVariantCreateInput) => bulkCreateVariants(tenantId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: variantKeys.all });
      
      toast({
        title: 'Variants created',
        description: `Successfully created ${response.created_count} variants.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create variants',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to bulk update variants
 * 
 * @example
 * ```tsx
 * const { mutate: bulkUpdate } = useBulkUpdateVariants(tenantId);
 * 
 * bulkUpdate({
 *   variant_ids: ['id1', 'id2'],
 *   updates: { is_active: false }
 * });
 * ```
 */
export function useBulkUpdateVariants(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: BulkVariantUpdateInput) => bulkUpdateVariants(tenantId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: variantKeys.all });
      
      toast({
        title: 'Variants updated',
        description: `Successfully updated ${response.updated_count} variants.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update variants',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to bulk delete variants
 * 
 * @example
 * ```tsx
 * const { mutate: bulkDelete } = useBulkDeleteVariants(tenantId);
 * 
 * bulkDelete({ variant_ids: ['id1', 'id2', 'id3'] });
 * ```
 */
export function useBulkDeleteVariants(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: BulkVariantDeleteInput) => bulkDeleteVariants(tenantId, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: variantKeys.all });
      
      toast({
        title: 'Variants deleted',
        description: `Successfully deleted ${response.deleted_count} variants.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete variants',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// STOCK MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook to adjust variant stock
 * 
 * @example
 * ```tsx
 * const { mutate: adjustStock } = useAdjustVariantStock(tenantId);
 * 
 * adjustStock({
 *   variantId: 'xxx',
 *   adjustment: { quantity: 10, reason: 'restock', notes: 'Received shipment' }
 * });
 * ```
 */
export function useAdjustVariantStock(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ variantId, adjustment }: { variantId: string; adjustment: StockAdjustment }) =>
      adjustVariantStock(tenantId, variantId, adjustment),
    onSuccess: (updatedVariant) => {
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.detail(tenantId, updatedVariant.id) 
      });
      
      toast({
        title: 'Stock adjusted',
        description: `Stock for variant "${updatedVariant.sku}" has been adjusted.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to adjust stock',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to reserve variant stock
 * 
 * @example
 * ```tsx
 * const { mutate: reserve } = useReserveVariantStock(tenantId);
 * 
 * reserve({ variantId: 'xxx', quantity: 5, reason: 'pending order' });
 * ```
 */
export function useReserveVariantStock(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ variantId, quantity, reason }: { variantId: string; quantity: number; reason?: string }) =>
      reserveVariantStock(tenantId, variantId, quantity, reason),
    onSuccess: (updatedVariant) => {
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.detail(tenantId, updatedVariant.id) 
      });
      
      toast({
        title: 'Stock reserved',
        description: `Stock reserved for variant "${updatedVariant.sku}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to reserve stock',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to release variant stock
 * 
 * @example
 * ```tsx
 * const { mutate: release } = useReleaseVariantStock(tenantId);
 * 
 * release({ variantId: 'xxx', quantity: 3 });
 * ```
 */
export function useReleaseVariantStock(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ variantId, quantity, reason }: { variantId: string; quantity: number; reason?: string }) =>
      releaseVariantStock(tenantId, variantId, quantity, reason),
    onSuccess: (updatedVariant) => {
      queryClient.invalidateQueries({ 
        queryKey: variantKeys.detail(tenantId, updatedVariant.id) 
      });
      
      toast({
        title: 'Stock released',
        description: `Stock released for variant "${updatedVariant.sku}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to release stock',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}