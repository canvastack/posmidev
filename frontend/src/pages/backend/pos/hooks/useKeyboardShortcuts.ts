import { useEffect } from 'react';

/**
 * POS Keyboard Shortcuts Hook
 * 
 * Provides keyboard shortcuts for rapid POS operations:
 * - F1: Cash Payment
 * - F2: Card Payment
 * - F3: QRIS Payment
 * - F5: Apply Discount (Phase 2)
 * - F7: Transaction History (Phase 3)
 * - F8: Hold Order
 * - F9: Clear Cart
 * - Ctrl+K: Focus Search
 * - ?: Show Shortcuts Help
 * - ESC: Close Modal/Cancel
 */

interface ShortcutHandlers {
  onCashPayment: () => void;
  onCardPayment: () => void;
  onQRISPayment: () => void;
  onApplyDiscount?: () => void;
  onTransactionHistory?: () => void;
  onHoldOrder?: () => void;
  onClearCart: () => void;
  onFocusSearch: () => void;
  onShowShortcuts: () => void;
  onEscape: () => void;
}

export const useKeyboardShortcuts = (
  handlers: ShortcutHandlers,
  enabled: boolean = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        // Allow ESC even in inputs
        if (e.key !== 'Escape') return;
      }

      // Function keys for payment
      if (e.key === 'F1') {
        e.preventDefault();
        handlers.onCashPayment();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handlers.onCardPayment();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handlers.onQRISPayment();
      } else if (e.key === 'F5' && handlers.onApplyDiscount) {
        e.preventDefault();
        handlers.onApplyDiscount();
      } else if (e.key === 'F7' && handlers.onTransactionHistory) {
        e.preventDefault();
        handlers.onTransactionHistory();
      } else if (e.key === 'F8' && handlers.onHoldOrder) {
        e.preventDefault();
        handlers.onHoldOrder();
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (confirm('Clear all items from cart?')) {
          handlers.onClearCart();
        }
      } else if (e.key === '?') {
        e.preventDefault();
        handlers.onShowShortcuts();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handlers.onEscape();
      }

      // Ctrl/Cmd combinations
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handlers.onFocusSearch();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers, enabled]);
};