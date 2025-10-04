import { useState } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { productApi } from '@/api/productApi';
import { toast } from 'sonner';

interface BulkUpdatePriceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  productIds: string[];
  selectedCount: number;
  onSuccess: () => void;
}

export function BulkUpdatePriceModal({
  open,
  onOpenChange,
  tenantId,
  productIds,
  selectedCount,
  onSuccess,
}: BulkUpdatePriceModalProps) {
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [operation, setOperation] = useState<'increase' | 'decrease' | 'set'>('increase');
  const [value, setValue] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Please enter a valid value');
      return;
    }

    if (type === 'percentage' && numValue > 100 && operation !== 'set') {
      toast.error('Percentage value cannot exceed 100%');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await productApi.bulkUpdatePrice(tenantId, productIds, {
        type,
        operation,
        value: numValue,
      });
      toast.success(`Successfully updated ${result.updated} product${result.updated > 1 ? 's' : ''}`);
      onSuccess();
      onOpenChange(false);
      setValue('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update prices');
    } finally {
      setIsUpdating(false);
    }
  };

  const resetForm = () => {
    setValue('');
    setType('percentage');
    setOperation('increase');
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) resetForm();
        onOpenChange(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Product Prices</DialogTitle>
          <DialogDescription>
            Adjust prices for {selectedCount} selected product{selectedCount > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="cursor-pointer">Percentage (%)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="cursor-pointer">Fixed Amount ($)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="operation">Operation</Label>
            <Select value={operation} onValueChange={(value) => setOperation(value as any)}>
              <SelectTrigger id="operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Increase</SelectItem>
                <SelectItem value="decrease">Decrease</SelectItem>
                <SelectItem value="set">Set to value</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              Value {type === 'percentage' ? '(%)' : '($)'}
            </Label>
            <Input
              id="value"
              type="number"
              step={type === 'percentage' ? '1' : '0.01'}
              min="0"
              max={type === 'percentage' && operation !== 'set' ? '100' : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === 'percentage' ? 'e.g., 10' : 'e.g., 5.00'}
            />
          </div>

          {value && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium mb-1">Preview:</p>
              <p className="text-muted-foreground">
                {operation === 'set' 
                  ? `Set all prices to ${type === 'percentage' ? value + '%' : '$' + value}`
                  : `${operation === 'increase' ? 'Increase' : 'Decrease'} all prices by ${
                      type === 'percentage' ? value + '%' : '$' + value
                    }`
                }
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating || !value}>
            {isUpdating ? 'Updating...' : 'Update Prices'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}