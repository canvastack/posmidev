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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { productApi } from '@/api/productApi';
import { toast } from 'sonner';

interface BulkUpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  productIds: string[];
  selectedCount: number;
  onSuccess: () => void;
}

export function BulkUpdateStatusModal({
  open,
  onOpenChange,
  tenantId,
  productIds,
  selectedCount,
  onSuccess,
}: BulkUpdateStatusModalProps) {
  const [status, setStatus] = useState<'active' | 'inactive' | 'discontinued'>('active');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await productApi.bulkUpdateStatus(tenantId, productIds, status);
      toast.success(`Successfully updated ${result.updated} product${result.updated > 1 ? 's' : ''}`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update products');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Product Status</DialogTitle>
          <DialogDescription>
            Update the status for {selectedCount} selected product{selectedCount > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup value={status} onValueChange={(value) => setStatus(value as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="active" id="active" />
              <Label htmlFor="active" className="cursor-pointer">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="inactive" id="inactive" />
              <Label htmlFor="inactive" className="cursor-pointer">Inactive</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="discontinued" id="discontinued" />
              <Label htmlFor="discontinued" className="cursor-pointer">Discontinued</Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}