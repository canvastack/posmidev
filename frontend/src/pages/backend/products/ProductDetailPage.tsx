import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/hooks/use-toast';
import { productApi } from '@/api/productApi';
import type { Product } from '@/types';
import { getImageUrl } from '@/utils/imageHelpers';
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon,
  CubeIcon,
  ChartBarIcon,
  ClockIcon,
  TagIcon,
  CurrencyDollarIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';
import { VariantManager } from '@/components/domain/variants/VariantManager';
import { ActivityTimeline } from '@/components/domain/products/ActivityTimeline';
import { ProductAnalytics } from '@/components/domain/products/ProductAnalytics';
import { useProductActivity } from '@/hooks/useProductActivity';
import ProductImageGallery from '@/components/domain/products/ProductImageGallery';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { tenantId } = useAuth();
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Activity history hook - lazy load when history tab is active
  // Initial load: 8 rows with load more functionality
  const {
    activities,
    loading: activityLoading,
    error: activityError,
    hasMore,
    loadMore,
    fetchActivities,
    refresh: refreshActivities,
    setPeriod: setActivityPeriod,
    currentPeriod: activityPeriod,
  } = useProductActivity({
    tenantId: tenantId || '',
    productId: productId || '',
    autoFetch: false, // Manual fetch control - lazy load when tab is active
    perPage: 8, // Initial load: 8 rows max (can extend via load more)
  });

  useEffect(() => {
    if (tenantId && productId) {
      fetchProduct();
    }
  }, [tenantId, productId]);

  // Fetch activities when history tab becomes active
  useEffect(() => {
    if (activeTab === 'history' && tenantId && productId && activities.length === 0) {
      fetchActivities(1);
    }
  }, [activeTab, tenantId, productId]);

  const fetchProduct = async () => {
    if (!tenantId || !productId) return;
    
    setLoading(true);
    try {
      const data = await productApi.getProduct(tenantId, productId);
      setProduct(data);
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

  const handleDelete = async () => {
    if (!tenantId || !productId || !product) return;
    
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }
    
    try {
      await productApi.deleteProduct(tenantId, productId);
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
      navigate('/admin/products');
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const handleEnableVariants = async () => {
    if (!tenantId || !productId) return;
    
    try {
      await productApi.updateProduct(tenantId, productId, {
        has_variants: true,
      });
      
      // Refresh product data
      await fetchProduct();
      
      toast({
        title: 'Success',
        description: 'Variants enabled for this product',
      });
      
      // Switch to variants tab
      setActiveTab('variants');
    } catch (error) {
      console.error('Failed to enable variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable variants',
        variant: 'destructive',
      });
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
        <div className="text-center">
          <p className="text-muted-foreground">Product not found</p>
          <Button onClick={() => navigate('/admin/products')} className="mt-4">
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  const canEdit = hasPermission('products.update');
  const canDelete = hasPermission('products.delete');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/products')}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="text-muted-foreground mt-1">
              SKU: {product.sku}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/products/${productId}/edit`)}
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <CubeIcon className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="variants">
            <TagIcon className="h-4 w-4 mr-2" />
            Variants
            {product.has_variants && product.variant_count !== undefined && (
              <Badge variant="secondary" className="ml-2">
                {product.variant_count}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            <ClockIcon className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Product Info Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Images - Phase 7: Multi-Image Gallery */}
                {tenantId && productId && hasPermission('products.update') && (
                  <div className="mb-6">
                    <ProductImageGallery
                      tenantId={tenantId}
                      productId={productId}
                      images={product.images}
                      onImagesChange={fetchProduct}
                    />
                  </div>
                )}

                {/* Fallback: Show old single image if no multi-image gallery permission */}
                {(!hasPermission('products.update') && getImageUrl(product.image_url)) && (
                  <div className="flex justify-center mb-4">
                    <img
                      src={getImageUrl(product.image_url) || ''}
                      alt={product.name}
                      className="max-w-xs rounded-lg shadow-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-lg">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">SKU</p>
                    <p className="text-lg font-mono">{product.sku}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <p className="text-lg">
                      {product.category?.name || 'Uncategorized'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                      {product.status}
                    </Badge>
                  </div>
                </div>

                {product.description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                    <p className="text-sm">{product.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pricing & Stock Card */}
            <Card>
              <CardHeader>
                <CardTitle>Pricing & Stock</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Selling Price</p>
                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(product.price)}
                    </p>
                  </div>
                </div>

                {product.cost_price && product.cost_price > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Cost Price</p>
                    <p className="text-lg">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: 'IDR',
                      }).format(product.cost_price)}
                    </p>
                  </div>
                )}

                {product.cost_price && product.cost_price > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                    <p className="text-lg font-semibold text-green-600">
                      {(((product.price - product.cost_price) / product.price) * 100).toFixed(2)}%
                    </p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArchiveBoxIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Stock Level</p>
                        <p className="text-2xl font-bold">{product.stock}</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        product.stock === 0
                          ? 'destructive'
                          : product.stock < 10
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {product.stock === 0
                        ? 'Out of Stock'
                        : product.stock < 10
                        ? 'Low Stock'
                        : 'In Stock'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Phase 9: Additional Business Features */}
          {(product.supplier || product.uom || product.tax_rate !== null || (product.tags && product.tags.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Supplier */}
                {product.supplier && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Supplier</p>
                    <p className="font-medium">{product.supplier.name}</p>
                    {product.supplier.contact_person && (
                      <p className="text-sm text-muted-foreground">
                        Contact: {product.supplier.contact_person}
                      </p>
                    )}
                    {product.supplier.phone && (
                      <p className="text-sm text-muted-foreground">
                        Phone: {product.supplier.phone}
                      </p>
                    )}
                    {product.supplier.email && (
                      <p className="text-sm text-muted-foreground">
                        Email: {product.supplier.email}
                      </p>
                    )}
                  </div>
                )}

                {/* UOM */}
                {product.uom && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Unit of Measurement</p>
                    <p className="font-medium">{product.formatted_uom || product.uom}</p>
                    {product.stock_with_uom && (
                      <p className="text-sm text-muted-foreground">
                        Stock: {product.stock_with_uom}
                      </p>
                    )}
                  </div>
                )}

                {/* Tax Configuration */}
                {product.tax_rate !== null && product.tax_rate !== undefined && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Tax Configuration</p>
                    <p className="font-medium">{product.tax_rate}%</p>
                    <p className="text-sm text-muted-foreground mb-2">
                      Tax {product.tax_inclusive ? 'Inclusive' : 'Exclusive'}
                    </p>
                    {product.price_with_tax && product.price_without_tax && (
                      <div className="text-sm space-y-1 bg-muted/30 p-3 rounded-md">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Price without tax:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(product.price_without_tax)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax amount:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(product.tax_amount || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <span className="font-semibold">Final price:</span>
                          <span className="font-semibold">
                            {new Intl.NumberFormat('id-ID', {
                              style: 'currency',
                              currency: 'IDR',
                            }).format(product.price_with_tax)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Product Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Product Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          style={{
                            backgroundColor: `${tag.color}20`,
                            borderColor: tag.color,
                            color: tag.color,
                          }}
                          className="border"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Variant Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Variant Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              {product.has_variants ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Variants Enabled</p>
                    <p className="text-sm text-muted-foreground">
                      This product has {product.variant_count || 0} variant(s)
                    </p>
                  </div>
                  <Button onClick={() => setActiveTab('variants')}>
                    Manage Variants
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Variants Not Enabled</p>
                    <p className="text-sm text-muted-foreground">
                      Enable variants to sell this product in multiple options (size, color, etc.)
                    </p>
                  </div>
                  {canEdit && (
                    <Button onClick={handleEnableVariants}>
                      Enable Variants
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants">
          <VariantManager
            productId={productId!}
            tenantId={tenantId!}
            productName={product.name}
            productSku={product.sku}
            productPrice={product.price}
            hasVariants={product.has_variants || false}
            onVariantsToggle={(enabled) => {
              setProduct({ ...product, has_variants: enabled });
            }}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <ActivityTimeline
            activities={activities}
            loading={activityLoading}
            error={activityError}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onRefresh={refreshActivities}
            onPeriodChange={setActivityPeriod}
            currentPeriod={activityPeriod}
            productName={product.name}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          {tenantId && productId && (
            <ProductAnalytics
              tenantId={tenantId}
              productId={productId}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}