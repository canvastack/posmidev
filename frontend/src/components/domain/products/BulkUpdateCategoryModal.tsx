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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { productApi } from '@/api/productApi';
import { categoryApi } from '@/api/categoryApi';
import { toast } from 'sonner';
import type { Category } from '@/types';

interface BulkUpdateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  productIds: string[];
  selectedCount: number;
  onSuccess: () => void;
}

export function BulkUpdateCategoryModal({
  open,
  onOpenChange,
  tenantId,
  productIds,
  selectedCount,
  onSuccess,
}: BulkUpdateCategoryModalProps) {
  const [categoryId, setCategoryId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open, tenantId]);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await categoryApi.getCategories(tenantId);
      setCategories(response.data || []);
    } catch (error: any) {
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!categoryId) {
      toast.error('Please select a category');
      return;
    }

    setIsUpdating(true);
    try {
      const result = await productApi.bulkUpdateCategory(tenantId, productIds, categoryId);
      toast.success(`Successfully updated ${result.updated} product${result.updated > 1 ? 's' : ''}`);
      onSuccess();
      onOpenChange(false);
      setCategoryId('');
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
          <DialogTitle>Update Product Category</DialogTitle>
          <DialogDescription>
            Assign a category to {selectedCount} selected product{selectedCount > 1 ? 's' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={isLoading}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUpdating}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating || !categoryId}>
            {isUpdating ? 'Updating...' : 'Update'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}