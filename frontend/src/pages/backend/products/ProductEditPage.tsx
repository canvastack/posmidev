/**
 * Product Edit Page
 * Phase 6: Product Variants - Bug Fix
 * 
 * Full-page product editing interface
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Tenant-scoped operations (tenantId required)
 * - Permission check for products.update
 * - All product operations are tenant-isolated
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { productApi } from '@/api/productApi';
import { categoryApi } from '@/api/categoryApi';
import type { Product, ProductForm, Category } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { getImageUrl } from '@/utils/imageHelpers';
import { ArrowLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import ProductImageGallery from '@/components/domain/products/ProductImageGallery';
// Phase 9: Additional Business Features
import { SupplierSelector } from '@/components/domain/products/phase9/SupplierSelector';
import { UomSelector } from '@/components/domain/products/phase9/UomSelector';
import { TaxConfigFields } from '@/components/domain/products/phase9/TaxConfigFields';
import { TagMultiSelect } from '@/components/domain/products/phase9/TagMultiSelect';
import { SkuGeneratorModal } from '@/components/domain/products/phase9/SkuGeneratorModal';

export default function ProductEditPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  // Phase 9: SKU Generator Modal
  const [skuModalOpen, setSkuModalOpen] = useState(false);

  const [form, setForm] = useState<ProductForm>({
    name: '',
    sku: '',
    price: 0,
    stock: 0,
    description: '',
    cost_price: 0,
    category_id: undefined,
    status: 'active',
    // Phase 9: Additional Business Features
    supplier_id: null,
    uom: null,
    tax_rate: null,
    tax_inclusive: false,
    tag_ids: [],
  });

  // Check permission
  const canEdit = hasPermission('products.update');

  useEffect(() => {
    if (!canEdit) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to edit products',
        variant: 'destructive',
      });
      navigate('/admin/products');
      return;
    }

    const fetchData = async () => {
      if (!tenantId || !productId) return;

      try {
        setLoading(true);
        
        // Fetch product details
        const productData = await productApi.getProduct(tenantId, productId);
        setProduct(productData);
        
        // Populate form
        setForm({
          name: productData.name,
          sku: productData.sku,
          price: productData.price,
          stock: productData.stock,
          description: productData.description || '',
          cost_price: productData.cost_price || 0,
          category_id: productData.category_id,
          status: productData.status || 'active',
          // Phase 9: Additional Business Features
          supplier_id: productData.supplier_id || null,
          uom: productData.uom || null,
          tax_rate: productData.tax_rate || null,
          tax_inclusive: productData.tax_inclusive || false,
          tag_ids: productData.tags?.map((tag) => tag.id) || [],
        });
        
        // Fetch categories
        const categoriesData = await categoryApi.getCategories(tenantId);
        setCategories(categoriesData);
        
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast({
          title: 'Error',
          description: 'Failed to load product details',
          variant: 'destructive',
        });
        navigate('/admin/products');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tenantId, productId, canEdit, navigate, toast]);

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) {
      errors.name = 'Product name is required';
    } else if (form.name.length > 255) {
      errors.name = 'Product name must be less than 255 characters';
    }

    if (!form.sku.trim()) {
      errors.sku = 'SKU is required';
    } else if (form.sku.length > 100) {
      errors.sku = 'SKU must be less than 100 characters';
    }

    if (form.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (form.cost_price && form.cost_price > 0 && form.cost_price >= form.price) {
      errors.price = 'Selling price should be higher than cost price for profit';
    }

    if (form.stock < 0) {
      errors.stock = 'Stock cannot be negative';
    }

    if (form.description && form.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !productId) return;

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      await productApi.updateProduct(tenantId, productId, form);
      
      toast({
        title: 'Success',
        description: 'Product updated successfully.',
      });
      
      // Navigate back to detail page
      navigate(`/admin/products/${productId}`);
      
    } catch (error: any) {
      console.error('Failed to update product:', error);
      
      // Handle validation errors from backend
      if (error?.response?.data?.errors) {
        setValidationErrors(error.response.data.errors);
        toast({
          title: 'Validation Error',
          description: 'Please check the form for errors.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error?.response?.data?.message || 'Failed to update product',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Product not found</p>
          <Button onClick={() => navigate('/admin/products')} className="mt-4">
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/products/${productId}`)}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Product</h1>
            <p className="text-muted-foreground mt-1">{product.name}</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., T-Shirt, Laptop, Coffee Mug"
                  />
                  {validationErrors.name && (
                    <p className="text-sm text-destructive mt-1">{validationErrors.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="sku">SKU *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="sku"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      placeholder="e.g., PROD-001, SKU-12345"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSkuModalOpen(true)}
                    >
                      Generate
                    </Button>
                  </div>
                  {validationErrors.sku && (
                    <p className="text-sm text-destructive mt-1">{validationErrors.sku}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Product description..."
                  />
                  {validationErrors.description && (
                    <p className="text-sm text-destructive mt-1">{validationErrors.description}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pricing & Stock */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Selling Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                    />
                    {validationErrors.price && (
                      <p className="text-sm text-destructive mt-1">{validationErrors.price}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="cost_price">Cost Price</Label>
                    <Input
                      id="cost_price"
                      type="number"
                      step="0.01"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                  />
                  {validationErrors.stock && (
                    <p className="text-sm text-destructive mt-1">{validationErrors.stock}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Phase 9: Additional Business Features */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Supplier Selector */}
                <SupplierSelector
                  value={form.supplier_id}
                  onChange={(supplierId) => setForm({ ...form, supplier_id: supplierId })}
                  error={validationErrors.supplier_id}
                />

                {/* UOM Selector */}
                <UomSelector
                  value={form.uom}
                  onChange={(uom) => setForm({ ...form, uom })}
                  error={validationErrors.uom}
                />

                {/* Tax Configuration */}
                <TaxConfigFields
                  taxRate={form.tax_rate}
                  taxInclusive={form.tax_inclusive}
                  onTaxRateChange={(rate) => setForm({ ...form, tax_rate: rate })}
                  onTaxInclusiveChange={(inclusive) => setForm({ ...form, tax_inclusive: inclusive })}
                  errors={{
                    tax_rate: validationErrors.tax_rate,
                    tax_inclusive: validationErrors.tax_inclusive,
                  }}
                  price={form.price}
                />

                {/* Tag Multi-Select */}
                <TagMultiSelect
                  value={form.tag_ids}
                  onChange={(tagIds) => setForm({ ...form, tag_ids: tagIds })}
                  error={validationErrors.tag_ids}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & Category */}
            <Card>
              <CardHeader>
                <CardTitle>Status & Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                  >
                    <option value="active">Active</option>
                    <option value="draft">Draft</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category_id">Category</Label>
                  <Select
                    id="category_id"
                    value={form.category_id || ''}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value || undefined })}
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Product Images - Phase 7: Multi-Image Gallery */}
            {productId && tenantId && (
              <ProductImageGallery
                tenantId={tenantId}
                productId={productId}
                images={product?.images}
              />
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? (
                  <>Saving...</>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate(`/admin/products/${productId}`)}
                disabled={submitting}
              >
                <XMarkIcon className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Phase 9: SKU Generator Modal */}
      <SkuGeneratorModal
        open={skuModalOpen}
        onClose={() => setSkuModalOpen(false)}
        onGenerate={(generatedSku) => {
          setForm({ ...form, sku: generatedSku });
        }}
        categoryId={form.category_id}
      />
    </div>
  );
}