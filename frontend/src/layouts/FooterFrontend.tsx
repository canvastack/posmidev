import { Link } from 'react-router-dom';
import { useFooterContent } from '@/hooks/useFooterContent';

// Get tenant ID from environment variable (for public pages, use HQ tenant)
const DEFAULT_TENANT_ID = import.meta.env.VITE_HQ_TENANT_ID;

export function FooterFrontend() {
  const { footer, isLoading } = useFooterContent(DEFAULT_TENANT_ID);

  // Show minimal footer while loading
  if (isLoading) {
    return (
      <footer className="glass-card border-t mt-20" id="contact">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center text-muted-foreground">
            <p>Loading...</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="glass-card border-t mt-20" id="contact">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Branding Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {footer.branding.logo.charAt(0)}
                </span>
              </div>
              <span className="font-bold text-xl">{footer.branding.logo}</span>
            </div>
            <p className="text-muted-foreground">
              {footer.branding.tagline}
            </p>
          </div>
          
          {/* Dynamic Sections */}
          {footer.sections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2 text-muted-foreground">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    {link.url.startsWith('#') ? (
                      <a 
                        href={link.url} 
                        className="hover:text-primary transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : link.url.startsWith('http') ? (
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link 
                        to={link.url} 
                        className="hover:text-primary transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Copyright */}
        <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
          <p>{footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}