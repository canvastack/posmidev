import { useCartStore } from '@/stores/cartStore';
import { ParkedOrderCard } from './ParkedOrderCard';
import { Package, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const ParkedOrdersPanel = () => {
  const { parkedOrders, restoreOrder, removeParkedOrder } = useCartStore();

  if (parkedOrders.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl border border-dashed">
        <div className="text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium mb-1">No Parked Orders</p>
          <p className="text-xs">
            Press <kbd className="px-2 py-1 text-xs border rounded bg-muted">F8</kbd> to park current order
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Parked Orders
        </h4>
        <Badge variant="info" className="text-xs">
          {parkedOrders.length} {parkedOrders.length === 1 ? 'order' : 'orders'}
        </Badge>
      </div>

      {/* Warning if too many */}
      {parkedOrders.length >= 5 && (
        <div className="flex items-start gap-2 p-3 bg-warning-500/10 border border-warning-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-warning-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-warning-700 dark:text-warning-400">
            You have {parkedOrders.length} parked orders. Consider completing some to keep the list manageable.
          </p>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        {parkedOrders.map((order) => (
          <ParkedOrderCard
            key={order.id}
            order={order}
            onRestore={() => restoreOrder(order.id)}
            onRemove={() => removeParkedOrder(order.id)}
          />
        ))}
      </div>
    </div>
  );
};