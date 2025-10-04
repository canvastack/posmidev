/**
 * Barcode Types and Interfaces
 * Phase 3: Barcode & Printing
 */

export type BarcodeType = 'code128' | 'ean13' | 'qr';
export type BarcodeFormat = 'png' | 'svg';
export type BarcodeSize = 'small' | 'medium' | 'large';
export type BarcodeLayout = '4x6' | '2x7' | '1x10';

export interface BarcodeGenerateOptions {
  format?: BarcodeFormat;
  type?: BarcodeType;
  size?: BarcodeSize;
}

export interface BulkBarcodeOptions {
  product_ids: string[];
  barcode_type?: BarcodeType;
  layout?: BarcodeLayout;
  include_product_name?: boolean;
  include_price?: boolean;
  include_sku?: boolean;
}

export const BARCODE_TYPE_LABELS: Record<BarcodeType, string> = {
  code128: 'Code 128',
  ean13: 'EAN-13',
  qr: 'QR Code',
};

export const BARCODE_SIZE_LABELS: Record<BarcodeSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export const BARCODE_LAYOUT_LABELS: Record<BarcodeLayout, string> = {
  '4x6': '4×6 Grid (24 labels/page)',
  '2x7': '2×7 Grid (14 labels/page, larger)',
  '1x10': '1×10 Column (10 labels/page, printer)',
};