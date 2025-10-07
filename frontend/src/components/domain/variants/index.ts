/**
 * Variant Components - Centralized Exports
 * Phase 6: Product Variants - Day 13-14, Week 16 Day 16B-17
 * 
 * Main components for product variant management.
 */

export { VariantManager } from './VariantManager';
export { VariantSetupChoice } from './VariantSetupChoice';
export { VariantList } from './VariantList';
export { VariantEditModal } from './VariantEditModal';
export { VariantMatrixBuilder } from './VariantMatrixBuilder';
export { VariantTemplateGallery } from './VariantTemplateGallery';
export { VariantAnalyticsDashboard } from './VariantAnalyticsDashboard';

// UI Components
export {
  VariantEmptyState,
  NoVariantsEmptyState,
  NoTemplatesEmptyState,
  NoAnalyticsEmptyState,
  NoSearchResultsEmptyState,
} from './VariantEmptyState';

export {
  VariantListSkeleton,
  VariantMatrixSkeleton,
  TemplateGallerySkeleton,
  AnalyticsDashboardSkeleton,
  ProductDetailSkeleton,
} from './VariantSkeletonLoader';

// Re-export types for convenience
export type { VariantManagerProps } from './VariantManager';
export type { VariantSetupChoiceProps } from './VariantSetupChoice';
export type { VariantListProps } from './VariantList';
export type { VariantEditModalProps } from './VariantEditModal';
export type { VariantMatrixBuilderProps } from './VariantMatrixBuilder';
export type { VariantTemplateGalleryProps } from './VariantTemplateGallery';