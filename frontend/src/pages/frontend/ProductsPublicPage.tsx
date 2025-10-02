import { useState } from 'react';
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
  SlidersHorizontal
} from 'lucide-react';
import { Link } from 'react-router-dom';

const products = [
  {
    id: '1',
    name: 'Premium Coffee Blend',
    price: 24.99,
    originalPrice: 29.99,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop',
    rating: 4.8,
    reviews: 124,
    category: 'Coffee & Tea',
    badge: 'Best Seller',
    inStock: true
  },
  {
    id: '2',
    name: 'Organic Green Tea',
    price: 18.99,
    originalPrice: 22.99,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop',
    rating: 4.6,
    reviews: 89,
    category: 'Coffee & Tea',
    badge: 'Organic',
    inStock: true
  },
  {
    id: '3',
    name: 'Artisan Chocolate',
    price: 32.99,
    originalPrice: 39.99,
    image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&h=300&fit=crop',
    rating: 4.9,
    reviews: 156,
    category: 'Food & Beverages',
    badge: 'Premium',
    inStock: true
  },
  {
    id: '4',
    name: 'Fresh Avocados',
    price: 8.99,
    originalPrice: 10.99,
    image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=300&h=300&fit=crop',
    rating: 4.5,
    reviews: 67,
    category: 'Food & Beverages',
    badge: 'Fresh',
    inStock: true
  },
  {
    id: '5',
    name: 'Wireless Headphones',
    price: 129.99,
    originalPrice: 159.99,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop',
    rating: 4.7,
    reviews: 203,
    category: 'Electronics',
    badge: 'New',
    inStock: false
  },
  {
    id: '6',
    name: 'Cotton T-Shirt',
    price: 19.99,
    originalPrice: 24.99,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
    rating: 4.4,
    reviews: 91,
    category: 'Fashion',
    badge: 'Sale',
    inStock: true
  }
];

const categories = ['All', 'Coffee & Tea', 'Food & Beverages', 'Electronics', 'Fashion'];

export default function ProductsPublicPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get('category') || 'All'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: typeof products[0]) => {
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
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={selectedCategory === category ? 'gradient-secondary text-white' : ''}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
                
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
                
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products Grid */}
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
            : 'grid-cols-1'
        }`}>
          {filteredProducts.map((product) => (
            <GlassCard key={product.id} className="group cursor-pointer" hover>
              <div className={`${viewMode === 'list' ? 'flex gap-6' : ''}`}>
                <div 
                  className={`relative ${viewMode === 'list' ? 'w-48 flex-shrink-0' : 'mb-4'}`}
                  onClick={() => handleProductClick(product.id)}
                >
                  <div className="aspect-square rounded-xl overflow-hidden">
                    <img 
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <Badge className="absolute top-3 left-3 gradient-secondary text-white">
                    {product.badge}
                  </Badge>
                  {!product.inStock && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <Badge variant="destructive">Out of Stock</Badge>
                    </div>
                  )}
                </div>
                
                <div className={`space-y-3 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {product.category}
                    </Badge>
                    <h3 
                      className="text-xl font-semibold group-hover:text-primary transition-colors cursor-pointer"
                      onClick={() => handleProductClick(product.id)}
                    >
                      {product.name}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{product.rating}</span>
                    </div>
                    <span className="text-muted-foreground">({product.reviews} reviews)</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">${product.price}</span>
                      <span className="text-muted-foreground line-through">${product.originalPrice}</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="gradient-secondary text-white"
                      disabled={!product.inStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (product.inStock) {
                          handleAddToCart(product);
                        }
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {product.inStock ? 'Add to Cart' : 'Out of Stock'}
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 gradient-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="h-12 w-12 text-white" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">No products found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search or filter criteria
            </p>
            <Button onClick={() => {
              setSearchTerm('');
              setSelectedCategory('All');
            }}>
              Clear Filters
            </Button>
          </div>
        )}

        {/* Load More */}
        {filteredProducts.length > 0 && (
          <div className="text-center mt-12">
            <Button size="lg" variant="outline">
              Load More Products
            </Button>
          </div>
        )}
      </div>

      <FooterFrontend />
    </div>
  );
}