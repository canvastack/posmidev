/**
 * BulkBarcodePrintModal Component
 * Phase 3: Barcode & Printing
 * 
 * Modal for generating bulk barcodes as PDF with customization options
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer, Loader2 } from 'lucide-react';
import { barcodeApi } from '@/api/barcode';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { BarcodeType, BarcodeLayout } from '@/types/barcode';
import {
  BARCODE_TYPE_LABELS,
  BARCODE_LAYOUT_LABELS,
} from '@/types/barcode';

interface BulkBarcodePrintModalProps {
  productIds: string[];
  open: boolean;
  onClose: () => void;
}

export function BulkBarcodePrintModal({
  productIds,
  open,
  onClose,
}: BulkBarcodePrintModalProps) {
  const { currentTenant } = useAuth();
  const [loading, setLoading] = useState(false);
  const [barcodeType, setBarcodeType] = useState<BarcodeType>('code128');
  const [layout, setLayout] = useState<BarcodeLayout>('4x6');
  const [includeName, setIncludeName] = useState(true);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeSku, setIncludeSku] = useState(true);

  const handlePrint = async () => {
    if (!currentTenant) {
      toast.error('No tenant selected');
      return;
    }

    if (productIds.length === 0) {
      toast.error('No products selected');
      return;
    }

    setLoading(true);
    try {
      const blob = await barcodeApi.generateBulkBarcodes(currentTenant.id, {
        product_ids: productIds,
        barcode_type: barcodeType,
        layout,
        include_product_name: includeName,
        include_price: includePrice,
        include_sku: includeSku,
      });

      // Download PDF
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `barcodes_${new Date().getTime()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Generated ${productIds.length} barcode labels`);
      onClose();
    } catch (error) {
      console.error('Failed to generate barcodes:', error);
      toast.error('Failed to generate barcodes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Print Barcodes</DialogTitle>
          <DialogDescription>
            Generate PDF with {productIds.length} barcode label
            {productIds.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Barcode Type */}
          <div className="space-y-2">
            <Label htmlFor="bulk-barcode-type">Barcode Type</Label>
            <Select
              value={barcodeType}
              onValueChange={(value) => setBarcodeType(value as BarcodeType)}
            >
              <SelectTrigger id="bulk-barcode-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BARCODE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                    {value === 'code128' && ' (Recommended)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {barcodeType === 'code128' && 'Best for alphanumeric SKUs, most common in retail'}
              {barcodeType === 'ean13' && 'Requires 13-digit numeric codes, international standard'}
              {barcodeType === 'qr' && 'Can store URLs and more information, smartphone compatible'}
            </p>
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <Label htmlFor="bulk-barcode-layout">Label Layout</Label>
            <Select
              value={layout}
              onValueChange={(value) => setLayout(value as BarcodeLayout)}
            >
              <SelectTrigger id="bulk-barcode-layout">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(BARCODE_LAYOUT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {layout === '4x6' && 'Small labels for price tags'}
              {layout === '2x7' && 'Medium labels for shelf labels'}
              {layout === '1x10' && 'Large labels for product packaging'}
            </p>
          </div>

          {/* Label Content Options */}
          <div className="space-y-3">
            <Label>Label Content</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-name"
                checked={includeName}
                onCheckedChange={(checked) => setIncludeName(checked as boolean)}
              />
              <label
                htmlFor="include-name"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Include product name
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-price"
                checked={includePrice}
                onCheckedChange={(checked) => setIncludePrice(checked as boolean)}
              />
              <label
                htmlFor="include-price"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Include price
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-sku"
                checked={includeSku}
                onCheckedChange={(checked) => setIncludeSku(checked as boolean)}
              />
              <label
                htmlFor="include-sku"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Include SKU
              </label>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Choose which information to display on each label
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={loading || productIds.length === 0}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Printer className="w-4 h-4 mr-2" />
            )}
            Generate PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}