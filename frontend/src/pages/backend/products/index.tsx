import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { Checkbox } from '@/components/ui/Checkbox';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { productApi, type ProductStats } from '@/api/productApi';
import { categoryApi } from '@/api/categoryApi';
import type { Product, ProductForm, Category } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { PlusIcon, PencilIcon, TrashIcon, ArchiveBoxIcon, MagnifyingGlassIcon, XMarkIcon, CubeIcon, CurrencyDollarIcon, ExclamationTriangleIcon, ChartBarIcon, PhotoIcon, ArrowUpIcon, ArrowDownIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline';
import { BulkActionToolbar } from '@/components/domain/products/BulkActionToolbar';
import { BulkDeleteModal } from '@/components/domain/products/BulkDeleteModal';
import { BulkUpdateStatusModal } from '@/components/domain/products/BulkUpdateStatusModal';
import { BulkUpdateCategoryModal } from '@/components/domain/products/BulkUpdateCategoryModal';
import { BulkUpdatePriceModal } from '@/components/domain/products/BulkUpdatePriceModal';
import { ExportButton } from '@/components/domain/products/ExportButton';
import { ImportButton } from '@/components/domain/products/ImportButton';

export default function ProductsPage() {
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage] = useState(10);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Sorting state
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Stock filter state
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  
  // Price range filter state
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  
  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Stats state
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Bulk operations state
  const productIds = products.map(p => p.id);
  const bulkSelection = useBulkSelection(productIds);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkCategoryModalOpen, setBulkCategoryModalOpen] = useState(false);
  const [bulkPriceModalOpen, setBulkPriceModalOpen] = useState(false);
  
  const [form, setForm] = useState<ProductForm>({
    name: '',
    sku: '',
    price: 0,
    stock: 0,
    description: '',
    cost_price: 0,
    category_id: undefined,
    status: 'active',
  });

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProducts = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = {
        page: currentPage,
        per_page: perPage
      };
      
      // Add search parameter if exists
      if (debouncedSearchQuery.trim()) {
        params.search = debouncedSearchQuery.trim();
      }
      
      // Add category filter if not 'all'
      if (selectedCategory !== 'all') {
        params.category_id = selectedCategory;
      }
      
      // Add sorting parameters
      if (sortBy) {
        params.sort_by = sortBy;
        params.sort_order = sortOrder;
      }
      
      // Add stock filter
      if (stockFilter !== 'all') {
        params.stock_filter = stockFilter;
      }
      
      // Add price range filter
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        params.min_price = parseFloat(minPrice);
      }
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        params.max_price = parseFloat(maxPrice);
      }
      
      const response = await productApi.getProducts(tenantId, params);
      
      setProducts(response.data || []);
      setTotalPages(response.last_page || 1);
      setTotalItems(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch products. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, currentPage, perPage, debouncedSearchQuery, selectedCategory, sortBy, sortOrder, stockFilter, minPrice, maxPrice, toast]);

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

  const fetchStats = useCallback(async () => {
    if (!tenantId) return;
    setStatsLoading(true);
    try {
      const data = await productApi.getProductStats(tenantId);
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch product stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch statistics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setStatsLoading(false);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedCategory, sortBy, sortOrder, stockFilter, minPrice, maxPrice]);

  // Fetch products when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Server-side filtering - no client-side filtering needed
  const filteredProducts = products;



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
        category_id: product.category_id,
        status: product.status || 'active',
      });
      // Set image preview if product has image
      setImagePreview(product.image_url || null);
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
      });
      setImagePreview(null);
    }
    setImageFile(null);
    setValidationErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setValidationErrors({});
    setImageFile(null);
    setImagePreview(null);
  };

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select an image file',
          variant: 'destructive',
        });
        return;
      }
      
      // Validate file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image size must be less than 2MB',
          variant: 'destructive',
        });
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle image upload
  const handleImageUpload = async (productId: string) => {
    if (!imageFile || !tenantId) {
      console.log('No image file or tenant ID', { imageFile, tenantId });
      return;
    }
    
    try {
      console.log('Uploading image for product:', productId);
      const result = await productApi.uploadImage(tenantId, productId, imageFile);
      console.log('Image upload result:', result);
      // Don't show toast here, let the parent function handle it
    } catch (error: unknown) {
      console.error('Failed to upload image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', errorMessage);
      // Re-throw the error so the parent function can handle it
      throw error;
    }
  };

  // Validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!form.name.trim()) {
      errors.name = 'Product name is required';
    } else if (form.name.length > 255) {
      errors.name = 'Product name must be less than 255 characters';
    }

    if (!form.sku.trim()) {
      errors.sku = 'SKU is required';
    } else if (form.sku.length > 100) {
      errors.sku = 'SKU must be less than 100 characters';
    } else {
      // Check SKU uniqueness (client-side warning)
      const isDuplicate = products.some(
        p => p.sku.toLowerCase() === form.sku.toLowerCase() && p.id !== editingProduct?.id
      );
      if (isDuplicate) {
        errors.sku = 'This SKU already exists. Please use a unique SKU.';
      }
    }

    // Price validation
    if (form.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    // Cost price vs selling price validation
    if (form.cost_price && form.cost_price > 0 && form.cost_price >= form.price) {
      errors.price = 'Selling price should be higher than cost price for profit';
    }

    // Stock validation
    if (form.stock < 0) {
      errors.stock = 'Stock cannot be negative';
    }

    // Description length
    if (form.description && form.description.length > 1000) {
      errors.description = 'Description must be less than 1000 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    // Validate form before submission
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
      let savedProduct;
      if (editingProduct) {
        savedProduct = await productApi.updateProduct(tenantId, editingProduct.id, form);
        // Upload image if selected for existing product
        if (imageFile && editingProduct.id) {
          try {
            await handleImageUpload(editingProduct.id);
            toast({
              title: 'Success',
              description: 'Product and image updated successfully.',
            });
          } catch (imgError) {
            console.error('Failed to upload image:', imgError);
            toast({
              title: 'Warning',
              description: 'Product updated but image upload failed.',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Success',
            description: 'Product updated successfully.',
          });
        }
      } else {
        savedProduct = await productApi.createProduct(tenantId, form);
        // Upload image if selected for new product
        if (imageFile && savedProduct?.id) {
          try {
            await handleImageUpload(savedProduct.id);
            toast({
              title: 'Success',
              description: 'Product created and image uploaded successfully.',
            });
          } catch (imgError) {
            console.error('Failed to upload image:', imgError);
            toast({
              title: 'Warning',
              description: 'Product created but image upload failed. You can edit the product to add an image.',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Success',
            description: 'Product created successfully.',
          });
        }
      }
      
      await fetchProducts();
      await fetchStats(); // Refresh stats after product change
      handleCloseModal();
    } catch (error: unknown) {
      console.error('Failed to save product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', errorMessage);

      // Handle validation errors from backend
      if (error && typeof error === 'object' && 'response' in error &&
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'errors' in error.response.data) {
        setValidationErrors(error.response.data.errors as Record<string, string>);
        toast({
          title: 'Validation Error',
          description: 'Please fix the errors in the form.',
          variant: 'destructive',
        });
      } else {
        const responseMessage = error && typeof error === 'object' && 'response' in error &&
          error.response && typeof error.response === 'object' && 'data' in error.response &&
          error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data
          ? String(error.response.data.message) : errorMessage;
        toast({
          title: 'Error',
          description: responseMessage || 'Failed to save product. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!tenantId) return;
    
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    setDeleting(product.id);

    try {
      await productApi.deleteProduct(tenantId, product.id);
      toast({
        title: 'Success',
        description: 'Product deleted successfully.',
      });
      await fetchProducts();
      await fetchStats(); // Refresh stats after product deletion
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  // Bulk operation handlers
  const handleBulkOperationSuccess = async () => {
    bulkSelection.clearSelection();
    await fetchProducts();
    await fetchStats();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your product inventory
          </p>
        </div>
        <div className="flex gap-2">
          {/* Export/Import Buttons */}
          {hasPermission('products.view') && (
            <ExportButton
              currentFilters={{
                search: debouncedSearchQuery,
                category_id: selectedCategory !== 'all' ? selectedCategory : undefined,
                stock_filter: stockFilter !== 'all' ? stockFilter : undefined,
                min_price: minPrice ? parseFloat(minPrice) : undefined,
                max_price: maxPrice ? parseFloat(maxPrice) : undefined,
              }}
            />
          )}
          {hasPermission('products.create') && (
            <ImportButton
              onSuccess={async () => {
                await fetchProducts();
                await fetchStats();
              }}
            />
          )}
          {hasPermission('products.create') ? (
            <Button onClick={() => handleOpenModal()}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <ShieldExclamationIcon className="h-5 w-5" />
              <span>No create permission</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Products Card */}
        <Card className="transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer">
          <CardContent className="p-6">
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Total Products
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.total_products.toLocaleString() || '0'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    (stats?.monthly_products_growth || 0) >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(stats?.monthly_products_growth || 0) >= 0 ? '+' : ''}
                    {stats?.monthly_products_growth || 0} this month
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center">
                  <CubeIcon className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Value Card */}
        <Card className="transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer">
          <CardContent className="p-6">
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Total Value
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(stats?.total_value || 0)}
                  </p>
                  <p className={`text-sm mt-1 ${
                    (stats?.monthly_value_growth || 0) >= 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {(stats?.monthly_value_growth || 0) >= 0 ? '+' : ''}
                    {formatCurrency(stats?.monthly_value_growth || 0)} this month
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 flex items-center justify-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Items Card */}
        <Card className="transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer">
          <CardContent className="p-6">
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Low Stock Items
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.low_stock_items || 0}
                  </p>
                  <p className={`text-sm mt-1 ${
                    (stats?.monthly_low_stock_growth || 0) >= 0 
                      ? 'text-orange-600 dark:text-orange-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {(stats?.monthly_low_stock_growth || 0) >= 0 ? '+' : ''}
                    {stats?.monthly_low_stock_growth || 0} this month
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900 dark:to-orange-800 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 dark:text-orange-300" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Seller Card */}
        <Card className="transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer">
          <CardContent className="p-6">
            {statsLoading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Top Seller
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white truncate" title={stats?.top_seller.name}>
                    {stats?.top_seller.name || 'No sales yet'}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                    {stats?.top_seller.total_sold || 0} sold this month
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 flex items-center justify-center flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Top Row: Search and Category */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  type="text"
                  placeholder="Search by name, SKU, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchQuery && searchQuery !== debouncedSearchQuery && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-primary-600"></div>
                  </div>
                )}
                {searchQuery && searchQuery === debouncedSearchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="sm:w-64">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input w-full"
                >
                  <option value="all">All Categories</option>
                  {Array.isArray(categories) && categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stock Level Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700 flex items-center">Stock:</span>
              <Button
                variant={stockFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStockFilter('all')}
              >
                All
              </Button>
              <Button
                variant={stockFilter === 'in_stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStockFilter('in_stock')}
              >
                In Stock
              </Button>
              <Button
                variant={stockFilter === 'low_stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStockFilter('low_stock')}
              >
                Low Stock
              </Button>
              <Button
                variant={stockFilter === 'out_of_stock' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStockFilter('out_of_stock')}
              >
                Out of Stock
              </Button>
            </div>

            {/* Price Range Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Price Range:</span>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-24"
                  min="0"
                  step="0.01"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-24"
                  min="0"
                  step="0.01"
                />
                {(minPrice || maxPrice) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMinPrice('');
                      setMaxPrice('');
                    }}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchQuery || selectedCategory !== 'all' || stockFilter !== 'all' || minPrice || maxPrice) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                <span className="font-medium">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="ml-1">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedCategory !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Category: {Array.isArray(categories) && categories.find(c => c.id === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory('all')} className="ml-1">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {stockFilter !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Stock: {stockFilter.replace('_', ' ')}
                    <button onClick={() => setStockFilter('all')} className="ml-1">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {(minPrice || maxPrice) && (
                  <Badge variant="secondary" className="gap-1">
                    Price: {minPrice || '0'} - {maxPrice || '∞'}
                    <button onClick={() => { setMinPrice(''); setMaxPrice(''); }} className="ml-1">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setStockFilter('all');
                    setMinPrice('');
                    setMaxPrice('');
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            /* Loading Skeleton */
            <div className="p-6">
              <div className="hidden md:block space-y-3">
                {/* Table Skeleton */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-10 bg-gray-200 rounded flex-1"></div>
                    <div className="h-10 bg-gray-200 rounded w-24"></div>
                    <div className="h-10 bg-gray-200 rounded w-32"></div>
                    <div className="h-10 bg-gray-200 rounded w-24"></div>
                    <div className="h-10 bg-gray-200 rounded w-20"></div>
                    <div className="h-10 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
              {/* Mobile Card Skeleton */}
              <div className="md:hidden space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <ArchiveBoxIcon className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {products.length === 0 ? 'No products found' : 'No matching products'}
              </h3>
              <p className="text-sm text-gray-500 mb-6 text-center">
                {products.length === 0
                  ? 'Get started by creating your first product.'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
              {products.length === 0 && (
                <Button onClick={() => handleOpenModal()}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table scrollX={true}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={bulkSelection.isAllSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              bulkSelection.selectAll();
                            } else {
                              bulkSelection.clearSelection();
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Name
                          {sortBy === 'name' && (
                            sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('sku')}
                      >
                        <div className="flex items-center gap-1">
                          SKU
                          {sortBy === 'sku' && (
                            sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('price')}
                      >
                        <div className="flex items-center gap-1">
                          Price
                          {sortBy === 'price' && (
                            sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleSort('stock')}
                      >
                        <div className="flex items-center gap-1">
                          Stock
                          {sortBy === 'stock' && (
                            sortOrder === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={bulkSelection.isSelected(product.id)}
                          onChange={() => bulkSelection.toggleSelection(product.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {product.thumbnail_url || product.image_url ? (
                          <img 
                            src={product.thumbnail_url || product.image_url || ''} 
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                            <PhotoIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>
                        {product.category ? (
                          <Badge variant="outline">{product.category.name}</Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">No category</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">{formatCurrency(product.price)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.stock > 10 
                            ? 'bg-green-100 text-green-800'
                            : product.stock > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            product.status === 'active' ? 'default' : 
                            product.status === 'inactive' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {product.status || 'active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {hasPermission('products.update') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenModal(product)}
                              disabled={deleting === product.id}
                              title="Edit Product"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission('products.delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(product)}
                              loading={deleting === product.id}
                              disabled={deleting === product.id}
                              title="Delete Product"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          )}
                          {!hasPermission('products.update') && !hasPermission('products.delete') && (
                            <span className="text-xs text-gray-400 italic">No actions available</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="p-4 hover:bg-gray-50">
                    <div className="flex gap-3 mb-3">
                      {/* Product Image */}
                      {product.thumbnail_url || product.image_url ? (
                        <img 
                          src={product.thumbnail_url || product.image_url || ''} 
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <PhotoIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">SKU: {product.sku}</p>
                        <div className="mt-2">
                          <Badge 
                            variant={
                              product.status === 'active' ? 'default' : 
                              product.status === 'inactive' ? 'secondary' : 
                              'destructive'
                            }
                            className="text-xs"
                          >
                            {product.status || 'active'}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2">
                        {hasPermission('products.update') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(product)}
                            disabled={deleting === product.id}
                            title="Edit Product"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </Button>
                        )}
                        {hasPermission('products.delete') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(product)}
                            loading={deleting === product.id}
                            disabled={deleting === product.id}
                            title="Delete Product"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </Button>
                        )}
                        {!hasPermission('products.update') && !hasPermission('products.delete') && (
                          <span className="text-xs text-gray-400 italic px-2">No actions</span>
                        )}
                      </div>
                    </div>

                    {product.description && (
                      <p className="text-sm text-gray-500 mb-3">{product.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Category</p>
                        {product.category ? (
                          <Badge variant="outline" className="text-xs">{product.category.name}</Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">No category</span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Price</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(product.price)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Stock</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.stock > 10 
                            ? 'bg-green-100 text-green-800'
                            : product.stock > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {product.stock}
                        </span>
                      </div>
                      {product.cost_price && product.cost_price > 0 && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Cost Price</p>
                          <p className="text-sm text-gray-600">{formatCurrency(product.cost_price)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={perPage}
                    totalItems={totalItems}
                    showFirstLast={true}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Product Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Image
            </label>
            <div className="flex items-center gap-4">
              {/* Image Preview */}
              <div className="flex-shrink-0">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-24 h-24 object-cover rounded border-2 border-gray-300"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              
              {/* Upload Button */}
              <div className="flex-1">
                <input
                  type="file"
                  id="product-image"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <label
                  htmlFor="product-image"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                >
                  <PhotoIcon className="h-5 w-5 mr-2" />
                  {imagePreview ? 'Change Image' : 'Upload Image'}
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  PNG, JPG, GIF up to 2MB
                </p>
                {imageFile && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {imageFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className={validationErrors.name ? 'border-red-500' : ''}
                maxLength={255}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{form.name.length}/255 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <Input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                required
                className={validationErrors.sku ? 'border-red-500' : ''}
                maxLength={100}
              />
              {validationErrors.sku && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.sku}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{form.sku.length}/100 characters</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                name="category_id"
                value={form.category_id || ''}
                onChange={(e) => setForm(prev => ({ ...prev, category_id: e.target.value || undefined }))}
                className="input w-full"
              >
                <option value="">No Category</option>
                {Array.isArray(categories) && categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                name="status"
                value={form.status || 'active'}
                onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'discontinued' }))}
                className="input w-full"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price <span className="text-red-500">*</span>
              </label>
              <Input
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={handleChange}
                required
                className={validationErrors.price ? 'border-red-500' : ''}
              />
              {validationErrors.price && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.price}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock <span className="text-red-500">*</span>
              </label>
              <Input
                name="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={handleChange}
                required
                className={validationErrors.stock ? 'border-red-500' : ''}
              />
              {validationErrors.stock && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.stock}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost Price (Optional)
            </label>
            <Input
              name="cost_price"
              type="number"
              step="0.01"
              min="0"
              value={form.cost_price}
              onChange={handleChange}
            />
            <p className="text-xs text-gray-500 mt-1">
              Your profit margin: {form.price > 0 && form.cost_price ? 
                `${(((form.price - form.cost_price) / form.price) * 100).toFixed(1)}%` : 
                'N/A'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              rows={3}
              className={`input ${validationErrors.description ? 'border-red-500' : ''}`}
              value={form.description}
              onChange={handleChange}
              maxLength={1000}
            />
            {validationErrors.description && (
              <p className="text-xs text-red-500 mt-1">{validationErrors.description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{(form.description || '').length}/1000 characters</p>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              loading={submitting}
            >
              {editingProduct ? 'Update' : 'Create'} Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Action Toolbar */}
      {tenantId && (
        <>
          <BulkActionToolbar
            selectedCount={bulkSelection.selectedCount}
            onClearSelection={bulkSelection.clearSelection}
            onDelete={() => setBulkDeleteModalOpen(true)}
            onUpdateStatus={() => setBulkStatusModalOpen(true)}
            onUpdateCategory={() => setBulkCategoryModalOpen(true)}
            onUpdatePrice={() => setBulkPriceModalOpen(true)}
            canDelete={hasPermission('products.delete')}
            canUpdate={hasPermission('products.update')}
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
        </>
      )}
    </div>
  );
};