/**
 * Custom hook for variant import/export operations
 * 
 * Features:
 * - Export variants to CSV/Excel
 * - Download import template
 * - Import variants from file
 * - Track import progress
 * - Validation and error handling
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All operations are tenant-scoped
 * - Imports validate tenant_id
 * 
 * @module hooks/useVariantImportExport
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  exportVariants,
  downloadImportTemplate,
  importVariants,
  type VariantQueryParams,
} from '../api/variantsApi';
import { useToast } from './use-toast';
import { variantKeys } from './useVariants';

// ============================================================================
// EXPORT HOOKS
// ============================================================================

/**
 * Hook to export variants to file
 * 
 * @example
 * ```tsx
 * const { mutate: exportToFile, isPending } = useExportVariants(tenantId);
 * 
 * exportToFile({
 *   format: 'csv',
 *   filters: { product_id: 'xxx' }
 * });
 * ```
 */
export function useExportVariants(tenantId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      format, 
      filters 
    }: { 
      format: 'csv' | 'excel'; 
      filters?: VariantQueryParams 
    }) => exportVariants(tenantId, format, filters),
    onSuccess: (blob, variables) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `variants-export-${Date.now()}.${variables.format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export successful',
        description: `Variants exported to ${variables.format.toUpperCase()} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Export failed',
        description: error?.response?.data?.message || error.message || 'Failed to export variants',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to download import template
 * 
 * @example
 * ```tsx
 * const { mutate: downloadTemplate } = useDownloadImportTemplate(tenantId);
 * 
 * downloadTemplate('csv');
 * ```
 */
export function useDownloadImportTemplate(tenantId: string) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (format: 'csv' | 'excel') => downloadImportTemplate(tenantId, format),
    onSuccess: (blob, format) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `variant-import-template.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Template downloaded',
        description: 'Import template has been downloaded successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Download failed',
        description: error?.response?.data?.message || error.message || 'Failed to download template',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// IMPORT HOOKS
// ============================================================================

/**
 * Hook to import variants from file
 * 
 * @example
 * ```tsx
 * const { mutate: importFile, isPending } = useImportVariants(tenantId);
 * 
 * const handleFileSelect = (file: File) => {
 *   importFile({ file, productId: 'xxx' });
 * };
 * ```
 */
export function useImportVariants(tenantId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ 
      file, 
      productId 
    }: { 
      file: File; 
      productId: string 
    }) => importVariants(tenantId, file, productId),
    onSuccess: (response) => {
      // Invalidate variant queries
      queryClient.invalidateQueries({ queryKey: variantKeys.lists() });
      queryClient.invalidateQueries({ queryKey: variantKeys.all });

      const { 
        imported_count, 
        failed_count, 
        errors 
      } = response;

      if (failed_count === 0) {
        toast({
          title: 'Import successful',
          description: `Successfully imported ${imported_count} variants.`,
        });
      } else {
        toast({
          title: 'Import completed with errors',
          description: `Imported ${imported_count} variants, ${failed_count} failed. Check console for details.`,
          variant: 'destructive',
        });
        
        // Log errors to console for debugging
        if (errors && errors.length > 0) {
          console.error('Import errors:', errors);
        }
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Import failed',
        description: error?.response?.data?.message || error.message || 'Failed to import variants',
        variant: 'destructive',
      });
    },
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate import file before uploading
 * Checks file type, size, and format
 * 
 * @param file - File to validate
 * @returns Validation result
 */
export function validateImportFile(file: File): { 
  valid: boolean; 
  error?: string 
} {
  // Check file type
  const validTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a CSV or Excel file.',
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB in bytes
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size too large. Maximum size is 10MB.',
    };
  }

  return { valid: true };
}

/**
 * Parse CSV file to preview data before import
 * 
 * @param file - CSV file
 * @returns Promise with parsed data
 */
export async function parseCSVPreview(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split('\n').map(row => 
          row.split(',').map(cell => cell.trim())
        );
        resolve(rows);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}