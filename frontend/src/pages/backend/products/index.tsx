/**
 * Products Management Page
 * REFACTORED: 1997 lines → ~450 lines
 * Extracted components for better maintainability
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useColumnCustomization } from '@/hooks/useColumnCustomization';
import { productApi } from '@/api/productApi';
import { categoryApi } from '@/api/categoryApi';
import type { Product, ProductForm, Category, ProductStats } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { PlusIcon } from '@heroicons/react/24/outline';

// Extracted components
import {
  ProductStatsCards,
  ProductSearchFilters,
  ProductTable,
  ProductFormModal,
  LoadingSkeleton,
  EmptyState,
} from './components';

// Bulk operation components
import { BulkActionToolbar } from '@/components/domain/products/BulkActionToolbar';
import { BulkDeleteModal } from '@/components/domain/products/BulkDeleteModal';
import { BulkUpdateStatusModal } from '@/components/domain/products/BulkUpdateStatusModal';
import { BulkUpdateCategoryModal } from '@/components/domain/products/BulkUpdateCategoryModal';
import { BulkUpdatePriceModal } from '@/components/domain/products/BulkUpdatePriceModal';
import { BulkBarcodePrintModal } from '@/components/domain/products/BulkBarcodePrintModal';
import { ExportButton } from '@/components/domain/products/ExportButton';
import { ImportButton } from '@/components/domain/products/ImportButton';
import { ProductHistoryModal } from '@/components/domain/products/ProductHistoryModal';
import { ProductQuickViewModal } from '@/components/domain/products/ProductQuickViewModal';
import { ColumnCustomizationModal } from '@/components/domain/products/ColumnCustomizationModal';
import { SavedViewsDropdown } from '@/components/domain/products/SavedViewsDropdown';
import { AdvancedFiltersPanel } from '@/components/domain/products/AdvancedFiltersPanel';

// Phase 9: Additional Business Features
import { SkuGeneratorModal } from '@/components/domain/products/phase9/SkuGeneratorModal';
import { BulkAssignSupplierModal } from '@/components/domain/products/BulkAssignSupplierModal';
import { BulkTagModal } from '@/components/domain/products/BulkTagModal';
import { BulkTaxModal } from '@/components/domain/products/BulkTaxModal';

export default function ProductsPage() {
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();

  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage] = useState(10);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Advanced filters
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [updatedFrom, setUpdatedFrom] = useState<string>('');
  const [updatedTo, setUpdatedTo] = useState<string>('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [quickViewModalOpen, setQuickViewModalOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [columnModalOpen, setColumnModalOpen] = useState(false);

  // Bulk operation modals
  const productIds = products.map((p) => p.id);
  const bulkSelection = useBulkSelection(productIds);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState(false);
  const [bulkPriceModalOpen, setBulkPriceModalOpen] = useState(false);
  const [bulkBarcodeModalOpen, setBulkBarcodeModalOpen] = useState(false);
  const [bulkSupplierModalOpen, setBulkSupplierModalOpen] = useState(false);
  const [bulkTagModalOpen, setBulkTagModalOpen] = useState(false);
  const [bulkTagMode, setBulkTagMode] = useState<'add' | 'remove'>('add');
  const [bulkTaxModalOpen, setBulkTaxModalOpen] = useState(false);

  // Form state
  const [form, setForm] = useState<ProductForm>({
    name: '',
    sku: '',
    price: 0,
    stock: 0,
    description: '',
    cost_price: 0,
    category_id: undefined,
    status: 'active',
    supplier_id: null,
    uom: null,
    tax_rate: null,
    tax_inclusive: false,
    tag_ids: [],
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Column customization
  const { columns, saveColumns, isColumnVisible } = useColumnCustomization();

  // Permissions
  const canCreate = hasPermission('products.create');
  const canEdit = hasPermission('products.update');
  const canDelete = hasPermission('products.delete');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        per_page: perPage,
      };

      if (debouncedSearchQuery.trim()) params.search = debouncedSearchQuery.trim();
      if (selectedCategory !== 'all') params.category_id = selectedCategory;
      if (sortBy) {
        params.sort_by = sortBy;
        params.sort_order = sortOrder;
      }
      if (stockFilter !== 'all') params.stock_filter = stockFilter;
      if (minPrice && !isNaN(parseFloat(minPrice))) params.min_price = parseFloat(minPrice);
      if (maxPrice && !isNaN(parseFloat(maxPrice))) params.max_price = parseFloat(maxPrice);
      if (createdFrom) params.created_from = createdFrom;
      if (createdTo) params.created_to = createdTo;
      if (updatedFrom) params.updated_from = updatedFrom;
      if (updatedTo) params.updated_to = updatedTo;
      if (selectedStatuses.length > 0) params.status = selectedStatuses.join(',');

      const response = await productApi.getProducts(tenantId, params);
      setProducts(response.data);
      setCurrentPage(response.current_page);
      setTotalPages(response.last_page);
      setTotalItems(response.total);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch products',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [
    tenantId,
    currentPage,
    perPage,
    debouncedSearchQuery,
    selectedCategory,
    sortBy,
    sortOrder,
    stockFilter,
    minPrice,
    maxPrice,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    selectedStatuses,
    toast,
  ]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!tenantId) return;
    try {
      const data = await categoryApi.getCategories(tenantId);
      // Ensure we always set an array
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      // Ensure categories is always an array even on error
      setCategories([]);
    }
  }, [tenantId]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!tenantId) return;
    try {
      setStatsLoading(true);
      const stats = await productApi.getProductStats(tenantId);
      setStats(stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [tenantId]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  // Handlers
  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setForm({
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: product.stock,
        description: product.description || '',
        cost_price: product.cost_price || 0,
        category_id: product.category_id || undefined,
        status: product.status,
        supplier_id: product.supplier_id || null,
        uom: product.uom || null,
        tax_rate: product.tax_rate ?? null,
        tax_inclusive: product.tax_inclusive || false,
        tag_ids: product.tags?.map((t) => t.id) || [],
      });
      if (product.image_url) {
        setImagePreview(product.image_url);
      }
    } else {
      setEditingProduct(null);
      setForm({
        name: '',
        sku: '',
        price: 0,
        stock: 0,
        description: '',
        cost_price: 0,
        category_id: undefined,
        status: 'active',
        supplier_id: null,
        uom: null,
        tax_rate: null,
        tax_inclusive: false,
        tag_ids: [],
      });
      setImagePreview(null);
    }
    setValidationErrors({});
    setImageFile(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setImageFile(null);
    setImagePreview(null);
    setValidationErrors({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: ['price', 'stock', 'cost_price'].includes(name) ? parseFloat(value) || 0 : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.name.trim()) errors.name = 'Product name is required';
    else if (form.name.length > 255) errors.name = 'Product name must be less than 255 characters';

    if (!form.sku.trim()) errors.sku = 'SKU is required';
    else if (form.sku.length > 100) errors.sku = 'SKU must be less than 100 characters';
    else {
      const isDuplicate = products.some(
        (p) => p.sku.toLowerCase() === form.sku.toLowerCase() && p.id !== editingProduct?.id
      );
      if (isDuplicate) errors.sku = 'This SKU already exists';
    }

    if (form.price <= 0) errors.price = 'Price must be greater than 0';
    if (form.cost_price && form.cost_price >= form.price) {
      errors.price = 'Selling price should be higher than cost price';
    }
    if (form.stock < 0) errors.stock = 'Stock cannot be negative';
    if (form.description && form.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (editingProduct) {
        await productApi.updateProduct(tenantId, editingProduct.id, form);
        if (imageFile) {
          await productApi.uploadProductImage(tenantId, editingProduct.id, imageFile);
        }
        toast({ title: 'Success', description: 'Product updated successfully' });
      } else {
        const saved = await productApi.createProduct(tenantId, form);
        if (imageFile && saved?.id) {
          await productApi.uploadProductImage(tenantId, saved.id, imageFile);
        }
        toast({ title: 'Success', description: 'Product created successfully' });
      }
      handleCloseModal();
      fetchProducts();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save product',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId || !confirm('Are you sure you want to delete this product?')) return;

    setDeleting(id);
    try {
      await productApi.deleteProduct(tenantId, id);
      toast({ title: 'Success', description: 'Product deleted successfully' });
      fetchProducts();
      fetchStats();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete product',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDuplicate = async (product: Product) => {
    if (!tenantId) return;
    
    if (!confirm(`Duplicate product "${product.name}"? A copy will be created with draft status.`)) {
      return;
    }

    try {
      const duplicatedProduct = await productApi.duplicateProduct(tenantId, product.id);
      toast({
        title: 'Success',
        description: `Product duplicated successfully as "${duplicatedProduct.name}".`,
      });
      await fetchProducts();
      await fetchStats();
    } catch (error) {
      console.error('Failed to duplicate product:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate product. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleBulkOperationSuccess = () => {
    bulkSelection.clearSelection();
    fetchProducts();
    fetchStats();
  };

  // Saved Views handlers
  const getCurrentFilters = () => ({
    search: debouncedSearchQuery,
    category: selectedCategory,
    stockFilter,
    minPrice,
    maxPrice,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    statuses: selectedStatuses,
  });

  const handleApplySavedView = (filters: any) => {
    setSearchQuery(filters.search || '');
    setDebouncedSearchQuery(filters.search || '');
    setSelectedCategory(filters.category || 'all');
    setStockFilter(filters.stockFilter || 'all');
    setMinPrice(filters.minPrice || '');
    setMaxPrice(filters.maxPrice || '');
    setCreatedFrom(filters.createdFrom || '');
    setCreatedTo(filters.createdTo || '');
    setUpdatedFrom(filters.updatedFrom || '');
    setUpdatedTo(filters.updatedTo || '');
    setSelectedStatuses(filters.statuses || []);
    setCurrentPage(1);
  };

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">Manage your product inventory</p>
        </div>
        <div className="flex items-center gap-2">
          <SavedViewsDropdown 
            currentFilters={getCurrentFilters()} 
            onApplyView={handleApplySavedView}
          />
          <Button variant="outline" size="sm" onClick={() => setColumnModalOpen(true)}>
            Customize Columns
          </Button>
          <ExportButton tenantId={tenantId} />
          <ImportButton tenantId={tenantId} onSuccess={fetchProducts} />
          {canCreate && (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Product
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <ProductStatsCards stats={stats} loading={statsLoading} />

      {/* Search & Filters */}
      <ProductSearchFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        minPrice={minPrice}
        onMinPriceChange={setMinPrice}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSortBy}
        onSortOrderChange={setSortOrder}
        onClearFilters={() => {
          setSearchQuery('');
          setSelectedCategory('all');
          setStockFilter('all');
          setMinPrice('');
          setMaxPrice('');
        }}
      />

      {/* Advanced Filters */}
      <AdvancedFiltersPanel
        createdFrom={createdFrom}
        createdTo={createdTo}
        updatedFrom={updatedFrom}
        updatedTo={updatedTo}
        selectedStatuses={selectedStatuses}
        onCreatedFromChange={setCreatedFrom}
        onCreatedToChange={setCreatedTo}
        onUpdatedFromChange={setUpdatedFrom}
        onUpdatedToChange={setUpdatedTo}
        onStatusesChange={setSelectedStatuses}
        activeFiltersCount={
          (createdFrom ? 1 : 0) +
          (createdTo ? 1 : 0) +
          (updatedFrom ? 1 : 0) +
          (updatedTo ? 1 : 0) +
          selectedStatuses.length
        }
      />

      {/* Bulk Action Toolbar */}
      {bulkSelection.selectedCount > 0 && (
        <BulkActionToolbar
          selectedCount={bulkSelection.selectedCount}
          onClearSelection={bulkSelection.clearSelection}
          onDelete={() => setBulkDeleteModalOpen(true)}
          onUpdateStatus={() => setBulkStatusModalOpen(true)}
          onUpdateCategory={() => setBulkCategoryModalOpen(true)}
          onUpdatePrice={() => setBulkPriceModalOpen(true)}
          onPrintBarcodes={() => setBulkBarcodeModalOpen(true)}
          onAssignSupplier={() => setBulkSupplierModalOpen(true)}
          onAddTags={() => {
            setBulkTagMode('add');
            setBulkTagModalOpen(true);
          }}
          onRemoveTags={() => {
            setBulkTagMode('remove');
            setBulkTagModalOpen(true);
          }}
          onUpdateTax={() => setBulkTaxModalOpen(true)}
          canDelete={canDelete}
          canUpdate={canEdit}
          canView={true}
        />
      )}

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <ProductTable
            products={products}
            loading={loading}
            selectedIds={Array.from(bulkSelection.selectedIds)}
            onToggleSelection={bulkSelection.toggleSelection}
            onToggleAllSelection={() => {
              if (bulkSelection.isAllSelected) {
                bulkSelection.clearSelection();
              } else {
                bulkSelection.selectAll();
              }
            }}
            isAllSelected={bulkSelection.isAllSelected}
            onEdit={handleOpenModal}
            onDelete={handleDelete}
            onViewHistory={(product) => {
              setHistoryProduct(product);
              setHistoryModalOpen(true);
            }}
            onQuickView={(product) => {
              setQuickViewProduct(product);
              setQuickViewModalOpen(true);
            }}
            onDuplicate={handleDuplicate}
            deleting={deleting}
            isColumnVisible={isColumnVisible}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            hasEditPermission={canEdit}
            hasDeletePermission={canDelete}
            hasCreatePermission={canCreate}
            hasViewPermission={true}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 pt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalItems}
                itemsPerPage={perPage}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Form Modal */}
      <ProductFormModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        form={form}
        onChange={handleChange}
        onFormUpdate={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
        editingProduct={editingProduct}
        categories={categories}
        submitting={submitting}
        validationErrors={validationErrors}
        imagePreview={imagePreview}
        onImageChange={handleImageChange}
        onSkuGenerate={() => setSkuModalOpen(true)}
      />

      {/* SKU Generator Modal */}
      <SkuGeneratorModal
        isOpen={skuModalOpen}
        onClose={() => setSkuModalOpen(false)}
        onGenerate={(sku) => {
          setForm((prev) => ({ ...prev, sku }));
          setSkuModalOpen(false);
          toast({ title: 'Success', description: 'SKU generated successfully' });
        }}
        categoryId={form.category_id}
      />

      {/* Bulk Operation Modals */}
      <BulkDeleteModal
        open={bulkDeleteModalOpen}
        onOpenChange={setBulkDeleteModalOpen}
        tenantId={tenantId}
        productIds={Array.from(bulkSelection.selectedIds)}
        selectedCount={bulkSelection.selectedCount}
        onSuccess={handleBulkOperationSuccess}
      />

      <BulkUpdateStatusModal
        open={bulkStatusModalOpen}
        onOpenChange={setBulkStatusModalOpen}
        tenantId={tenantId}
        productIds={Array.from(bulkSelection.selectedIds)}
        selectedCount={bulkSelection.selectedCount}
        onSuccess={handleBulkOperationSuccess}
      />

      <BulkUpdateCategoryModal
        open={bulkCategoryModalOpen}
        onOpenChange={setBulkCategoryModalOpen}
        tenantId={tenantId}
        productIds={Array.from(bulkSelection.selectedIds)}
        selectedCount={bulkSelection.selectedCount}
        categories={categories}
        onSuccess={handleBulkOperationSuccess}
      />

      <BulkUpdatePriceModal
        open={bulkPriceModalOpen}
        onOpenChange={setBulkPriceModalOpen}
        tenantId={tenantId}
        productIds={Array.from(bulkSelection.selectedIds)}
        selectedCount={bulkSelection.selectedCount}
        onSuccess={handleBulkOperationSuccess}
      />

      <BulkBarcodePrintModal
        open={bulkBarcodeModalOpen}
        onClose={() => setBulkBarcodeModalOpen(false)}
        productIds={Array.from(bulkSelection.selectedIds)}
      />

      {/* Phase 9: Bulk Operation Modals */}
      <BulkAssignSupplierModal
        isOpen={bulkSupplierModalOpen}
        onClose={() => setBulkSupplierModalOpen(false)}
        productIds={Array.from(bulkSelection.selectedIds)}
        onSuccess={handleBulkOperationSuccess}
      />

      <BulkTagModal
        isOpen={bulkTagModalOpen}
        onClose={() => setBulkTagModalOpen(false)}
        productIds={Array.from(bulkSelection.selectedIds)}
        mode={bulkTagMode}
        onSuccess={handleBulkOperationSuccess}
      />

      <BulkTaxModal
        isOpen={bulkTaxModalOpen}
        onClose={() => setBulkTaxModalOpen(false)}
        productIds={Array.from(bulkSelection.selectedIds)}
        onSuccess={handleBulkOperationSuccess}
      />

      {/* History & Quick View Modals */}
      {historyProduct && (
        <ProductHistoryModal
          isOpen={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          product={historyProduct}
          tenantId={tenantId}
        />
      )}

      <ProductQuickViewModal
        isOpen={quickViewModalOpen}
        onClose={() => setQuickViewModalOpen(false)}
        product={quickViewProduct}
        tenantId={tenantId}
      />

      {/* Column Customization Modal */}
      <ColumnCustomizationModal
        isOpen={columnModalOpen}
        onClose={() => setColumnModalOpen(false)}
        columns={columns}
        onSave={saveColumns}
      />
    </div>
  );
}