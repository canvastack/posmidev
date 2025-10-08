/**
 * Archive Confirmation Modal
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
import { ArchiveBoxIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface ArchiveConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  loading?: boolean;
}

export function ArchiveConfirmationModal({
  open,
  onClose,
  onConfirm,
  productName,
  loading = false,
}: ArchiveConfirmationModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-warning-100 dark:bg-warning-900/20 flex items-center justify-center">
            <ArchiveBoxIcon className="w-8 h-8 text-warning-600 dark:text-warning-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-center mb-2 text-foreground">
          Archive Product?
        </h3>

        {/* Description */}
        <p className="text-center text-muted-foreground mb-6">
          Are you sure you want to archive <strong className="text-foreground">"{productName}"</strong>?
          <br />
          <span className="text-sm">
            The product will be hidden from listings but can be restored later.
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
            className="bg-warning-600 hover:bg-warning-700 text-white"
          >
            <ArchiveBoxIcon className="w-4 h-4 mr-2" />
            {loading ? 'Archiving...' : 'Archive Product'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}