import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  ShoppingBag, 
  Utensils, 
  Coffee, 
  Shirt, 
  Smartphone,
  ChevronDown,
  Star,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
  {
    icon: Utensils,
    title: 'Food & Beverages',
    description: 'Fresh ingredients and drinks',
    items: ['Fruits & Vegetables', 'Dairy Products', 'Beverages', 'Snacks'],
    featured: 'Fresh Organic Produce'
  },
  {
    icon: Coffee,
    title: 'Coffee & Tea',
    description: 'Premium coffee and tea selection',
    items: ['Espresso', 'Cold Brew', 'Tea Blends', 'Accessories'],
    featured: 'Artisan Coffee Beans'
  },
  {
    icon: Shirt,
    title: 'Fashion',
    description: 'Trendy clothing and accessories',
    items: ['Men\'s Wear', 'Women\'s Wear', 'Accessories', 'Shoes'],
    featured: 'Summer Collection'
  },
  {
    icon: Smartphone,
    title: 'Electronics',
    description: 'Latest tech and gadgets',
    items: ['Smartphones', 'Laptops', 'Accessories', 'Smart Home'],
    featured: 'Latest Smartphones'
  }
];

export function MegaMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="flex items-center gap-2 text-lg font-medium"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <ShoppingBag className="h-5 w-5" />
        Categories
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </Button>

      <div
        className={cn(
          "absolute top-full left-0 w-screen max-w-4xl glass-card border rounded-xl shadow-2xl transition-all duration-300 z-50",
          isOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-4"
        )}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div key={index} className="group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg gradient-secondary">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-4">
                    {category.items.map((item, itemIndex) => (
                      <li key={itemIndex}>
                        <Link 
                          to={`/products?category=${encodeURIComponent(item)}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors block py-1"
                        >
                          {item}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="glass border rounded-lg p-3 group-hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">Featured</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.featured}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span className="text-xs text-green-600">Trending</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="border-t mt-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold mb-1">Special Offers</h4>
                <p className="text-sm text-muted-foreground">
                  Get up to 30% off on selected items
                </p>
              </div>
              <Button className="gradient-secondary text-white">
                View All Deals
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}