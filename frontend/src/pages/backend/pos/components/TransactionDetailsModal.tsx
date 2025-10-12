import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/currency';
import type { Order } from '@/types';
import {
  Receipt,
  User,
  CreditCard,
  Calendar,
  Clock,
  Package,
  Percent,
  DollarSign,
  Printer,
  XCircle,
  MapPin,
} from 'lucide-react';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Order;
  onReprint: () => void;
  onVoid: () => void;
}

export const TransactionDetailsModal = ({
  isOpen,
  onClose,
  transaction,
  onReprint,
  onVoid,
}: TransactionDetailsModalProps) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
  };

  const { date, time } = formatDateTime(transaction.created_at);

  const getPaymentMethodColor = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'card':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'qris':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'split':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Transaction Details - #${transaction.order_number}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Transaction Header */}
        <div className="glass-card p-4 rounded-lg border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Order Number */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary-100 dark:bg-primary-900">
                <Receipt className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Order Number</p>
                <p className="font-semibold text-sm">#{transaction.order_number}</p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900">
                <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="font-semibold text-sm">{date.split(',')[0]}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-100 dark:bg-purple-900">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Time</p>
                <p className="font-semibold text-sm">{time}</p>
              </div>
            </div>

            {/* Payment Method */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-100 dark:bg-green-900">
                <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Payment</p>
                <Badge className={`text-xs ${getPaymentMethodColor(transaction.payment_method || '')}`}>
                  {transaction.payment_method || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        {transaction.customer_name && (
          <div className="glass-card p-4 rounded-lg border">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-1">Name</p>
                <p className="font-medium">{transaction.customer_name}</p>
              </div>
              {transaction.customer_phone && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Phone</p>
                  <p className="font-medium">{transaction.customer_phone}</p>
                </div>
              )}
              {transaction.customer_email && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Email</p>
                  <p className="font-medium">{transaction.customer_email}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className="glass-card p-4 rounded-lg border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Order Items ({transaction.items?.length || 0})
          </h3>
          <div className="space-y-2">
            {transaction.items && transaction.items.length > 0 ? (
              transaction.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-md bg-background/50 border"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.product_name || 'Unknown Product'}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.price || 0)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      {formatCurrency((item.price || 0) * (item.quantity || 0))}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No items found</p>
            )}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="glass-card p-4 rounded-lg border">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Payment Summary
          </h3>
          <div className="space-y-2">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">
                {formatCurrency(transaction.subtotal || 0)}
              </span>
            </div>

            {/* Discount */}
            {transaction.discount_amount && transaction.discount_amount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Discount
                  {transaction.discount_percentage && (
                    <span className="text-xs">({transaction.discount_percentage}%)</span>
                  )}
                </span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  -{formatCurrency(transaction.discount_amount)}
                </span>
              </div>
            )}

            {/* Tax */}
            {transaction.tax_amount && transaction.tax_amount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Tax
                  {transaction.tax_percentage && (
                    <span className="text-xs"> ({transaction.tax_percentage}%)</span>
                  )}
                </span>
                <span className="font-medium">
                  {formatCurrency(transaction.tax_amount)}
                </span>
              </div>
            )}

            {/* Divider */}
            <div className="border-t pt-2 mt-2" />

            {/* Final Total */}
            <div className="flex items-center justify-between text-base">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
                {formatCurrency(transaction.final_total || 0)}
              </span>
            </div>

            {/* Amount Paid & Change (if available) */}
            {transaction.amount_paid && transaction.amount_paid > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-medium">
                    {formatCurrency(transaction.amount_paid)}
                  </span>
                </div>
                {transaction.change_amount && transaction.change_amount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Change</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(transaction.change_amount)}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            <p>Transaction ID: {transaction.id}</p>
            <p>Status: <Badge variant="success">{transaction.status}</Badge></p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReprint}
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Reprint Receipt
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onVoid}
              className="flex items-center gap-2 text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-4 w-4" />
              Void Transaction
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};