import { Link } from 'react-router-dom';

export function FooterFrontend() {
  return (
    <footer className="glass-card border-t mt-20" id="contact">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="font-bold text-xl">POSMID</span>
            </div>
            <p className="text-muted-foreground">
              The future of retail with modern point of sale solutions.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Products</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/products?category=Food" className="hover:text-primary transition-colors">Food & Beverages</Link></li>
              <li><Link to="/products?category=Coffee" className="hover:text-primary transition-colors">Coffee & Tea</Link></li>
              <li><Link to="/products?category=Fashion" className="hover:text-primary transition-colors">Fashion</Link></li>
              <li><Link to="/products?category=Electronics" className="hover:text-primary transition-colors">Electronics</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/company" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
              <li><Link to="/admin" className="hover:text-primary transition-colors">Admin Panel</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>&copy; 2024 POSMID. All rights reserved. Built with ❤️ using React & Tailwind CSS.</p>
        </div>
      </div>
    </footer>
  );
}