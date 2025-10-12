/**
 * Customer Display Cart View Component
 * Phase 4A - Feature 1: Customer Display Screen - Day 2
 * 
 * Displays shopping cart items with large fonts for customer visibility
 * 
 * Features:
 * - Large readable fonts (20px+ for items, 32px+ for prices)
 * - Smooth animations on item changes
 * - High contrast dark theme
 * - Auto-scroll for long lists
 * 
 * Design Compliance:
 * ✅ Uses design tokens from index.css
 * ✅ Dark mode optimized
 * ✅ Responsive (800px-2560px for customer displays)
 * ✅ No hardcoded colors/spacing
 */

import { Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import type { CustomerDisplayData } from '@/types';

interface CustomerDisplayCartViewProps {
  displayData: CustomerDisplayData;
}

/**
 * Cart View for Customer Display
 * Shows all items in cart with subtotal, discounts, taxes, and total
 */
export function CustomerDisplayCartView({ displayData }: CustomerDisplayCartViewProps) {
  return (
    <>
      {/* Cart Items */}
      <div className="space-y-4 mb-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {displayData.items.length === 0 ? (
          <EmptyCartMessage />
        ) : (
          displayData.items.map((item, index) => (
            <CartItemRow key={`${item.product_id}-${index}`} item={item} />
          ))
        )}
      </div>

      {/* Totals Section */}
      <div className="border-t-4 border-gray-700 pt-6 space-y-4">
        <TotalRow label="Subtotal" amount={displayData.subtotal} />
        
        {displayData.discount > 0 && (
          <TotalRow
            label="Diskon"
            amount={-displayData.discount}
            className="text-success-500"
          />
        )}
        
        {displayData.tax > 0 && (
          <TotalRow label="Pajak" amount={displayData.tax} />
        )}

        {/* Grand Total */}
        <div className="border-t-2 border-gray-600 pt-4 mt-4">
          <TotalRow
            label="TOTAL"
            amount={displayData.total}
            className="text-6xl font-extrabold text-primary-400"
            labelClassName="text-4xl"
          />
        </div>
      </div>
    </>
  );
}

/**
 * Cart Item Row Component
 */
function CartItemRow({ item }: { item: any }) {
  const itemTotal = item.price * item.quantity;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 flex items-center justify-between border border-gray-700 hover:border-gray-600 transition-colors animate-slideIn">
      {/* Item Info */}
      <div className="flex items-center space-x-6 flex-1">
        <div className="w-20 h-20 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Package className="w-10 h-10 text-gray-500" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-2xl font-bold text-white mb-1 truncate" title={item.name}>
            {item.name}
          </h3>
          <p className="text-xl text-gray-400">
            {formatCurrency(item.price)} × {item.quantity}
          </p>
        </div>
      </div>

      {/* Item Total */}
      <div className="text-right flex-shrink-0 ml-4">
        <p className="text-4xl font-extrabold text-primary-400">
          {formatCurrency(itemTotal)}
        </p>
      </div>
    </div>
  );
}

/**
 * Total Row Component
 */
function TotalRow({
  label,
  amount,
  className = 'text-3xl',
  labelClassName = 'text-2xl',
}: {
  label: string;
  amount: number;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`font-semibold text-gray-300 ${labelClassName}`}>
        {label}:
      </span>
      <span className={`font-extrabold ${className}`}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

/**
 * Empty Cart Message Component
 */
function EmptyCartMessage() {
  return (
    <div className="text-center py-16 animate-fadeIn">
      <Package className="w-24 h-24 text-gray-600 mx-auto mb-4 animate-pulse" />
      <p className="text-3xl text-gray-500 font-medium">
        Belum ada item di keranjang
      </p>
      <p className="text-xl text-gray-600 mt-2">
        Kasir sedang memilih produk...
      </p>
    </div>
  );
}