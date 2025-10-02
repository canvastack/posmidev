import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HeaderFrontend } from '../../components/layout/HeaderFrontend';
import { FooterFrontend } from '../../layouts/FooterFrontend';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Search, 
  Star, 
  ShoppingCart, 
  Grid3X3, 
  List,
  SlidersHorizontal,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePublicProducts } from '../../hooks/usePublicProducts';
import type { PublicProduct } from '../../types';

const HQ_TENANT_ID = import.meta.env.VITE_HQ_TENANT_ID || '11111111-1111-1111-1111-111111111111';

export default function ProductsPublicPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch products from API
  const { products, loading, error, meta } = usePublicProducts({
    tenantId: HQ_TENANT_ID,
    searchQuery: debouncedSearch,
    minStock: 0, // Show all products including out of stock
    limit: 24,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleAddToCart = (product: PublicProduct) => {
    // In a real app, this would add to cart state/context
    console.log('Added to cart:', product);
    // You could show a toast notification here
  };

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
  };

  return (
    <div className="min-h-screen">
      <HeaderFrontend />

      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Our Products</h1>
          <p className="text-xl text-muted-foreground">
            Discover our complete collection of premium products
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <GlassCard className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  {loading && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Results */}
        {!loading && !error && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              Showing {products.length} {meta ? `of ${meta.total}` : ''} products
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-16">
            <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2 text-red-600">Error Loading Products</h3>
            <p className="text-muted-foreground mb-6">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <GlassCard key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-xl mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <>
            <div className={`grid gap-6 ${
              viewMode === 'grid' 
                ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}>
              {products.map((product) => (
                <GlassCard key={product.id} className="group cursor-pointer" hover>
                  <div className={`${viewMode === 'list' ? 'flex gap-6' : ''}`}>
                    <div 
                      className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'mb-4'}`}
                      onClick={() => handleProductClick(product.id)}
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        {product.image_url || product.thumbnail_url ? (
                          <img 
                            src={product.thumbnail_url || product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <span className="text-6xl text-white/30">📦</span>
                        )}
                      </div>
                      {product.stock === 0 && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <Badge variant="destructive">Out of Stock</Badge>
                        </div>
                      )}
                    </div>
                    
                    <div className={`space-y-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <div>
                        <h3 
                          className="text-xl font-semibold group-hover:text-primary transition-colors cursor-pointer line-clamp-2"
                          onClick={() => handleProductClick(product.id)}
                        >
                          {product.name}
                        </h3>
                        {product.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {product.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge variant={product.stock > 0 ? 'default' : 'secondary'}>
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">${Number(product.price).toFixed(2)}</span>
                        <Button 
                          size="sm" 
                          className="gradient-secondary text-white"
                          disabled={product.stock === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (product.stock > 0) {
                              handleAddToCart(product);
                            }
                          }}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* No Products */}
            {products.length === 0 && (
              <div className="text-center py-16">
                <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-2xl font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search criteria
                </p>
                <Button onClick={() => setSearchTerm('')}>
                  Clear Search
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <FooterFrontend />
    </div>
  );
}