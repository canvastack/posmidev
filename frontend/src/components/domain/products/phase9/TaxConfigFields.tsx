/**
 * Phase 9: Tax Configuration Fields
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Uses design tokens from index.css
 * - Fully supports dark/light mode
 * - Responsive design
 */

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Card } from '@/components/ui/Card';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface TaxConfigFieldsProps {
  taxRate: number | null;
  taxInclusive: boolean;
  price: number;
  onTaxRateChange: (value: number | null) => void;
  onTaxInclusiveChange: (value: boolean) => void;
  errors?: {
    tax_rate?: string;
  };
  disabled?: boolean;
}

export function TaxConfigFields({
  taxRate,
  taxInclusive,
  price,
  onTaxRateChange,
  onTaxInclusiveChange,
  errors,
  disabled,
}: TaxConfigFieldsProps) {
  // Calculate tax breakdown
  const priceValue = Number(price) || 0;
  const taxRateValue = Number(taxRate) || 0;
  
  let priceWithoutTax = priceValue;
  let priceWithTax = priceValue;
  let taxAmount = 0;

  if (taxRateValue > 0) {
    if (taxInclusive) {
      // Price already includes tax, calculate breakdown
      priceWithoutTax = priceValue / (1 + taxRateValue / 100);
      taxAmount = priceValue - priceWithoutTax;
      priceWithTax = priceValue;
    } else {
      // Price excludes tax, calculate total
      priceWithoutTax = priceValue;
      taxAmount = priceValue * (taxRateValue / 100);
      priceWithTax = priceValue + taxAmount;
    }
  }

  const handleTaxRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      onTaxRateChange(null);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      onTaxRateChange(numValue);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Tax Configuration</Label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <InformationCircleIcon className="h-4 w-4" />
          <span>Optional</span>
        </div>
      </div>

      {/* Tax Rate Input */}
      <div className="space-y-2">
        <Label htmlFor="tax_rate">Tax Rate (%)</Label>
        <Input
          id="tax_rate"
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={taxRate ?? ''}
          onChange={handleTaxRateChange}
          placeholder="e.g., 10 for 10%"
          disabled={disabled}
          className={errors?.tax_rate ? 'border-danger-500 focus:ring-danger-500' : ''}
        />
        {errors?.tax_rate && (
          <p className="text-sm text-danger-600 dark:text-danger-400">{errors.tax_rate}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Enter tax rate as a percentage (0-100). Leave empty if no tax applies.
        </p>
      </div>

      {/* Tax Inclusive Toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
        <div className="space-y-0.5">
          <Label htmlFor="tax_inclusive" className="text-sm font-medium">
            Tax Inclusive
          </Label>
          <p className="text-xs text-muted-foreground">
            {taxInclusive 
              ? 'Price includes tax (tax is already in the price)' 
              : 'Price excludes tax (tax will be added at checkout)'}
          </p>
        </div>
        <Switch
          id="tax_inclusive"
          checked={taxInclusive}
          onCheckedChange={onTaxInclusiveChange}
          disabled={disabled || !taxRate}
        />
      </div>

      {/* Tax Breakdown Preview */}
      {taxRate && taxRate > 0 && priceValue > 0 && (
        <Card className="bg-muted/30 p-4">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Tax Breakdown</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price (without tax):</span>
                <span className="font-medium">${priceWithoutTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRateValue}%):</span>
                <span className="font-medium text-warning-600 dark:text-warning-400">
                  +${taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold">
                <span>Final Price (with tax):</span>
                <span className="text-primary">${priceWithTax.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}