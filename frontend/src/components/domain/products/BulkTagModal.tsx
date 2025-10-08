import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { productTagApi } from '@/api/productTagApi';
import { TagMultiSelect } from './phase9/TagMultiSelect';

interface BulkTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  onSuccess: () => void;
  mode: 'add' | 'remove';
}

export const BulkTagModal: React.FC<BulkTagModalProps> = ({
  isOpen,
  onClose,
  productIds,
  onSuccess,
  mode,
}) => {
  const { tenantId } = useAuth();
  const { toast } = useToast();
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!tenantId) return;
    if (tagIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one tag',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'add') {
        await productTagApi.bulkAttachTags(tenantId, {
          product_ids: productIds,
          tag_ids: tagIds,
        });
        toast({
          title: 'Success',
          description: `Successfully added ${tagIds.length} tag(s) to ${productIds.length} product(s)`,
        });
      } else {
        await productTagApi.bulkDetachTags(tenantId, {
          product_ids: productIds,
          tag_ids: tagIds,
        });
        toast({
          title: 'Success',
          description: `Successfully removed ${tagIds.length} tag(s) from ${productIds.length} product(s)`,
        });
      }

      onSuccess();
      onClose();
      setTagIds([]);
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast({
        title: 'Error',
        description: 'Failed to update tags. Please try again.',
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
      title={mode === 'add' ? 'Add Tags' : 'Remove Tags'}
      description={`${mode === 'add' ? 'Add tags to' : 'Remove tags from'} ${productIds.length} selected product(s)`}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Tags *
          </label>
          <TagMultiSelect
            value={tagIds}
            onChange={setTagIds}
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
            disabled={tagIds.length === 0}
          >
            {mode === 'add' ? 'Add Tags' : 'Remove Tags'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};