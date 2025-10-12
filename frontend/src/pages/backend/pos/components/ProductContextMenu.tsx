import { useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Eye,
  Package,
  Star,
  TrendingUp,
  Edit,
  X,
  ChefHat,
} from 'lucide-react';

/**
 * ProductContextMenu Component
 * 
 * Phase 3a Feature 3: Product Quick Actions
 * 
 * Features:
 * - Right-click context menu for desktop
 * - Long-press (500ms) support for mobile/touch
 * - Quick actions: Add to Cart, Quick View, Check Stock, Favorites, Price History
 * - Admin-only: Edit Product
 * - Auto-close on outside click or ESC
 * - Positioned near cursor/touch point
 * 
 * Design Compliance:
 * ✅ Glass card with backdrop blur
 * ✅ Design tokens from index.css
 * ✅ Dark/light mode via CSS variables
 * ✅ Touch-friendly (48px min height per action)
 * ✅ Semantic colors for actions
 * 
 * @example
 * <ProductContextMenu
 *   isOpen={showMenu}
 *   position={{ x: 100, y: 200 }}
 *   productId="uuid"
 *   productName="Product Name"
 *   onClose={() => setShowMenu(false)}
 *   onQuickAdd={() => addToCart()}
 *   onQuickView={() => openQuickView()}
 *   onCheckStock={() => checkStock()}
 *   onAddToFavorites={() => addFavorite()}
 *   onPriceHistory={() => showHistory()}
 *   onEditProduct={() => editProduct()} // Admin only
 *   canEdit={hasPermission}
 * />
 */

interface ProductContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  productId: string;
  productName: string;
  onClose: () => void;
  onQuickAdd: () => void;
  onQuickView: () => void;
  onCheckStock?: () => void;
  onViewRecipe?: () => void; // Phase 3b: BOM Integration
  onAddToFavorites?: () => void;
  onPriceHistory?: () => void;
  onEditProduct?: () => void;
  canEdit?: boolean;
}

interface MenuAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
  divider?: boolean;
  adminOnly?: boolean;
}

export function ProductContextMenu({
  isOpen,
  position,
  productId,
  productName,
  onClose,
  onQuickAdd,
  onQuickView,
  onCheckStock,
  onViewRecipe,
  onAddToFavorites,
  onPriceHistory,
  onEditProduct,
  canEdit = false,
}: ProductContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Build actions list
  const actions: MenuAction[] = [
    {
      id: 'quick-add',
      label: 'Quick Add to Cart',
      icon: <ShoppingCart className="h-4 w-4" />,
      onClick: () => {
        onQuickAdd();
        onClose();
      },
      color: 'text-success-600 dark:text-success-400',
    },
    {
      id: 'quick-view',
      label: 'Quick View',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => {
        onQuickView();
        onClose();
      },
      color: 'text-info-600 dark:text-info-400',
    },
  ];

  // Optional actions
  if (onCheckStock) {
    actions.push({
      id: 'check-stock',
      label: 'Check Stock',
      icon: <Package className="h-4 w-4" />,
      onClick: () => {
        onCheckStock();
        onClose();
      },
      color: 'text-warning-600 dark:text-warning-400',
    });
  }
  
  // Phase 3b: View Recipe action
  if (onViewRecipe) {
    actions.push({
      id: 'view-recipe',
      label: 'View Recipe / BOM',
      icon: <ChefHat className="h-4 w-4" />,
      onClick: () => {
        onViewRecipe();
        onClose();
      },
      color: 'text-primary-600 dark:text-primary-400',
    });
  }

  if (onAddToFavorites) {
    actions.push({
      id: 'add-favorites',
      label: 'Add to Favorites',
      icon: <Star className="h-4 w-4" />,
      onClick: () => {
        onAddToFavorites();
        onClose();
      },
      color: 'text-accent-600 dark:text-accent-400',
    });
  }

  if (onPriceHistory) {
    actions.push({
      id: 'price-history',
      label: 'Price History',
      icon: <TrendingUp className="h-4 w-4" />,
      onClick: () => {
        onPriceHistory();
        onClose();
      },
      color: 'text-primary-600 dark:text-primary-400',
    });
  }

  // Admin actions
  if (canEdit && onEditProduct) {
    actions.push({
      id: 'edit-product',
      label: 'Edit Product',
      icon: <Edit className="h-4 w-4" />,
      onClick: () => {
        onEditProduct();
        onClose();
      },
      color: 'text-muted-foreground',
      divider: true,
      adminOnly: true,
    });
  }

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Small delay to prevent immediate close from the opening click
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Adjust position to keep menu in viewport
  const getAdjustedPosition = () => {
    if (!menuRef.current) return position;

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y;

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 10;
    }

    // Minimum margins
    x = Math.max(10, x);
    y = Math.max(10, y);

    return { x, y };
  };

  if (!isOpen) return null;

  const adjustedPosition = getAdjustedPosition();

  return (
    <>
      {/* Backdrop - semi-transparent */}
      <div
        className="fixed inset-0 z-[60]"
        onClick={onClose}
        style={{ background: 'transparent' }}
      />

      {/* Context Menu */}
      <div
        ref={menuRef}
        className="fixed z-[70] glass-card border rounded-xl shadow-2xl backdrop-blur-xl"
        style={{
          left: `${adjustedPosition.x}px`,
          top: `${adjustedPosition.y}px`,
          minWidth: '220px',
          maxWidth: '280px',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-0.5">Product Actions</p>
            <p className="text-sm font-medium truncate" title={productName}>
              {productName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded-md hover:bg-muted/50 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Actions List */}
        <div className="py-2">
          {actions.map((action, index) => (
            <div key={action.id}>
              {/* Divider for admin section */}
              {action.divider && (
                <div className="my-2 border-t border-border/50" />
              )}

              {/* Action Button */}
              <button
                onClick={action.onClick}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left group"
                style={{ minHeight: '48px' }} // Touch-friendly
              >
                <span className={`${action.color || 'text-foreground'} transition-colors`}>
                  {action.icon}
                </span>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {action.label}
                </span>
                {action.adminOnly && (
                  <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border/50 bg-muted/20">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 bg-background rounded border text-xs">ESC</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
}