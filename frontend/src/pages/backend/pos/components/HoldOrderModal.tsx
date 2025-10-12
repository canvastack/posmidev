import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Package, Save } from 'lucide-react';

interface HoldOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  itemsCount: number;
}

export const HoldOrderModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  itemsCount 
}: HoldOrderModalProps) => {
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(notes || undefined);
    setNotes('');
    onClose();
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Park Order"
      size="md"
    >
      <div className="space-y-4">
        {/* Info */}
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
          <Package className="h-10 w-10 text-primary" />
          <div>
            <p className="font-semibold text-sm">
              Parking {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You can restore this order later from the Parked Orders panel
            </p>
          </div>
        </div>

        {/* Optional Notes */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Notes (Optional)
          </label>
          <Textarea
            placeholder="e.g., Customer name, table number, or any reminder..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full resize-none"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground text-right">
            {notes.length}/200
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white"
            onClick={handleConfirm}
          >
            <Save className="h-4 w-4 mr-2" />
            Park Order
          </Button>
        </div>

        {/* Keyboard Hint */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            💡 Pro tip: Press <kbd className="px-2 py-1 text-xs border rounded bg-muted mx-1">F8</kbd> 
            anytime to quickly park an order
          </p>
        </div>
      </div>
    </Modal>
  );
};