/**
 * Custom hook for managing variant templates
 * 
 * Features:
 * - Fetch templates with filters
 * - Create, update, delete templates
 * - Preview template (see what variants will be generated)
 * - Apply template to product
 * - Automatic cache invalidation
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All operations require tenantId (tenant-scoped)
 * - Templates are tenant-scoped (no cross-tenant sharing)
 * 
 * @module hooks/useVariantTemplates
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import {
  getVariantTemplates,
  getVariantTemplate,
  createVariantTemplate,
  updateVariantTemplate,
  deleteVariantTemplate,
  previewTemplate,
  applyTemplate,
  type TemplateQueryParams,
  type VariantTemplateInput,
} from '../api/variantsApi';
import { 
  type VariantTemplate, 
  type TemplateListResponse, 
  type ProductVariant 
} from '../types/variant';
import { useToast } from './use-toast';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const templateKeys = {
  all: ['variant-templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (tenantId: string, params?: TemplateQueryParams) =>
    [...templateKeys.lists(), tenantId, params] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (tenantId: string, templateId: string) =>
    [...templateKeys.details(), tenantId, templateId] as const,
  preview: (tenantId: string, templateId: string, productId: string) =>
    [...templateKeys.all, 'preview', tenantId, templateId, productId] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch variant templates list
 * 
 * @example
 * ```tsx
 * const { data } = useTemplatesList(tenantId, { category: 'clothing' });
 * ```
 */
export function useTemplatesList(
  tenantId: string,
  params?: TemplateQueryParams,
  options?: Omit<UseQueryOptions<TemplateListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TemplateListResponse>({
    queryKey: templateKeys.list(tenantId, params),
    queryFn: () => getVariantTemplates(tenantId, params),
    enabled: !!tenantId,
    staleTime: 300000, // 5 minutes (templates don't change often)
    ...options,
  });
}

/**
 * Hook to fetch a single template
 * 
 * @example
 * ```tsx
 * const { data: template } = useTemplateDetail(tenantId, templateId);
 * ```
 */
export function useTemplateDetail(
  tenantId: string,
  templateId: string,
  options?: Omit<UseQueryOptions<VariantTemplate>, 'queryKey' | 'queryFn'>
) {
  return useQuery<VariantTemplate>({
    queryKey: templateKeys.detail(tenantId, templateId),
    queryFn: () => getVariantTemplate(tenantId, templateId),
    enabled: !!tenantId && !!templateId,
    staleTime: 300000,
    ...options,
  });
}

/**
 * Hook to preview variants that will be generated from a template
 * 
 * @example
 * ```tsx
 * const { data: previewVariants } = useTemplatePreview(
 *   tenantId, 
 *   templateId, 
 *   productId
 * );
 * ```
 */
export function useTemplatePreview(
  tenantId: string,
  templateId: string,
  productId: string,
  options?: Omit<UseQueryOptions<ProductVariant[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery<ProductVariant[]>({
    queryKey: templateKeys.preview(tenantId, templateId, productId),
    queryFn: () => previewTemplate(tenantId, templateId, productId),
    enabled: !!tenantId && !!templateId && !!productId,
    staleTime: 0, // Don't cache preview
    ...options,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new variant template
 * 
 * @example
 * ```tsx
 * const { mutate: create } = useCreateTemplate(tenantId);
 * 
 * create({
 *   name: 'Clothing Template',
 *   description: 'Standard sizes and colors for clothing',
 *   category: 'clothing',
 *   attributes: [
 *     { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
 *     { name: 'Color', values: ['Red', 'Blue', 'Black'] },
 *   ],
 * });
 * ```
 */
export function useCreateTemplate(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: VariantTemplateInput) => createVariantTemplate(tenantId, data),
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });

      toast({
        title: 'Template created',
        description: `Template "${newTemplate.name}" has been created successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create template',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing template
 * 
 * @example
 * ```tsx
 * const { mutate: update } = useUpdateTemplate(tenantId);
 * 
 * update({
 *   templateId: 'xxx',
 *   data: { name: 'Updated Template Name' }
 * });
 * ```
 */
export function useUpdateTemplate(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: Partial<VariantTemplateInput> }) =>
      updateVariantTemplate(tenantId, templateId, data),
    onSuccess: (updatedTemplate) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(tenantId, updatedTemplate.id) });

      toast({
        title: 'Template updated',
        description: `Template "${updatedTemplate.name}" has been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update template',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a template
 * 
 * @example
 * ```tsx
 * const { mutate: remove } = useDeleteTemplate(tenantId);
 * 
 * remove(templateId);
 * ```
 */
export function useDeleteTemplate(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (templateId: string) => deleteVariantTemplate(tenantId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: templateKeys.all });

      toast({
        title: 'Template deleted',
        description: 'Template has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete template',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to apply a template to a product
 * Creates variants based on the template's attributes
 * 
 * @example
 * ```tsx
 * const { mutate: apply, isPending } = useApplyTemplate(tenantId);
 * 
 * apply({
 *   templateId: 'xxx',
 *   productId: 'yyy',
 *   baseSKU: 'TSHIRT',
 *   basePrice: 19.99,
 * });
 * ```
 */
export function useApplyTemplate(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      templateId, 
      productId, 
      baseSKU, 
      basePrice 
    }: { 
      templateId: string; 
      productId: string;
      baseSKU?: string;
      basePrice?: number;
    }) => applyTemplate(tenantId, templateId, productId, baseSKU, basePrice),
    onSuccess: (variants) => {
      // Invalidate variant queries
      queryClient.invalidateQueries({ queryKey: ['variants'] });

      toast({
        title: 'Template applied',
        description: `Successfully created ${variants.length} variants from template.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to apply template',
        description: error?.response?.data?.message || error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
}