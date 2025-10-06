/**
 * Variant Edit Modal Component
 * Phase 6: Product Variants - Day 13
 * 
 * Quick edit modal for updating variant details.
 * Supports SKU, name, price, stock, status, and image upload.
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - Permission check via API (products.update required)
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
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  DollarSign,
  Hash,
  Image,
  AlertCircle,
  Loader2,
  Info,
} from 'lucide-react';
import { useUpdateVariant } from '@/hooks';
import { toast } from 'sonner';
import { formatCurrency, calculateProfitMargin } from '@/utils/variantHelpers';
import type { ProductVariant, ProductVariantInput } from '@/types/variant';

export interface VariantEditModalProps {
  /** Dialog open state */
  open: boolean;
  
  /** Dialog open state change handler */
  onOpenChange: (open: boolean) => void;
  
  /** Tenant ID (required for IMMUTABLE RULES compliance) */
  tenantId: string;
  
  /** Product ID */
  productId: string;
  
  /** Variant to edit */
  variant: ProductVariant;
  
  /** Success callback */
  onSuccess: () => void;
}

export function VariantEditModal({
  open,
  onOpenChange,
  tenantId,
  productId,
  variant,
  onSuccess,
}: VariantEditModalProps) {
  // Form state
  const [formData, setFormData] = useState<ProductVariantInput>({
    sku: variant.sku,
    barcode: variant.barcode || '',
    name: variant.name,
    attributes: variant.attributes,
    price: variant.price,
    cost_price: variant.cost_price || 0,
    stock: variant.stock,
    reserved_stock: variant.reserved_stock || 0,
    manage_stock: variant.manage_stock,
    reorder_level: variant.reorder_level || null,
    reorder_quantity: variant.reorder_quantity || null,
    images: variant.images || [],
    is_active: variant.is_active,
    is_default: variant.is_default,
    sort_order: variant.sort_order || 0,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl] = useState(variant.image_url || '');
  
  // Update mutation
  const { mutate: updateVariant, isPending } = useUpdateVariant(tenantId);
  
  // Reset form when variant changes
  useEffect(() => {
    setFormData({
      sku: variant.sku,
      barcode: variant.barcode || '',
      name: variant.name,
      attributes: variant.attributes,
      price: variant.price,
      cost_price: variant.cost_price || 0,
      stock: variant.stock,
      reserved_stock: variant.reserved_stock || 0,
      manage_stock: variant.manage_stock,
      reorder_level: variant.reorder_level || null,
      reorder_quantity: variant.reorder_quantity || null,
      images: variant.images || [],
      is_active: variant.is_active,
      is_default: variant.is_default,
      sort_order: variant.sort_order || 0,
    });
    setImageUrl(variant.image_url || '');
    setErrors({});
  }, [variant]);
  
  /**
   * Calculate derived values
   */
  const profitMargin = calculateProfitMargin(formData.price, formData.cost_price || 0);
  const availableStock = formData.stock - (formData.reserved_stock || 0);
  
  /**
   * Handle field change
   */
  const handleChange = (field: keyof ProductVariantInput, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.sku?.trim()) {
      newErrors.sku = 'SKU is required';
    }
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    if (formData.stock < 0) {
      newErrors.stock = 'Stock cannot be negative';
    }
    
    if ((formData.reserved_stock || 0) > formData.stock) {
      newErrors.reserved_stock = 'Reserved stock cannot exceed total stock';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  /**
   * Handle submit
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      toast.error('Please fix validation errors');
      return;
    }
    
    // Prepare update data
    const updateData: Partial<ProductVariantInput> = {
      sku: formData.sku,
      barcode: formData.barcode || null,
      name: formData.name,
      price: formData.price,
      cost_price: formData.cost_price || null,
      stock: formData.stock,
      reserved_stock: formData.reserved_stock,
      manage_stock: formData.manage_stock,
      reorder_level: formData.reorder_level,
      reorder_quantity: formData.reorder_quantity,
      is_active: formData.is_active,
      is_default: formData.is_default,
      sort_order: formData.sort_order,
    };
    
    // Add image URL if changed
    if (imageUrl !== variant.image_url) {
      updateData.images = imageUrl ? [imageUrl] : [];
    }
    
    updateVariant(
      {
        productId,
        variantId: variant.id,
        data: updateData,
      },
      {
        onSuccess: () => {
          toast.success(`Variant "${formData.name}" updated successfully`);
          onSuccess();
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Failed to update variant');
        },
      }
    );
  };
  
  /**
   * Render attribute badges
   */
  const renderAttributes = () => {
    return Object.entries(variant.attributes).map(([key, value]) => (
      <Badge key={key} variant="secondary">
        {key}: {value}
      </Badge>
    ));
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Edit Variant
          </DialogTitle>
          <DialogDescription>
            Update variant details for "{variant.display_name}"
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Attributes (Read-only) */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Attributes</Label>
            <div className="flex flex-wrap gap-2">
              {renderAttributes()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Attributes cannot be changed after creation
            </p>
          </div>
          
          {/* SKU & Barcode */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku" className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                SKU *
              </Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                placeholder="e.g., TSHIRT-M-RED"
                className={errors.sku ? 'border-destructive' : ''}
              />
              {errors.sku && (
                <p className="text-xs text-destructive mt-1">{errors.sku}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={formData.barcode || ''}
                onChange={(e) => handleChange('barcode', e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          
          {/* Name */}
          <div>
            <Label htmlFor="name">
              Variant Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., T-Shirt Medium Red"
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name}</p>
            )}
          </div>
          
          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Selling Price *
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                className={errors.price ? 'border-destructive' : ''}
              />
              {errors.price && (
                <p className="text-xs text-destructive mt-1">{errors.price}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="cost_price">Cost Price</Label>
              <Input
                id="cost_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price || ''}
                onChange={(e) =>
                  handleChange('cost_price', parseFloat(e.target.value) || 0)
                }
              />
              {profitMargin > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {profitMargin.toFixed(1)}% profit margin
                </p>
              )}
            </div>
          </div>
          
          {/* Stock Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="manage-stock">Manage Stock</Label>
              <Switch
                id="manage-stock"
                checked={formData.manage_stock}
                onCheckedChange={(checked) => handleChange('manage_stock', checked)}
              />
            </div>
            
            {formData.manage_stock && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stock">Total Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) =>
                      handleChange('stock', parseInt(e.target.value) || 0)
                    }
                    className={errors.stock ? 'border-destructive' : ''}
                  />
                  {errors.stock && (
                    <p className="text-xs text-destructive mt-1">{errors.stock}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="reserved_stock">Reserved Stock</Label>
                  <Input
                    id="reserved_stock"
                    type="number"
                    min="0"
                    value={formData.reserved_stock || 0}
                    onChange={(e) =>
                      handleChange('reserved_stock', parseInt(e.target.value) || 0)
                    }
                    className={errors.reserved_stock ? 'border-destructive' : ''}
                  />
                  {errors.reserved_stock && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.reserved_stock}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {formData.manage_stock && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Available stock: <strong>{availableStock}</strong> units
                  (Total: {formData.stock}, Reserved: {formData.reserved_stock || 0})
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          {/* Reorder Settings */}
          {formData.manage_stock && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reorder_level">Reorder Level</Label>
                <Input
                  id="reorder_level"
                  type="number"
                  min="0"
                  placeholder="e.g., 10"
                  value={formData.reorder_level || ''}
                  onChange={(e) =>
                    handleChange(
                      'reorder_level',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alert when stock falls below this level
                </p>
              </div>
              
              <div>
                <Label htmlFor="reorder_quantity">Reorder Quantity</Label>
                <Input
                  id="reorder_quantity"
                  type="number"
                  min="0"
                  placeholder="e.g., 50"
                  value={formData.reorder_quantity || ''}
                  onChange={(e) =>
                    handleChange(
                      'reorder_quantity',
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Suggested quantity to reorder
                </p>
              </div>
            </div>
          )}
          
          {/* Image */}
          <div>
            <Label htmlFor="image_url" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Image URL
            </Label>
            <Input
              id="image_url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
            {imageUrl && (
              <div className="mt-2">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-20 w-20 rounded object-cover border"
                  onError={() => setImageUrl('')}
                />
              </div>
            )}
          </div>
          
          {/* Status Toggles */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is-active">Active Status</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive variants are hidden from customers
                </p>
              </div>
              <Switch
                id="is-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is-default">Default Variant</Label>
                <p className="text-xs text-muted-foreground">
                  Show this variant by default
                </p>
              </div>
              <Switch
                id="is-default"
                checked={formData.is_default}
                onCheckedChange={(checked) => handleChange('is_default', checked)}
              />
            </div>
          </div>
          
          {/* Validation Errors */}
          {Object.keys(errors).length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please fix the errors above before saving
              </AlertDescription>
            </Alert>
          )}
          
          {/* Actions */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}