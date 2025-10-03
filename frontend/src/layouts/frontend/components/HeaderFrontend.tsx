import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { MegaMenu } from '@/layouts/frontend/components/MegaMenu';
import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HeaderFrontend() {
  return (
    <nav className="sticky top-0 z-40 w-full glass-card">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <MegaMenu />
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/products" className="text-muted-foreground hover:text-primary transition-colors">
              All Products
            </Link>
            <Link to="/company" className="text-muted-foreground hover:text-primary transition-colors">
              About
            </Link>
            <a 
              href="#contact"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Contact
            </a>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="outline" asChild>
              <Link to="/admin">Admin Panel</Link>
            </Button>
            <Button className="gradient-secondary text-white">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart (0)
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}