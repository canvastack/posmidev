import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CreditCard, DollarSign, QrCode, Plus, Trash2, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

/**
 * Split Payment Modal Component
 * 
 * Features:
 * - Multiple payment methods in single transaction
 * - Real-time calculation of remaining balance
 * - Validation to ensure total paid >= bill amount
 * - Support for Cash, Card, and QRIS
 * - Visual feedback for payment progress
 * 
 * Design: Clean, intuitive interface with progress indicator
 */

interface SplitPaymentItem {
  id: string;
  method: 'Cash' | 'Card' | 'QRIS';
  amount: number;
}

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onComplete: (payments: SplitPaymentItem[], change: number) => void;
}

const PAYMENT_METHODS = [
  { 
    value: 'Cash' as const, 
    label: 'Cash', 
    icon: DollarSign, 
    color: 'bg-green-600 hover:bg-green-700',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  { 
    value: 'Card' as const, 
    label: 'Card', 
    icon: CreditCard, 
    color: 'bg-blue-600 hover:bg-blue-700',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  { 
    value: 'QRIS' as const, 
    label: 'QRIS', 
    icon: QrCode, 
    color: 'bg-purple-600 hover:bg-purple-700',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
];

export const SplitPaymentModal = ({
  isOpen,
  onClose,
  totalAmount,
  onComplete,
}: SplitPaymentModalProps) => {
  const [payments, setPayments] = useState<SplitPaymentItem[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<'Cash' | 'Card' | 'QRIS'>('Cash');
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalAmount - totalPaid;
  const change = Math.max(0, totalPaid - totalAmount);
  const isComplete = totalPaid >= totalAmount;
  const progress = Math.min((totalPaid / totalAmount) * 100, 100);

  const handleAddPayment = () => {
    const parsedAmount = parseFloat(amount);
    
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parsedAmount > remaining) {
      // Auto-adjust to remaining amount
      const adjustedAmount = remaining;
      setPayments([
        ...payments,
        {
          id: `payment-${Date.now()}`,
          method: selectedMethod,
          amount: adjustedAmount,
        },
      ]);
    } else {
      setPayments([
        ...payments,
        {
          id: `payment-${Date.now()}`,
          method: selectedMethod,
          amount: parsedAmount,
        },
      ]);
    }

    setAmount('');
  };

  const handleRemovePayment = (id: string) => {
    setPayments(payments.filter((p) => p.id !== id));
  };

  const handleQuickAmount = (percent: number) => {
    const quickAmount = (remaining * percent) / 100;
    setAmount(quickAmount.toString());
  };

  const handleComplete = () => {
    if (!isComplete) {
      alert('Total paid is less than bill amount');
      return;
    }

    setProcessing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      onComplete(payments, change);
      setProcessing(false);
      handleReset();
    }, 500);
  };

  const handleReset = () => {
    setPayments([]);
    setAmount('');
    setSelectedMethod('Cash');
  };

  const getMethodConfig = (method: 'Cash' | 'Card' | 'QRIS') => {
    return PAYMENT_METHODS.find((m) => m.value === method);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Split Payment"
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="bg-muted/30 p-4 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Payment Progress</span>
            <span className="font-semibold">
              {formatCurrency(totalPaid)} / {formatCurrency(totalAmount)}
            </span>
          </div>
          
          <div className="h-3 bg-muted/50 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isComplete 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-r from-blue-500 to-purple-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Remaining: </span>
              <span className={`font-bold ${remaining <= 0 ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'}`}>
                {formatCurrency(remaining)}
              </span>
            </div>
            {change > 0 && (
              <div className="text-sm">
                <span className="text-muted-foreground">Change: </span>
                <span className="font-bold text-success-600 dark:text-success-400">
                  {formatCurrency(change)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Added Payments List */}
        {payments.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Payment Methods ({payments.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {payments.map((payment, index) => {
                const config = getMethodConfig(payment.method);
                const Icon = config?.icon || DollarSign;
                
                return (
                  <div
                    key={payment.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-background/50"
                  >
                    <div className={`p-2 rounded-lg bg-muted/30`}>
                      <Icon className={`h-4 w-4 ${config?.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        Payment #{index + 1} - {payment.method}
                      </p>
                      <p className="text-lg font-bold">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePayment(payment.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Payment Section */}
        {!isComplete && (
          <div className="space-y-4 p-4 border-2 border-dashed rounded-lg">
            <label className="block text-sm font-medium">
              Add Payment Method
            </label>
            
            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <Button
                    key={method.value}
                    variant={selectedMethod === method.value ? 'default' : 'outline'}
                    onClick={() => setSelectedMethod(method.value)}
                    className="h-16 flex-col gap-1"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{method.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPayment()}
                  className="pl-12 text-lg h-12"
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(25)}
              >
                25%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(50)}
              >
                50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(75)}
              >
                75%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAmount(remaining.toString())}
              >
                Full
              </Button>
            </div>

            {/* Add Button */}
            <Button
              className="w-full bg-primary-600 hover:bg-primary-700 text-white"
              onClick={handleAddPayment}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </div>
        )}

        {/* Complete Transaction */}
        {isComplete && (
          <div className="bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 dark:bg-success-900 rounded-full">
                <Check className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-success-900 dark:text-success-100">
                  Payment Complete!
                </h4>
                <p className="text-sm text-success-700 dark:text-success-300">
                  Total paid: {formatCurrency(totalPaid)}
                  {change > 0 && ` • Change: ${formatCurrency(change)}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              if (payments.length > 0) {
                if (confirm('Discard all payments and close?')) {
                  handleReset();
                  onClose();
                }
              } else {
                onClose();
              }
            }}
          >
            Cancel
          </Button>
          
          {payments.length > 0 && !isComplete && (
            <Button
              variant="outline"
              onClick={handleReset}
            >
              Reset
            </Button>
          )}
          
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleComplete}
            disabled={!isComplete || processing}
          >
            {processing ? (
              'Processing...'
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete Transaction
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};