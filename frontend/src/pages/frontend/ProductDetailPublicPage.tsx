import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HeaderFrontend } from '../../components/layout/HeaderFrontend';
import { FooterFrontend } from '../../layouts/FooterFrontend';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeft,
  Star, 
  ShoppingCart, 
  Heart,
  Share2,
  Plus,
  Minus,
  CheckCircle,
  Truck,
  Shield,
  RotateCcw
} from 'lucide-react';

// Mock product data - in real app this would come from API
const productData: Record<string, any> = {
  '1': {
    id: '1',
    name: 'Premium Coffee Blend',
    price: 24.99,
    originalPrice: 29.99,
    images: [
      'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=600&fit=crop'
    ],
    rating: 4.8,
    reviews: 124,
    category: 'Coffee & Tea',
    badge: 'Best Seller',
    inStock: true,
    stock: 50,
    description: 'Our signature premium coffee blend combines the finest Arabica beans from Colombia and Ethiopia. Carefully roasted to perfection, this medium-dark roast delivers a rich, full-bodied flavor with notes of chocolate and caramel.',
    features: [
      '100% Arabica beans',
      'Medium-dark roast',
      'Single origin blend',
      'Ethically sourced',
      'Fresh roasted weekly'
    ],
    specifications: {
      'Origin': 'Colombia & Ethiopia',
      'Roast Level': 'Medium-Dark',
      'Weight': '12 oz (340g)',
      'Grind': 'Whole Bean',
      'Caffeine': 'Regular'
    }
  },
  '2': {
    id: '2',
    name: 'Organic Green Tea',
    price: 18.99,
    originalPrice: 22.99,
    images: [
      'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=600&fit=crop',
      'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&h=600&fit=crop'
    ],
    rating: 4.6,
    reviews: 89,
    category: 'Coffee & Tea',
    badge: 'Organic',
    inStock: true,
    stock: 30,
    description: 'Premium organic green tea sourced from the hills of Darjeeling. This delicate tea offers a light, refreshing taste with subtle floral notes and natural antioxidants.',
    features: [
      'USDA Organic certified',
      'High in antioxidants',
      'Light floral notes',
      'Sustainably harvested',
      'Loose leaf tea'
    ],
    specifications: {
      'Origin': 'Darjeeling, India',
      'Type': 'Green Tea',
      'Weight': '4 oz (113g)',
      'Caffeine': 'Low',
      'Organic': 'Yes'
    }
  },
  '3': {
    id: '3',
    name: 'Artisan Chocolate',
    price: 32.99,
    originalPrice: 39.99,
    images: [
      'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=600&h=600&fit=crop'
    ],
    rating: 4.9,
    reviews: 156,
    category: 'Food & Beverages',
    badge: 'Premium',
    inStock: true,
    stock: 25,
    description: 'Handcrafted artisan chocolate made from premium cacao beans. Each bar is carefully crafted to deliver an exceptional taste experience.',
    features: [
      'Single-origin cacao',
      'Handcrafted in small batches',
      'No artificial ingredients',
      'Fair trade certified',
      'Rich, complex flavor'
    ],
    specifications: {
      'Origin': 'Ecuador',
      'Cacao Content': '70%',
      'Weight': '3.5 oz (100g)',
      'Type': 'Dark Chocolate',
      'Allergens': 'May contain nuts'
    }
  }
};

export default function ProductDetailPublicPage() {
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');

  const product = productData[id as string];

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product Not Found</h2>
          <Button asChild>
            <Link to="/products">Back to Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (change: number) => {
    const newQuantity = quantity + change;
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div className="min-h-screen">
      <HeaderFrontend />
      
      {/* Navigation */}
      <nav className="glass-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors">
              Products
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-primary">{product.name}</span>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <Button variant="ghost" className="mb-6" asChild>
          <Link to="/products">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Link>
        </Button>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <GlassCard className="p-4">
              <div className="aspect-square rounded-xl overflow-hidden mb-4">
                <img 
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {product.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img 
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <Badge className="gradient-secondary text-white mb-3">
                {product.badge}
              </Badge>
              <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{product.rating}</span>
                </div>
                <span className="text-muted-foreground">({product.reviews} reviews)</span>
                <Badge variant="outline">{product.category}</Badge>
              </div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl font-bold">${product.price}</span>
                <span className="text-xl text-muted-foreground line-through">${product.originalPrice}</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Save ${(product.originalPrice - product.price).toFixed(2)}
                </Badge>
              </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-600">In Stock ({product.stock} available)</span>
            </div>

            {/* Quantity Selector */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button size="lg" className="w-full gradient-secondary text-white">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart - ${(product.price * quantity).toFixed(2)}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" size="lg">
                  <Heart className="h-5 w-5 mr-2" />
                  Wishlist
                </Button>
                <Button variant="outline" size="lg">
                  <Share2 className="h-5 w-5 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Features */}
            <GlassCard>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Truck className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium">Free Shipping</p>
                    <p className="text-sm text-muted-foreground">On orders over $50</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium">Quality Guarantee</p>
                    <p className="text-sm text-muted-foreground">100% satisfaction</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-6 w-6 text-purple-500" />
                  <div>
                    <p className="font-medium">Easy Returns</p>
                    <p className="text-sm text-muted-foreground">30-day policy</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Product Details Tabs */}
        <GlassCard>
          <div className="border-b mb-6">
            <div className="flex gap-8">
              {[
                { id: 'description', label: 'Description' },
                { id: 'features', label: 'Features' },
                { id: 'specifications', label: 'Specifications' },
                { id: 'reviews', label: 'Reviews' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 font-medium transition-colors ${
                    activeTab === tab.id 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-muted-foreground hover:text-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-[200px]">
            {activeTab === 'description' && (
              <div className="prose max-w-none">
                <p className="text-lg leading-relaxed">{product.description}</p>
              </div>
            )}

            {activeTab === 'features' && (
              <div className="space-y-3">
                {product.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="grid md:grid-cols-2 gap-6">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b">
                    <span className="font-medium">{key}:</span>
                    <span className="text-muted-foreground">{value as string}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                    <span className="text-2xl font-bold">{product.rating}</span>
                  </div>
                  <p className="text-muted-foreground">Based on {product.reviews} reviews</p>
                </div>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Reviews feature coming soon!</p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <FooterFrontend />
    </div>
  );
}