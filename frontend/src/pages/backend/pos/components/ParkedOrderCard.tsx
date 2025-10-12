import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { RotateCcw, Trash2, Clock, ShoppingCart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { CartItem } from '@/types';

interface ParkedOrderCardProps {
  order: {
    id: string;
    items: CartItem[];
    timestamp: number;
    discount: number;
    discountType: 'percentage' | 'flat';
    customerName?: string;
    notes?: string;
  };
  onRestore: () => void;
  onRemove: () => void;
}

export const ParkedOrderCard = ({ order, onRestore, onRemove }: ParkedOrderCardProps) => {
  const itemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const timeAgo = formatDistanceToNow(new Date(order.timestamp), { addSuffix: true });
  
  // Calculate totals
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const discountAmount = order.discountType === 'percentage'
    ? subtotal * (order.discount / 100)
    : order.discount;
  const finalTotal = subtotal - discountAmount;

  return (
    <div className="glass-card p-3 border rounded-lg hover:border-primary/50 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              #{order.id.slice(0, 8)}
            </Badge>
            {order.customerName && (
              <Badge variant="secondary" className="text-xs">
                {order.customerName}
              </Badge>
            )}
          </div>
          {order.notes && (
            <p className="text-xs text-muted-foreground truncate">
              {order.notes}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>{itemsCount} items</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">Total:</span>
        <span className="text-base font-bold text-primary">
          {formatCurrency(finalTotal)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
          onClick={onRestore}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restore
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};