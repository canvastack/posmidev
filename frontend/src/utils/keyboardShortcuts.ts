/**
 * Keyboard Shortcuts Utility
 * Phase 6: Day 19 - Accessibility
 * 
 * Centralized keyboard shortcut management for improved accessibility.
 * Enables keyboard-only navigation and power user productivity.
 * 
 * ACCESSIBILITY COMPLIANCE:
 * - WCAG 2.1 AA - Keyboard accessibility
 * - All interactive elements keyboard navigable
 * - Visual focus indicators
 * - Screen reader announcements
 */

import { useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
  preventDefault?: boolean;
}

export interface ShortcutGroup {
  name: string;
  shortcuts: ShortcutConfig[];
}

// ============================================================================
// KEYBOARD SHORTCUT HOOK
// ============================================================================

/**
 * Register keyboard shortcuts
 * 
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: 's',
 *     ctrl: true,
 *     handler: handleSave,
 *     description: 'Save changes',
 *   }
 * ]);
 * ```
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        // Check if key matches
        if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) {
          continue;
        }
        
        // Check modifiers
        if (shortcut.ctrl && !e.ctrlKey) continue;
        if (shortcut.shift && !e.shiftKey) continue;
        if (shortcut.alt && !e.altKey) continue;
        if (shortcut.meta && !e.metaKey) continue;
        
        // Don't trigger if typing in input/textarea
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          // Except for Escape key (always allow)
          if (e.key !== 'Escape') {
            continue;
          }
        }
        
        // Execute handler
        if (shortcut.preventDefault !== false) {
          e.preventDefault();
        }
        shortcut.handler(e);
        break;
      }
    },
    [shortcuts]
  );
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// ============================================================================
// COMMON SHORTCUTS
// ============================================================================

/**
 * Common keyboard shortcuts for variant management
 */
export const VARIANT_SHORTCUTS: ShortcutGroup = {
  name: 'Variant Management',
  shortcuts: [
    {
      key: 's',
      ctrl: true,
      handler: () => {}, // Implemented by component
      description: 'Save changes',
    },
    {
      key: 'z',
      ctrl: true,
      handler: () => {}, // Implemented by component
      description: 'Undo last action',
    },
    {
      key: 'y',
      ctrl: true,
      handler: () => {}, // Implemented by component
      description: 'Redo last action',
    },
    {
      key: 'n',
      ctrl: true,
      handler: () => {}, // Implemented by component
      description: 'Create new variant',
    },
    {
      key: 'f',
      ctrl: true,
      handler: () => {}, // Implemented by component
      description: 'Focus search',
    },
    {
      key: 'Escape',
      handler: () => {}, // Implemented by component
      description: 'Close modal/dialog',
    },
  ],
};

/**
 * Navigation shortcuts
 */
export const NAVIGATION_SHORTCUTS: ShortcutGroup = {
  name: 'Navigation',
  shortcuts: [
    {
      key: 'ArrowUp',
      handler: () => {}, // Implemented by component
      description: 'Previous item',
    },
    {
      key: 'ArrowDown',
      handler: () => {}, // Implemented by component
      description: 'Next item',
    },
    {
      key: 'Enter',
      handler: () => {}, // Implemented by component
      description: 'Select/Activate item',
    },
    {
      key: ' ',
      handler: () => {}, // Implemented by component
      description: 'Toggle selection',
    },
  ],
};

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Focus trap for modals/dialogs
 * Keeps focus within element (accessibility requirement)
 */
export function createFocusTrap(element: HTMLElement) {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  
  const focusableElements = Array.from(
    element.querySelectorAll<HTMLElement>(focusableSelectors)
  );
  
  if (focusableElements.length === 0) return;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift+Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  };
  
  element.addEventListener('keydown', handleKeyDown);
  
  // Focus first element
  firstElement.focus();
  
  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Restore focus to previous element
 * Used when closing modals
 */
export function restoreFocus(previousElement: HTMLElement | null) {
  if (previousElement && typeof previousElement.focus === 'function') {
    previousElement.focus();
  }
}

/**
 * Get previous focused element
 * Store this before opening modal
 */
export function getPreviousFocusedElement(): HTMLElement | null {
  return document.activeElement as HTMLElement | null;
}

// ============================================================================
// ARIA ANNOUNCEMENTS
// ============================================================================

/**
 * Announce message to screen readers
 * Uses aria-live region
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Visually hidden
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Announce error to screen readers
 */
export function announceError(message: string) {
  announceToScreenReader(message, 'assertive');
}

/**
 * Announce success to screen readers
 */
export function announceSuccess(message: string) {
  announceToScreenReader(message, 'polite');
}

// ============================================================================
// SKIP LINKS
// ============================================================================

/**
 * Add skip to main content link
 * Required for accessibility
 */
export function addSkipLink() {
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'skip-link';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;
  
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });
  
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });
  
  document.body.prepend(skipLink);
}

// ============================================================================
// KEYBOARD NAVIGATION HELPERS
// ============================================================================

/**
 * Navigate list with arrow keys
 */
export function useListKeyboardNavigation(
  items: any[],
  onSelect: (index: number) => void,
  initialIndex = 0
) {
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'ArrowDown',
      handler: () => {
        const nextIndex = Math.min(initialIndex + 1, items.length - 1);
        onSelect(nextIndex);
      },
      description: 'Next item',
      preventDefault: true,
    },
    {
      key: 'ArrowUp',
      handler: () => {
        const prevIndex = Math.max(initialIndex - 1, 0);
        onSelect(prevIndex);
      },
      description: 'Previous item',
      preventDefault: true,
    },
    {
      key: 'Home',
      handler: () => {
        onSelect(0);
      },
      description: 'First item',
      preventDefault: true,
    },
    {
      key: 'End',
      handler: () => {
        onSelect(items.length - 1);
      },
      description: 'Last item',
      preventDefault: true,
    },
  ];
  
  useKeyboardShortcuts(shortcuts);
}

/**
 * Get all keyboard shortcuts (for help dialog)
 */
export function getAllShortcuts(): ShortcutGroup[] {
  return [VARIANT_SHORTCUTS, NAVIGATION_SHORTCUTS];
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: ShortcutConfig): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('Cmd');
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join('+');
}