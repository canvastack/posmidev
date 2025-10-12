import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { ProductImage } from '@/components/ui/ProductImage';
import { productApi } from '@/api/productApi';
import type { Product } from '@/types';
import {
  ShoppingCart,
  Package,
  DollarSign,
  Tag,
  Barcode,
  AlertCircle,
  TrendingUp,
  X,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

/**
 * ProductQuickViewModal Component
 * 
 * Phase 3a Feature 3: Product Quick Actions
 * 
 * Features:
 * - Quick preview of product details without leaving POS
 * - Product image, name, price, stock, category, barcode
 * - Stock status indicator
 * - Quick Add to Cart button
 * - Fast loading with skeleton state
 * - ESC key to close
 * 
 * Design Compliance:
 * ✅ Glass card modal with backdrop blur
 * ✅ Design tokens from index.css
 * ✅ Dark/light mode via CSS variables
 * ✅ Responsive layout (mobile & desktop)
 * ✅ Touch-friendly buttons (48px+ height)
 * ✅ Semantic color coding
 * 
 * @example
 * <ProductQuickViewModal
 *   isOpen={showQuickView}
 *   productId="uuid"
 *   tenantId="tenant-uuid"
 *   onClose={() => setShowQuickView(false)}
 *   onAddToCart={(product) => addToCart(product)}
 * />
 */

interface ProductQuickViewModalProps {
  isOpen: boolean;
  productId: string;
  tenantId: string;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export function ProductQuickViewModal({
  isOpen,
  productId,
  tenantId,
  onClose,
  onAddToCart,
}: ProductQuickViewModalProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch product details when modal opens
  useEffect(() => {
    if (!isOpen || !productId) return;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await productApi.getProduct(tenantId, productId);
        setProduct(data);
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError('Failed to load product details');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [isOpen, productId, tenantId]);

  // Handle Add to Cart
  const handleAddToCart = () => {
    if (product) {
      onAddToCart(product);
      onClose();
    }
  };

  // Get stock status
  const getStockStatus = () => {
    if (!product) return { label: 'Unknown', color: 'bg-muted text-muted-foreground' };

    const stock = product.stock_quantity || 0;

    if (stock === 0) {
      return { label: 'Out of Stock', color: 'bg-danger-500/10 text-danger-700 dark:text-danger-400 border-danger-500/20' };
    }

    if (stock <= 10) {
      return { label: 'Low Stock', color: 'bg-warning-500/10 text-warning-700 dark:text-warning-400 border-warning-500/20' };
    }

    return { label: 'In Stock', color: 'bg-success-500/10 text-success-700 dark:text-success-400 border-success-500/20' };
  };

  const stockStatus = getStockStatus();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick View"
      size="lg"
    >
      <div className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading product details...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-danger-500 mb-4" />
            <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>
            <Button
              variant="outline"
              onClick={onClose}
              className="mt-4"
            >
              Close
            </Button>
          </div>
        )}

        {/* Product Details */}
        {product && !loading && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column: Image */}
            <div className="space-y-4">
              <div className="aspect-square rounded-xl overflow-hidden border border-border/50">
                <ProductImage
                  src={product.thumbnail_url || product.image_url}
                  alt={product.name}
                  size="lg"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Stock Badge */}
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Stock Status:</span>
                <Badge className={`${stockStatus.color} border`}>
                  {stockStatus.label}
                </Badge>
              </div>
            </div>

            {/* Right Column: Details */}
            <div className="space-y-6">
              {/* Product Name */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {product.name}
                </h2>
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="glass-card p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-success-600 dark:text-success-400" />
                  <span className="text-sm text-muted-foreground">Price</span>
                </div>
                <div className="text-3xl font-bold text-success-600 dark:text-success-400">
                  {formatCurrency(parseFloat(product.price))}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Stock Quantity */}
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-info-600 dark:text-info-400" />
                    <span className="text-xs text-muted-foreground">Stock</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    {product.stock_quantity || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {product.unit || 'units'}
                  </div>
                </div>

                {/* Category */}
                {product.category_name && (
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      <span className="text-xs text-muted-foreground">Category</span>
                    </div>
                    <div className="text-sm font-medium text-foreground truncate" title={product.category_name}>
                      {product.category_name}
                    </div>
                  </div>
                )}
              </div>

              {/* Barcode/SKU */}
              {(product.barcode || product.sku) && (
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Barcode className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Product Code</span>
                  </div>
                  <div className="flex gap-4">
                    {product.sku && (
                      <div>
                        <div className="text-xs text-muted-foreground">SKU</div>
                        <div className="text-sm font-mono font-medium text-foreground">
                          {product.sku}
                        </div>
                      </div>
                    )}
                    {product.barcode && (
                      <div>
                        <div className="text-xs text-muted-foreground">Barcode</div>
                        <div className="text-sm font-mono font-medium text-foreground">
                          {product.barcode}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                className="w-full h-12 gap-2 bg-gradient-to-r from-success-600 to-success-500 hover:from-success-700 hover:to-success-600 text-white shadow-lg"
                disabled={!product.stock_quantity || product.stock_quantity === 0}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="font-semibold">
                  {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </span>
              </Button>

              {/* Additional Info */}
              <div className="text-xs text-muted-foreground text-center pt-2">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded border text-xs">ESC</kbd> to close
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}