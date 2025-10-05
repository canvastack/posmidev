/**
 * Stock Adjustment Modal Component
 * Phase 5 Sprint 4: Frontend Components
 * 
 * Allows users to adjust product stock with reason and notes.
 * Supports both increase (positive) and decrease (negative) adjustments.
 * Prevents negative stock and shows real-time preview.
 * 
 * IMMUTABLE RULES ENFORCED:
 * - Tenant-scoped operations (tenantId required)
 * - Permission check via API (inventory.adjust required)
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { stockApi } from '@/api/stockApi';
import { toast } from 'sonner';
import type { AdjustmentReason, StockAdjustmentForm } from '@/types/stock';
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  productId: string;
  productName: string;
  currentStock: number;
  onSuccess: () => void;
}

export function StockAdjustmentModal({
  open,
  onOpenChange,
  tenantId,
  productId,
  productName,
  currentStock,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [reasons, setReasons] = useState<AdjustmentReason[]>([]);
  const [changeType, setChangeType] = useState<string>('');
  const [adjustment, setAdjustment] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingReasons, setIsLoadingReasons] = useState(false);

  // Load adjustment reasons on mount
  useEffect(() => {
    if (open) {
      loadReasons();
    }
  }, [open, tenantId]);

  const loadReasons = async () => {
    setIsLoadingReasons(true);
    try {
      const data = await stockApi.getAdjustmentReasons(tenantId);
      setReasons(data);
    } catch (error: any) {
      toast.error('Failed to load adjustment reasons');
      console.error('Failed to load reasons:', error);
    } finally {
      setIsLoadingReasons(false);
    }
  };

  // Calculate preview
  const adjustmentValue = parseFloat(adjustment) || 0;
  const newStock = currentStock + adjustmentValue;
  const isValid = !isNaN(adjustmentValue) && newStock >= 0 && changeType !== '';
  const isNegativeResult = newStock < 0;

  const selectedReason = reasons.find(r => r.value === changeType);

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error('Please enter a valid adjustment and reason');
      return;
    }

    if (isNegativeResult) {
      toast.error('Stock cannot be negative');
      return;
    }

    setIsLoading(true);
    try {
      const formData: StockAdjustmentForm = {
        adjustment: adjustmentValue,
        change_type: changeType as any,
        notes: notes.trim() || undefined,
      };

      await stockApi.adjustStock(tenantId, productId, formData);
      
      toast.success(
        `Stock ${adjustmentValue > 0 ? 'increased' : 'decreased'} successfully`,
        {
          description: `${productName}: ${currentStock} → ${newStock}`,
        }
      );
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to adjust stock';
      toast.error(errorMessage);
      console.error('Stock adjustment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setChangeType('');
    setAdjustment('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adjust Stock
          </DialogTitle>
          <DialogDescription>
            Update stock quantity for <strong>{productName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Current Stock Display */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Current Stock</span>
            <Badge variant="secondary" className="text-base font-semibold">
              {currentStock} units
            </Badge>
          </div>

          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label htmlFor="changeType">Adjustment Reason *</Label>
            <Select
              value={changeType}
              onValueChange={setChangeType}
              disabled={isLoadingReasons || isLoading}
            >
              <SelectTrigger id="changeType">
                <SelectValue placeholder={isLoadingReasons ? "Loading..." : "Select reason"} />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{reason.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {reason.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedReason && (
              <p className="text-xs text-muted-foreground">
                Type: {selectedReason.type === 'both' ? 'Addition or Deduction' : selectedReason.type}
              </p>
            )}
          </div>

          {/* Adjustment Value */}
          <div className="space-y-2">
            <Label htmlFor="adjustment">
              Adjustment Quantity *
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (Positive = Add, Negative = Deduct)
              </span>
            </Label>
            <Input
              id="adjustment"
              type="number"
              placeholder="e.g., 10 or -5"
              value={adjustment}
              onChange={(e) => setAdjustment(e.target.value)}
              disabled={isLoading}
              className="text-base"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Enter any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Preview */}
          {adjustment && (
            <div className={`p-4 rounded-lg border-2 ${
              isNegativeResult 
                ? 'bg-destructive/10 border-destructive' 
                : 'bg-primary/10 border-primary'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isNegativeResult ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                  <span className="font-medium">Preview</span>
                </div>
                <div className="flex items-center gap-2">
                  {adjustmentValue > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm font-mono">
                    {currentStock} → <strong className="text-lg">{newStock}</strong>
                  </span>
                </div>
              </div>
              {isNegativeResult && (
                <p className="text-sm text-destructive mt-2">
                  ⚠️ Stock cannot be negative. Please adjust the quantity.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isNegativeResult || isLoading}
          >
            {isLoading ? 'Adjusting...' : 'Confirm Adjustment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}