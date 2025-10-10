import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Textarea } from '@/components/ui/textarea';
import { bomApi } from '@/api/bomApi';
import type { Material, AdjustStockRequest, TransactionReason } from '@/types/bom';
import { useAuth } from '@/hooks/useAuth';
import { Package, TrendingUp, TrendingDown } from 'lucide-react';

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: Material | null;
}

interface FormData {
  quantity_change: number;
  adjustment_type: 'add' | 'remove' | 'set';
  reason: TransactionReason;
  notes?: string;
}

const ADJUSTMENT_TYPES = [
  { value: 'add', label: 'Add Stock', icon: TrendingUp, description: 'Increase inventory' },
  { value: 'remove', label: 'Remove Stock', icon: TrendingDown, description: 'Decrease inventory' },
  { value: 'set', label: 'Set Quantity', icon: Package, description: 'Override current stock' },
];

const REASON_OPTIONS = [
  { value: 'purchase', label: 'Purchase / Incoming' },
  { value: 'production', label: 'Used in Production' },
  { value: 'waste', label: 'Waste / Spoilage' },
  { value: 'damage', label: 'Damaged Goods' },
  { value: 'return', label: 'Returned to Supplier' },
  { value: 'adjustment', label: 'Stock Count Adjustment' },
  { value: 'other', label: 'Other' },
];

export function StockAdjustmentDialog({ open, onOpenChange, material }: StockAdjustmentDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = user?.tenant_id || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      quantity_change: 0,
      type: 'add',
      reason: 'adjustment',
      notes: '',
    },
  });

  const typeValue = watch('adjustment_type');
  const reasonValue = watch('reason');
  const quantityChange = watch('quantity_change');

  // Reset form when material changes
  useEffect(() => {
    if (material) {
      reset({
        quantity_change: 0,
        adjustment_type: 'add',
        reason: 'count_adjustment' as TransactionReason,
        notes: '',
      });
    }
  }, [material, reset]);

  const adjustStockMutation = useMutation({
    mutationFn: (data: AdjustStockRequest) =>
      bomApi.materials.adjustStock(tenantId, material!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials', tenantId] });
      toast.success('Stock adjusted successfully');
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to adjust stock');
    },
  });

  const onSubmit = (data: FormData) => {
    if (!material) return;

    const payload: AdjustStockRequest = {
      transaction_type: data.adjustment_type as 'adjustment' | 'deduction' | 'restock',
      quantity_change: Number(data.quantity_change),
      reason: data.reason,
      notes: data.notes || null,
    };

    adjustStockMutation.mutate(payload);
  };

  const calculateNewQuantity = () => {
    if (!material) return 0;

    switch (typeValue) {
      case 'add':
        return material.stock_quantity + Number(quantityChange);
      case 'remove':
        return material.stock_quantity - Number(quantityChange);
      case 'set':
        return Number(quantityChange);
      default:
        return material.stock_quantity;
    }
  };

  const newQuantity = calculateNewQuantity();
  const isLoading = adjustStockMutation.isPending;

  if (!material) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Adjust Stock: {material.name}
          </DialogTitle>
          <DialogDescription>
            Current stock: <span className="font-semibold">{material.stock_quantity.toFixed(2)} {material.unit}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Adjustment Type */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Adjustment Type <span className="text-destructive">*</span>
            </Label>
            <Select value={typeValue} onValueChange={(value) => setValue('adjustment_type', value as any)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADJUSTMENT_TYPES.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity_change">
              {typeValue === 'set' ? 'New Quantity' : 'Quantity Change'} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Input
                id="quantity_change"
                type="number"
                step="0.01"
                placeholder={typeValue === 'set' ? 'Enter new total quantity' : 'Enter quantity to add/remove'}
                {...register('quantity_change', {
                  required: 'Quantity is required',
                  min: { value: 0, message: 'Must be >= 0' },
                })}
                className={errors.quantity_change ? 'border-destructive pr-20' : 'pr-20'}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                {material.unit}
              </span>
            </div>
            {errors.quantity_change && (
              <p className="text-xs text-destructive">{errors.quantity_change.message}</p>
            )}
          </div>

          {/* Result Preview */}
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <div className="text-sm font-medium text-foreground mb-2">Preview:</div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current:</span>
              <span className="font-mono">{material.stock_quantity.toFixed(2)} {material.unit}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-muted-foreground">Change:</span>
              <span className="font-mono text-primary-600">
                {typeValue === 'add' && '+'}
                {typeValue === 'remove' && '-'}
                {typeValue === 'set' && '→'}
                {' '}
                {Number(quantityChange).toFixed(2)} {material.unit}
              </span>
            </div>
            <div className="h-px bg-border my-2"></div>
            <div className="flex items-center justify-between font-semibold">
              <span>New Stock:</span>
              <span className={`font-mono ${newQuantity < 0 ? 'text-destructive' : 'text-success-600'}`}>
                {newQuantity.toFixed(2)} {material.unit}
              </span>
            </div>
            {newQuantity < 0 && (
              <p className="text-xs text-destructive mt-2">⚠️ Warning: Result would be negative!</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={reasonValue} onValueChange={(value) => setValue('reason', value as TransactionReason)}>
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASON_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional details about this adjustment..."
              rows={3}
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || newQuantity < 0}
            >
              {isLoading ? 'Adjusting...' : 'Confirm Adjustment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}