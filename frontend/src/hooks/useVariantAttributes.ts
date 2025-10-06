/**
 * Custom hook for managing variant attributes
 * 
 * Features:
 * - Fetch attributes with filters
 * - Get popular attributes
 * - Create, update, delete attributes
 * - Add/remove attribute values
 * - Automatic cache invalidation
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All operations require tenantId (tenant-scoped)
 * - Uses 'api' guard for permissions
 * 
 * @module hooks/useVariantAttributes
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  getVariantAttributes,
  getPopularAttributes,
  getVariantAttribute,
  createVariantAttribute,
  updateVariantAttribute,
  deleteVariantAttribute,
  addAttributeValue,
  removeAttributeValue,
  type AttributeQueryParams,
  type VariantAttributeInput,
} from '../api/variantsApi';
import { type VariantAttribute, type AttributeListResponse } from '../types/variant';
import { useToast } from './use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const attributeKeys = {
  all: ['variant-attributes'] as const,
  lists: () => [...attributeKeys.all, 'list'] as const,
  list: (tenantId: string, params?: AttributeQueryParams) =>
    [...attributeKeys.lists(), tenantId, params] as const,
  popular: (tenantId: string) =>
    [...attributeKeys.all, 'popular', tenantId] as const,
  details: () => [...attributeKeys.all, 'detail'] as const,
  detail: (tenantId: string, attributeId: string) =>
    [...attributeKeys.details(), tenantId, attributeId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch variant attributes list
 * 
 * @example
 * ```tsx
 * const { data } = useAttributesList(tenantId, { search: 'color' });
 * ```
 */
export function useAttributesList(
  tenantId: string,
  params?: AttributeQueryParams,
  options?: Omit<UseQueryOptions<AttributeListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<AttributeListResponse>({
    queryKey: attributeKeys.list(tenantId, params),
    queryFn: () => getVariantAttributes(tenantId, params),
    enabled: !!tenantId,
    staleTime: 60000, // 1 minute
    ...options,
  });
}

/**
 * Hook to fetch popular attributes (most frequently used)
 * 
 * @example
 * ```tsx
 * const { data: popularAttrs } = usePopularAttributes(tenantId);
 * ```
 */
export function usePopularAttributes(
  tenantId: string,
  options?: Omit<UseQueryOptions<VariantAttribute[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VariantAttribute[]>({
    queryKey: attributeKeys.popular(tenantId),
    queryFn: () => getPopularAttributes(tenantId),
    enabled: !!tenantId,
    staleTime: 300000, // 5 minutes
    ...options,
  });
}

/**
 * Hook to fetch a single attribute
 * 
 * @example
 * ```tsx
 * const { data: attribute } = useAttributeDetail(tenantId, attributeId);
 * ```
 */
export function useAttributeDetail(
  tenantId: string,
  attributeId: string,
  options?: Omit<UseQueryOptions<VariantAttribute>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VariantAttribute>({
    queryKey: attributeKeys.detail(tenantId, attributeId),
    queryFn: () => getVariantAttribute(tenantId, attributeId),
    enabled: !!tenantId && !!attributeId,
    staleTime: 60000,
    ...options,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new variant attribute
 * 
 * @example
 * ```tsx
 * const { mutate: create } = useCreateAttribute(tenantId);
 * 
 * create({
 *   name: 'Size',
 *   values: ['S', 'M', 'L', 'XL'],
 * });
 * ```
 */
export function useCreateAttribute(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: VariantAttributeInput) => createVariantAttribute(tenantId, data),
    onSuccess: (newAttribute) => {
      queryClient.invalidateQueries({ queryKey: attributeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: attributeKeys.popular(tenantId) });

      toast({
        title: 'Attribute created',
        description: `Attribute "${newAttribute.name}" has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create attribute',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing attribute
 * 
 * @example
 * ```tsx
 * const { mutate: update } = useUpdateAttribute(tenantId);
 * 
 * update({
 *   attributeId: 'xxx',
 *   data: { name: 'Size (Updated)' }
 * });
 * ```
 */
export function useUpdateAttribute(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ attributeId, data }: { attributeId: string; data: Partial<VariantAttributeInput> }) =>
      updateVariantAttribute(tenantId, attributeId, data),
    onSuccess: (updatedAttribute) => {
      queryClient.invalidateQueries({ queryKey: attributeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: attributeKeys.detail(tenantId, updatedAttribute.id) });

      toast({
        title: 'Attribute updated',
        description: `Attribute "${updatedAttribute.name}" has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update attribute',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete an attribute
 * 
 * @example
 * ```tsx
 * const { mutate: remove } = useDeleteAttribute(tenantId);
 * 
 * remove(attributeId);
 * ```
 */
export function useDeleteAttribute(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (attributeId: string) => deleteVariantAttribute(tenantId, attributeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attributeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: attributeKeys.all });

      toast({
        title: 'Attribute deleted',
        description: 'Attribute has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete attribute',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to add a value to an attribute
 * 
 * @example
 * ```tsx
 * const { mutate: addValue } = useAddAttributeValue(tenantId);
 * 
 * addValue({ attributeId: 'xxx', value: 'XXL' });
 * ```
 */
export function useAddAttributeValue(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ attributeId, value }: { attributeId: string; value: string }) =>
      addAttributeValue(tenantId, attributeId, value),
    onSuccess: (updatedAttribute) => {
      queryClient.invalidateQueries({ queryKey: attributeKeys.detail(tenantId, updatedAttribute.id) });
      queryClient.invalidateQueries({ queryKey: attributeKeys.lists() });

      toast({
        title: 'Value added',
        description: `Value has been added to "${updatedAttribute.name}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add value',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to remove a value from an attribute
 * 
 * @example
 * ```tsx
 * const { mutate: removeValue } = useRemoveAttributeValue(tenantId);
 * 
 * removeValue({ attributeId: 'xxx', value: 'XXL' });
 * ```
 */
export function useRemoveAttributeValue(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ attributeId, value }: { attributeId: string; value: string }) =>
      removeAttributeValue(tenantId, attributeId, value),
    onSuccess: (updatedAttribute) => {
      queryClient.invalidateQueries({ queryKey: attributeKeys.detail(tenantId, updatedAttribute.id) });
      queryClient.invalidateQueries({ queryKey: attributeKeys.lists() });

      toast({
        title: 'Value removed',
        description: `Value has been removed from "${updatedAttribute.name}".`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to remove value',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}