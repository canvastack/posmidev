/**
 * AddCategoryModal Component
 * 
 * Quick category creation modal with parent selection
 * Used in Product Edit Page
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { useToast } from '@/hooks/use-toast';
import { categoryApi } from '@/api/categoryApi';
import type { Category } from '@/types';
import { FolderIcon, FolderPlusIcon } from '@heroicons/react/24/outline';

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newCategory: Category) => void;
  tenantId: string;
  categories: Category[];
}

export function AddCategoryModal({
  open,
  onClose,
  onSuccess,
  tenantId,
  categories,
}: AddCategoryModalProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parent_id: 'none',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrors({ name: 'Category name is required' });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const newCategory = await categoryApi.createCategory(tenantId, {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        parent_id: formData.parent_id === 'none' ? null : formData.parent_id,
      });

      toast({
        title: 'Success',
        description: `Category "${newCategory.name}" created successfully!`,
      });

      setFormData({ name: '', description: '', parent_id: 'none' });
      onSuccess(newCategory);
      onClose();
    } catch (error: any) {
      console.error('Failed to create category:', error);
      
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to create category',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setFormData({ name: '', description: '', parent_id: 'none' });
      setErrors({});
      onClose();
    }
  };

  const flatCategories = categories
    .map((cat) => ({
      id: cat.id,
      name: cat.full_path || cat.name,
      depth: cat.depth || 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlusIcon className="h-5 w-5 text-primary" />
            Add New Category
          </DialogTitle>
          <DialogDescription>
            Create a new product category. You can optionally assign a parent category to create a hierarchy.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">
              Category Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="category-name"
              placeholder="e.g., Smartphones"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={submitting}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-parent">Parent Category (Optional)</Label>
            <Select
              value={formData.parent_id}
              onValueChange={(value) => setFormData({ ...formData, parent_id: value })}
              disabled={submitting}
            >
              <SelectTrigger id="category-parent">
                <SelectValue placeholder="No parent (root category)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-muted-foreground" />
                    <span>No parent (root category)</span>
                  </div>
                </SelectItem>
                {flatCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span style={{ paddingLeft: `${cat.depth * 16}px` }}>
                        {cat.depth > 0 && '└─ '}
                        {cat.name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.parent_id && (
              <p className="text-sm text-destructive">{errors.parent_id}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">Description (Optional)</Label>
            <Textarea
              id="category-description"
              placeholder="Brief description of this category..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={submitting}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}