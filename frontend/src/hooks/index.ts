/**
 * Centralized exports for all custom hooks
 * 
 * @module hooks
 */

// ============================================================================
// EXISTING HOOKS
// ============================================================================

export { useAuth } from './useAuth';
export { usePermissions } from './usePermissions';
export { useTenantId } from './useTenantId';
export { useDebounce } from './useDebounce';
export { useBulkSelection } from './useBulkSelection';
export { useToast, toast } from './use-toast';
export { useMobile } from './use-mobile';
export { useTheme } from './useTheme';
export { useScrollTop } from './useScrollTop';
export { useContentPage } from './useContentPage';
export { useFooterContent } from './useFooterContent';
export { usePublicProduct } from './usePublicProduct';
export { usePublicProducts } from './usePublicProducts';

// ============================================================================
// VARIANT HOOKS (NEW - PHASE 6)
// ============================================================================

// Core variant operations
export {
  useVariantsList,
  useProductVariants,
  useVariantDetail,
  useCreateVariant,
  useUpdateVariant,
  useDeleteVariant,
  useBulkCreateVariants,
  useBulkUpdateVariants,
  useBulkDeleteVariants,
  useAdjustVariantStock,
  useReserveVariantStock,
  useReleaseVariantStock,
  variantKeys,
} from './useVariants';

// Variant matrix builder
export {
  useVariantMatrix,
} from './useVariantMatrix';

// Variant attributes
export {
  useAttributesList,
  usePopularAttributes,
  useAttributeDetail,
  useCreateAttribute,
  useUpdateAttribute,
  useDeleteAttribute,
  useAddAttributeValue,
  useRemoveAttributeValue,
  attributeKeys,
} from './useVariantAttributes';

// Variant templates
export {
  useTemplatesList,
  useTemplateDetail,
  useTemplatePreview,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useApplyTemplate,
  templateKeys,
} from './useVariantTemplates';

// Variant analytics
export {
  useProductVariantAnalytics,
  useTopPerformers,
  useVariantComparison,
  useVariantPerformanceSummary,
  variantAnalyticsKeys,
  transformAnalyticsForChart,
  transformTopPerformersForChart,
  calculateStockHeatmap,
  generateRecommendations,
  calculateOverviewMetrics,
} from './useVariantAnalytics';

// Variant import/export
export {
  useExportVariants,
  useDownloadImportTemplate,
  useImportVariants,
  validateImportFile,
  parseCSVPreview,
} from './useVariantImportExport';