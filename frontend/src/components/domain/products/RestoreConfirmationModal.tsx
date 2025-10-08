/**
 * Restore Confirmation Modal
 * Phase 11: Archive & Soft Delete
 * 
 * Compliance:
 * - Uses design tokens from index.css
 * - Supports dark/light mode (HSL tokens)
 * - Responsive design
 */

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface RestoreConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  loading?: boolean;
}

export function RestoreConfirmationModal({
  open,
  onClose,
  onConfirm,
  productName,
  loading = false,
}: RestoreConfirmationModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-success-100 dark:bg-success-900/20 flex items-center justify-center">
            <ArrowPathIcon className="w-8 h-8 text-success-600 dark:text-success-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-center mb-2 text-foreground">
          Restore Product?
        </h3>

        {/* Description */}
        <p className="text-center text-muted-foreground mb-6">
          Are you sure you want to restore <strong className="text-foreground">"{productName}"</strong>?
          <br />
          <span className="text-sm">
            The product will be visible in listings again and can be sold.
          </span>
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            <XMarkIcon className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            disabled={loading}
            className="bg-success-600 hover:bg-success-700 text-white"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            {loading ? 'Restoring...' : 'Restore Product'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}