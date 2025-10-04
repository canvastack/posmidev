/**
 * BarcodePreviewModal Component
 * Phase 3: Barcode & Printing
 * 
 * Shows preview of product barcode with options to customize type, size, and format
 */

import React, { useState, useEffect } from 'react';
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from '@/components/ui/Select';
import { Download, Loader2 } from 'lucide-react';
import { barcodeApi } from '@/api/barcode';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Product } from '@/types';
import type { BarcodeType, BarcodeSize } from '@/types/barcode';
import {
  BARCODE_TYPE_LABELS,
  BARCODE_SIZE_LABELS,
} from '@/types/barcode';

interface BarcodePreviewModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export function BarcodePreviewModal({
  product,
  open,
  onClose,
}: BarcodePreviewModalProps) {
  const { tenantId } = useAuth();
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('code128');
  const [barcodeSize, setBarcodeSize] = useState<BarcodeSize>('medium');
  const [barcodeUrl, setBarcodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate preview when options change
  useEffect(() => {
    if (open && tenantId) {
      generatePreview();
    }

    // Cleanup blob URL
    return () => {
      if (barcodeUrl) {
        URL.revokeObjectURL(barcodeUrl);
      }
    };
  }, [open, barcodeType, barcodeSize, tenantId]);

  const generatePreview = async () => {
    if (!tenantId) {
      console.error('Debug: No tenantId available');
      return;
    }

    console.log('Debug: Starting barcode generation');
    console.log('Debug: tenantId:', tenantId);
    console.log('Debug: product.id:', product.id);
    console.log('Debug: product.sku:', product.sku);
    console.log('Debug: barcodeType:', barcodeType);
    console.log('Debug: barcodeSize:', barcodeSize);

    setLoading(true);
    try {
      const blob = await barcodeApi.generateBarcode(
        tenantId,
        product.id,
        {
          type: barcodeType,
          size: barcodeSize,
          format: 'png',
        }
      );

      console.log('Debug: Barcode blob received:', {
        size: blob.size,
        type: blob.type
      });

      // Revoke previous URL
      if (barcodeUrl) {
        URL.revokeObjectURL(barcodeUrl);
      }

      const url = URL.createObjectURL(blob);
      console.log('Debug: Barcode URL created:', url);
      setBarcodeUrl(url);
    } catch (error: any) {
      console.error('Debug: Failed to generate barcode:', error);
      console.error('Debug: Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
      toast.error(`Failed to generate barcode preview: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!barcodeUrl) return;

    const link = document.createElement('a');
    link.href = barcodeUrl;
    link.download = `${product.sku}_barcode.png`;
    link.click();

    toast.success('Barcode downloaded');
  };

  const handleClose = () => {
    // Cleanup blob URL
    if (barcodeUrl) {
      URL.revokeObjectURL(barcodeUrl);
      setBarcodeUrl(null);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[500px] sm:max-w-[600px] md:max-w-[700px] h-[90vh] max-h-[800px] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">Barcode - {product.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-6">
            {/* Barcode Type Selector */}
            <div className="space-y-3">
              <Label htmlFor="barcode-type" className="text-sm font-medium">
                Barcode Type
              </Label>
              <Select
                value={barcodeType}
                onValueChange={(value) => setBarcodeType(value as BarcodeType)}
              >
                <SelectTrigger id="barcode-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BARCODE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {barcodeType === 'code128' && 'Recommended for alphanumeric SKUs'}
                {barcodeType === 'ean13' && 'Requires 13-digit numeric code'}
                {barcodeType === 'qr' && 'Stores more information, smartphone scannable'}
              </p>
            </div>

            {/* Size Selector */}
            <div className="space-y-3">
              <Label htmlFor="barcode-size" className="text-sm font-medium">
                Size
              </Label>
              <Select
                value={barcodeSize}
                onValueChange={(value) => setBarcodeSize(value as BarcodeSize)}
              >
                <SelectTrigger id="barcode-size" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BARCODE_SIZE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Barcode Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Preview</Label>
              <div className="flex justify-center items-center min-h-[250px] sm:min-h-[300px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                {loading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    <p className="text-sm text-gray-500">Generating barcode...</p>
                  </div>
                ) : barcodeUrl ? (
                  <div className="flex justify-center">
                    <img
                      src={barcodeUrl}
                      alt="Barcode preview"
                      className="max-w-full h-auto max-h-[250px] sm:max-h-[300px] object-contain"
                    />
                  </div>
                ) : (
                  <p className="text-gray-400">No preview available</p>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Product Information</Label>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="font-medium">SKU:</span>
                  <span className="font-mono text-xs sm:text-sm">{product.sku}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="font-medium">Product:</span>
                  <span className="text-xs sm:text-sm">{product.name}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between">
                  <span className="font-medium">Price:</span>
                  <span className="text-xs sm:text-sm">Rp {product.price.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleClose}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!barcodeUrl || loading}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}