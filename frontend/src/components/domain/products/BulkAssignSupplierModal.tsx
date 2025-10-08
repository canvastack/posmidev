import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { productApi } from '@/api/productApi';
import { SupplierSelector } from './phase9/SupplierSelector';

interface BulkAssignSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  onSuccess: () => void;
}

export const BulkAssignSupplierModal: React.FC<BulkAssignSupplierModalProps> = ({
  isOpen,
  onClose,
  productIds,
  onSuccess,
}) => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!tenantId) return;
    if (!supplierId) {
      toast({
        title: 'Error',
        description: 'Please select a supplier',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      // Bulk update all selected products
      await Promise.all(
        productIds.map((productId) =>
          productApi.updateProduct(tenantId, productId, { supplier_id: supplierId })
        )
      );

      toast({
        title: 'Success',
        description: `Successfully assigned supplier to ${productIds.length} product(s)`,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to assign supplier:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign supplier. Please try again.',
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
      title="Assign Supplier"
      description={`Assign a supplier to ${productIds.length} selected product(s)`}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Supplier *
          </label>
          <SupplierSelector
            value={supplierId}
            onChange={setSupplierId}
          />
        </div>

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
            disabled={!supplierId}
          >
            Assign Supplier
          </Button>
        </div>
      </div>
    </Modal>
  );
};