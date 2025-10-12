import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Keyboard } from 'lucide-react';

/**
 * Keyboard Shortcuts Help Modal
 * Shows all available POS keyboard shortcuts
 */

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal = ({ isOpen, onClose }: ShortcutsModalProps) => {
  const shortcuts = [
    {
      category: 'Payment',
      items: [
        { key: 'F1', action: 'Cash Payment' },
        { key: 'F2', action: 'Card Payment' },
        { key: 'F3', action: 'QRIS Payment' },
      ],
    },
    {
      category: 'Cart Management',
      items: [
        { key: 'F5', action: 'Apply Discount' },
        { key: 'F8', action: 'Hold/Park Order' },
        { key: 'F9', action: 'Clear Cart' },
      ],
    },
    {
      category: 'Tools & Views',
      items: [
        { key: 'F7', action: 'Transaction History' },
        { key: 'Ctrl+K', action: 'Focus Search' },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { key: 'ESC', action: 'Close Modal/Cancel' },
        { key: '?', action: 'Show This Help' },
      ],
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          <span>Keyboard Shortcuts</span>
        </div>
      }
      size="md"
    >
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Use these keyboard shortcuts to speed up your workflow
        </p>

        {shortcuts.map((section) => (
          <div key={section.category}>
            <h3 className="text-sm font-semibold mb-3">{section.category}</h3>
            <div className="space-y-2">
              {section.items.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm">{shortcut.action}</span>
                  <kbd className="px-3 py-1.5 text-xs font-mono bg-background border border-border rounded shadow-sm">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Press <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border rounded">?</kbd> 
            {' '}anytime to show this help
          </p>
        </div>
      </div>
    </Modal>
  );
};