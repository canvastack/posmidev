/**
 * Permanent Delete Confirmation Modal
 * Phase 11: Archive & Soft Delete
 * 
 * Compliance:
 * - Uses design tokens from index.css
 * - Supports dark/light mode (HSL tokens)
 * - Responsive design
 * - Type-to-confirm for safety
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { ExclamationTriangleIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PermanentDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  productName: string;
  loading?: boolean;
}

export function PermanentDeleteModal({
  open,
  onClose,
  onConfirm,
  productName,
  loading = false,
}: PermanentDeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === 'DELETE';

  // Reset confirm text when modal closes
  useEffect(() => {
    if (!open) {
      setConfirmText('');
    }
  }, [open]);

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="p-6">
        {/* Warning Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-danger-100 dark:bg-danger-900/20 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-danger-600 dark:text-danger-400" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-center mb-2 text-foreground">
          Permanently Delete Product?
        </h3>

        {/* Warning Message */}
        <div className="bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-danger-800 dark:text-danger-200 font-medium mb-2">
            ⚠️ This action CANNOT be undone!
          </p>
          <p className="text-sm text-danger-700 dark:text-danger-300">
            <strong>"{productName}"</strong> will be permanently removed from the database, 
            including all related data (images, history, analytics).
          </p>
        </div>

        {/* Type to Confirm */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Type <strong className="text-foreground">DELETE</strong> to confirm:
          </label>
          <Input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="text-center font-mono"
            autoComplete="off"
            disabled={loading}
          />
        </div>

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
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
            className="bg-danger-600 hover:bg-danger-700 text-white disabled:opacity-50"
          >
            <TrashIcon className="w-4 h-4 mr-2" />
            {loading ? 'Deleting Forever...' : 'Delete Forever'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}