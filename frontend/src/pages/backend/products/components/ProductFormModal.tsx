import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/button';
import type { ProductForm, Category, Product } from '@/types';
import { SparklesIcon } from '@heroicons/react/24/outline';
// Phase 9 imports
import { SupplierSelector } from '@/components/domain/products/phase9/SupplierSelector';
import { UomSelector } from '@/components/domain/products/phase9/UomSelector';
import { TaxConfigFields } from '@/components/domain/products/phase9/TaxConfigFields';
import { TagMultiSelect } from '@/components/domain/products/phase9/TagMultiSelect';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  form: ProductForm;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onFormUpdate: (updates: Partial<ProductForm>) => void;
  editingProduct: Product | null;
  categories: Category[];
  submitting: boolean;
  validationErrors: Record<string, string>;
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSkuGenerate: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  open,
  onClose,
  onSubmit,
  form,
  onChange,
  onFormUpdate,
  editingProduct,
  categories,
  submitting,
  validationErrors,
  imagePreview,
  onImageChange,
  onSkuGenerate,
}) => {
  const [activeTab, setActiveTab] = useState<'supplier' | 'uom' | 'tax' | 'tags'>('supplier');

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={editingProduct ? 'Edit Product' : 'Add New Product'}
      size="xl"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Product Image (Optional)
          </label>
          <div className="flex items-center gap-4">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded border"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={onImageChange}
              className="input flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Upload a product image (max 5MB, JPG/PNG)
          </p>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Product Name <span className="text-danger">*</span>
            </label>
            <Input
              name="name"
              value={form.name}
              onChange={onChange}
              required
              className={validationErrors.name ? 'border-danger' : ''}
            />
            {validationErrors.name && (
              <p className="text-xs text-danger mt-1">{validationErrors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              SKU <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2">
              <Input
                name="sku"
                value={form.sku}
                onChange={onChange}
                required
                className={`flex-1 ${validationErrors.sku ? 'border-danger' : ''}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSkuGenerate}
                title="Generate SKU"
              >
                <SparklesIcon className="h-4 w-4" />
              </Button>
            </div>
            {validationErrors.sku && (
              <p className="text-xs text-danger mt-1">{validationErrors.sku}</p>
            )}
          </div>
        </div>

        {/* Category & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Category (Optional)
            </label>
            <select
              name="category_id"
              value={form.category_id || ''}
              onChange={(e) =>
                onFormUpdate({ category_id: e.target.value || undefined })
              }
              className="input w-full"
            >
              <option value="">No Category</option>
              {(categories || []).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Status <span className="text-danger">*</span>
            </label>
            <select
              name="status"
              value={form.status || 'active'}
              onChange={(e) =>
                onFormUpdate({
                  status: e.target.value as 'active' | 'inactive' | 'discontinued',
                })
              }
              className="input w-full"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>
        </div>

        {/* Price & Stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Price <span className="text-danger">*</span>
            </label>
            <Input
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={onChange}
              required
              className={validationErrors.price ? 'border-danger' : ''}
            />
            {validationErrors.price && (
              <p className="text-xs text-danger mt-1">{validationErrors.price}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Stock <span className="text-danger">*</span>
            </label>
            <Input
              name="stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={onChange}
              required
              className={validationErrors.stock ? 'border-danger' : ''}
            />
            {validationErrors.stock && (
              <p className="text-xs text-danger mt-1">{validationErrors.stock}</p>
            )}
          </div>
        </div>

        {/* Cost Price */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Cost Price (Optional)
          </label>
          <Input
            name="cost_price"
            type="number"
            step="0.01"
            min="0"
            value={form.cost_price}
            onChange={onChange}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Your profit margin:{' '}
            {form.price > 0 && form.cost_price
              ? `${(((form.price - form.cost_price) / form.price) * 100).toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Description (Optional)
          </label>
          <textarea
            name="description"
            rows={3}
            className={`input ${validationErrors.description ? 'border-danger' : ''}`}
            value={form.description}
            onChange={onChange}
            maxLength={1000}
          />
          {validationErrors.description && (
            <p className="text-xs text-danger mt-1">{validationErrors.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {(form.description || '').length}/1000 characters
          </p>
        </div>

        {/* Phase 9: Additional Business Features with Tabs */}
        <div className="border-t border-border pt-4 mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Additional Business Features
          </h3>
          
          {/* Tab Navigation */}
          <div className="flex border-b border-border mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('supplier')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'supplier'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Supplier
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('uom')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'uom'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Unit of Measurement
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tax')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tax'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Tax Configuration
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tags')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tags'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Product Tags
            </button>
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'supplier' && (
              <SupplierSelector
                value={form.supplier_id || ''}
                onChange={(value) => onFormUpdate({ supplier_id: value || null })}
              />
            )}

            {activeTab === 'uom' && (
              <UomSelector
                value={form.uom || ''}
                onChange={(value) => onFormUpdate({ uom: value || null })}
              />
            )}

            {activeTab === 'tax' && (
              <TaxConfigFields
                taxRate={form.tax_rate}
                taxInclusive={form.tax_inclusive || false}
                onTaxRateChange={(value) => onFormUpdate({ tax_rate: value })}
                onTaxInclusiveChange={(value) => onFormUpdate({ tax_inclusive: value })}
              />
            )}

            {activeTab === 'tags' && (
              <TagMultiSelect
                value={form.tag_ids || []}
                onChange={(value) => onFormUpdate({ tag_ids: value })}
              />
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};