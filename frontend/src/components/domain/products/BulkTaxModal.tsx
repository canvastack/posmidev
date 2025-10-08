import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { productApi } from '@/api/productApi';
import { TaxConfigFields } from './phase9/TaxConfigFields';

interface BulkTaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  onSuccess: () => void;
}

export const BulkTaxModal: React.FC<BulkTaxModalProps> = ({
  isOpen,
  onClose,
  productIds,
  onSuccess,
}) => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [taxRate, setTaxRate] = useState<number | null>(null);
  const [taxInclusive, setTaxInclusive] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!tenantId) return;
    if (taxRate === null || taxRate < 0 || taxRate > 100) {
      toast({
        title: 'Error',
        description: 'Please enter a valid tax rate (0-100%)',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Bulk update all selected products
      await Promise.all(
        productIds.map((productId) =>
          productApi.updateProduct(tenantId, productId, {
            tax_rate: taxRate,
            tax_inclusive: taxInclusive,
          })
        )
      );

      toast({
        title: 'Success',
        description: `Successfully updated tax settings for ${productIds.length} product(s)`,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update tax settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tax settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Tax Settings"
      description={`Update tax configuration for ${productIds.length} selected product(s)`}
    >
      <div className="space-y-4">
        <TaxConfigFields
          taxRate={taxRate}
          taxInclusive={taxInclusive}
          onTaxRateChange={setTaxRate}
          onTaxInclusiveChange={setTaxInclusive}
        />

        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={taxRate === null || taxRate < 0 || taxRate > 100}
          >
            Update Tax Settings
          </Button>
        </div>
      </div>
    </Modal>
  );
};