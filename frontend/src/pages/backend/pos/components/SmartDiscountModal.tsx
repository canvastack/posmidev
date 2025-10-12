import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Percent, DollarSign, Tag, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';

/**
 * Smart Discount Modal Component
 * 
 * Features:
 * - Quick discount buttons (5%, 10%, 15%, 20%)
 * - Custom percentage discount
 * - Custom flat amount discount
 * - Promo code validation (if integrated with backend)
 * - Preview of discount amount
 * 
 * Design: Uses design tokens from index.css, fully responsive, dark mode support
 */

interface SmartDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  currentDiscount: number;
  currentDiscountType: 'percentage' | 'flat';
  onApplyDiscount: (amount: number, type: 'percentage' | 'flat') => void;
  onValidatePromo?: (code: string) => Promise<{ valid: boolean; amount: number; type: 'percentage' | 'flat'; message?: string }>;
}

export const SmartDiscountModal = ({
  isOpen,
  onClose,
  subtotal,
  currentDiscount,
  currentDiscountType,
  onApplyDiscount,
  onValidatePromo,
}: SmartDiscountModalProps) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>(currentDiscountType);
  const [customAmount, setCustomAmount] = useState(currentDiscount.toString());
  const [promoCode, setPromoCode] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [promoValid, setPromoValid] = useState<boolean | null>(null);

  const quickDiscounts = [5, 10, 15, 20, 25];

  const handleQuickDiscount = (percent: number) => {
    setDiscountType('percentage');
    setCustomAmount(percent.toString());
    setPromoCode('');
    setPromoMessage('');
    setPromoValid(null);
  };

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setCustomAmount(value);
      setPromoCode('');
      setPromoMessage('');
      setPromoValid(null);
    }
  };

  const handlePromoValidate = async () => {
    if (!promoCode.trim() || !onValidatePromo) return;

    setPromoValidating(true);
    setPromoMessage('');
    setPromoValid(null);

    try {
      const result = await onValidatePromo(promoCode.trim());
      
      if (result.valid) {
        setPromoValid(true);
        setDiscountType(result.type);
        setCustomAmount(result.amount.toString());
        setPromoMessage(result.message || 'Promo code applied successfully!');
      } else {
        setPromoValid(false);
        setPromoMessage(result.message || 'Invalid promo code');
      }
    } catch (error) {
      setPromoValid(false);
      setPromoMessage('Failed to validate promo code');
      console.error('Promo validation error:', error);
    } finally {
      setPromoValidating(false);
    }
  };

  const calculateDiscountAmount = () => {
    const amount = parseFloat(customAmount) || 0;
    
    if (discountType === 'percentage') {
      return subtotal * (amount / 100);
    }
    return Math.min(amount, subtotal); // Can't discount more than subtotal
  };

  const discountAmount = calculateDiscountAmount();
  const afterDiscount = Math.max(subtotal - discountAmount, 0);

  const handleApply = () => {
    const amount = parseFloat(customAmount) || 0;
    onApplyDiscount(amount, discountType);
    onClose();
  };

  const handleClearDiscount = () => {
    onApplyDiscount(0, 'percentage');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Discount"
      size="lg"
    >
      <div className="space-y-6">
        {/* Quick Discount Buttons */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Quick Discounts
          </label>
          <div className="grid grid-cols-5 gap-2">
            {quickDiscounts.map((percent) => (
              <Button
                key={percent}
                variant={customAmount === percent.toString() && discountType === 'percentage' ? 'default' : 'outline'}
                onClick={() => handleQuickDiscount(percent)}
                className="h-12"
              >
                <Percent className="h-4 w-4 mr-1" />
                {percent}%
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Discount */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Custom Discount
          </label>
          <div className="grid grid-cols-2 gap-3">
            {/* Percentage Input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant={discountType === 'percentage' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDiscountType('percentage')}
                  className="w-full"
                >
                  <Percent className="h-4 w-4 mr-2" />
                  Percentage
                </Button>
              </div>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="0"
                  value={discountType === 'percentage' ? customAmount : ''}
                  onChange={(e) => {
                    setDiscountType('percentage');
                    handleCustomAmountChange(e.target.value);
                  }}
                  className="pr-10"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Flat Amount Input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant={discountType === 'flat' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDiscountType('flat')}
                  className="w-full"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Flat Amount
                </Button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  Rp
                </span>
                <Input
                  type="text"
                  placeholder="0"
                  value={discountType === 'flat' ? customAmount : ''}
                  onChange={(e) => {
                    setDiscountType('flat');
                    handleCustomAmountChange(e.target.value);
                  }}
                  className="pl-12"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        {onValidatePromo && (
          <div>
            <label className="block text-sm font-medium mb-3">
              Promo Code
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handlePromoValidate()}
                  className="pl-10"
                  disabled={promoValidating}
                />
              </div>
              <Button
                onClick={handlePromoValidate}
                disabled={!promoCode.trim() || promoValidating}
                variant="outline"
              >
                {promoValidating ? 'Checking...' : 'Apply'}
              </Button>
            </div>
            
            {promoMessage && (
              <div className={`mt-2 p-3 rounded-lg flex items-start gap-2 text-sm ${
                promoValid 
                  ? 'bg-success-50 dark:bg-success-950/20 text-success-700 dark:text-success-400'
                  : 'bg-danger-50 dark:bg-danger-950/20 text-danger-700 dark:text-danger-400'
              }`}>
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{promoMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Discount Preview */}
        <div className="bg-muted/30 p-4 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-semibold text-success-600 dark:text-success-400">
              -{formatCurrency(discountAmount)}
              {discountAmount > 0 && (
                <span className="text-xs ml-1">
                  ({discountType === 'percentage' ? `${customAmount}%` : 'Flat'})
                </span>
              )}
            </span>
          </div>
          <div className="h-px bg-border my-2" />
          <div className="flex justify-between">
            <span className="font-semibold">Total After Discount</span>
            <span className="font-bold text-lg text-primary-600 dark:text-primary-400">
              {formatCurrency(afterDiscount)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClearDiscount}
            disabled={currentDiscount === 0}
          >
            Clear Discount
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
            onClick={handleApply}
            disabled={!customAmount || parseFloat(customAmount) === 0}
          >
            Apply Discount
          </Button>
        </div>
      </div>
    </Modal>
  );
};