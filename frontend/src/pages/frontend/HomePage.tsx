import { Button } from '../../components/ui/button';
import { HeaderFrontend } from '../../components/layout/HeaderFrontend';
import { FooterFrontend } from '../../layouts/FooterFrontend';
import { GlassCard } from '../../components/ui/GlassCard';
import { Badge } from '../../components/ui/badge';
import { 
  ShoppingCart, 
  Star, 
  TrendingUp, 
  Users, 
  Award,
  ArrowRight,
  Play,
  CheckCircle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Mock data for featured products
const featuredProducts = [
  {
    id: '1',
    name: 'Premium Coffee Blend',
    price: 24.99,
    originalPrice: 29.99,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=300&h=300&fit=crop',
    rating: 4.8,
    reviews: 124,
    badge: 'Best Seller'
  },
  {
    id: '2',
    name: 'Organic Green Tea',
    price: 18.99,
    originalPrice: 22.99,
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop',
    rating: 4.6,
    reviews: 89,
    badge: 'Organic'
  },
  {
    id: '3',
    name: 'Artisan Chocolate',
    price: 32.99,
    originalPrice: 39.99,
    image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&h=300&fit=crop',
    rating: 4.9,
    reviews: 156,
    badge: 'Premium'
  }
];

const stats = [
  { label: 'Happy Customers', value: '10,000+', icon: Users },
  { label: 'Products Sold', value: '50,000+', icon: ShoppingCart },
  { label: 'Average Rating', value: '4.8/5', icon: Star },
  { label: 'Years Experience', value: '15+', icon: Award }
];

export default function HomePage() {
  const navigate = useNavigate();

  const handleAddToCart = (product: typeof featuredProducts[0]) => {
    // Mock implementation - would integrate with cart state later
    console.log('Added to cart:', product);
    // Show toast notification (using sonner)
    // toast.success(`Added ${product.name} to cart!`);
  };

  return (
    <div className="min-h-screen">
      <HeaderFrontend />

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge className="gradient-secondary text-white">
                <TrendingUp className="h-3 w-3 mr-1" />
                #1 Modern POS System
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Experience the
                <span className="gradient-primary bg-clip-text text-transparent block">
                  Future of Retail
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Discover our premium collection of products with our state-of-the-art 
                point of sale system. Seamless shopping experience with modern design.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="gradient-secondary text-white text-lg px-8"
                onClick={() => navigate('/products')}
              >
                Shop Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8">
                <Play className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </div>

            <div className="flex items-center gap-6 pt-4">
              {['Free Shipping', 'Secure Payment', '24/7 Support'].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <GlassCard className="animate-float">
              <div className="aspect-square rounded-xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=600&fit=crop"
                  alt="Modern POS System"
                  className="w-full h-full object-cover"
                />
              </div>
            </GlassCard>
            <div className="absolute -bottom-6 -right-6 glass-card p-4 animate-glow">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 gradient-secondary rounded-full flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-semibold">Sales Growth</p>
                  <p className="text-2xl font-bold text-green-500">+45%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={index} className="text-center" hover>
                <div className="w-12 h-12 gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{stat.value}</h3>
                <p className="text-muted-foreground">{stat.label}</p>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Featured Products</h2>
          <p className="text-xl text-muted-foreground">
            Discover our most popular items loved by customers
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProducts.map((product) => (
            <GlassCard key={product.id} className="group cursor-pointer" hover>
              <div 
                className="relative mb-4"
                onClick={() => navigate(`/products/${product.id}`)}
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
              </div>
              
              <div className="space-y-3">
                <h3 
                  className="text-xl font-semibold group-hover:text-primary transition-colors cursor-pointer"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  {product.name}
                </h3>
                
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(product);
                    }}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button size="lg" variant="outline" asChild>
            <Link to="/products">
              View All Products
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <FooterFrontend />
    </div>
  );
}