import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';

/**
 * Mobile Cart Button - Phase 3a Feature 2
 * 
 * Floating action button untuk toggle cart panel di mobile view.
 * 
 * Features:
 * - Fixed bottom-right position
 * - Item count badge
 * - Pulse animation when items > 0
 * - Touch-optimized size (56px)
 * - Shadow elevation untuk visibility
 * 
 * Design Compliance:
 * ✅ Touch-friendly size (56x56px, exceeds 44px WCAG)
 * ✅ Dark/light mode support
 * ✅ Gradient primary background
 * ✅ Accessible with proper z-index
 */

interface MobileCartButtonProps {
  itemCount: number;
  onClick: () => void;
}

export function MobileCartButton({ itemCount, onClick }: MobileCartButtonProps) {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-20 right-6 z-30 md:hidden w-14 h-14 rounded-full gradient-primary shadow-2xl hover:shadow-3xl transition-all duration-300 p-0"
      style={{
        animation: itemCount > 0 ? 'pulse 2s infinite' : 'none',
      }}
    >
      <div className="relative">
        <ShoppingCart className="h-6 w-6 text-white" />
        {itemCount > 0 && (
          <Badge
            className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {itemCount > 99 ? '99+' : itemCount}
          </Badge>
        )}
      </div>

      {/* Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
        }
      `}</style>
    </Button>
  );
}