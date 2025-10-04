/**
 * Barcode API Client
 * Phase 3: Barcode & Printing
 */

import { apiClient } from './client';
import type {
  BarcodeGenerateOptions,
  BulkBarcodeOptions,
} from '../types/barcode';

export const barcodeApi = {
  /**
   * Generate single barcode for a product
   * @param tenantId Tenant UUID
   * @param productId Product UUID
   * @param options Barcode generation options
   * @returns Barcode image as Blob
   */
  async generateBarcode(
    tenantId: string,
    productId: string,
    options?: BarcodeGenerateOptions
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (options?.format) params.append('format', options.format);
    if (options?.type) params.append('type', options.type);
    if (options?.size) params.append('size', options.size);

    const queryString = params.toString();
    const url = `/tenants/${tenantId}/products/${productId}/barcode${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await apiClient.get(url, {
      responseType: 'blob',
    });

    return response.data;
  },

  /**
   * Generate bulk barcodes as PDF
   * @param tenantId Tenant UUID
   * @param options Bulk barcode options
   * @returns PDF file as Blob
   */
  async generateBulkBarcodes(
    tenantId: string,
    options: BulkBarcodeOptions
  ): Promise<Blob> {
    const response = await apiClient.post(
      `/tenants/${tenantId}/products/barcode/bulk`,
      options,
      {
        responseType: 'blob',
      }
    );

    return response.data;
  },
};