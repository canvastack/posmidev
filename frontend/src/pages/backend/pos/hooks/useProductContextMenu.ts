import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useProductContextMenu Hook
 * 
 * Phase 3a Feature 3: Product Quick Actions
 * 
 * Features:
 * - Right-click detection for desktop
 * - Long-press (500ms) detection for mobile/touch
 * - Context menu positioning
 * - Prevent default context menu on right-click
 * - Auto-close menu on scroll or resize
 * 
 * Returns:
 * - showMenu: boolean
 * - menuPosition: { x, y }
 * - selectedProductId: string | null
 * - selectedProductName: string | null
 * - openMenu: (productId, productName, position) => void
 * - closeMenu: () => void
 * - getContextMenuProps: (productId, productName) => props object for element
 * 
 * @example
 * const { showMenu, menuPosition, selectedProductId, ... } = useProductContextMenu();
 * 
 * <div {...getContextMenuProps(product.id, product.name)}>
 *   Product Card
 * </div>
 * 
 * <ProductContextMenu
 *   isOpen={showMenu}
 *   position={menuPosition}
 *   productId={selectedProductId}
 *   onClose={closeMenu}
 * />
 */

interface Position {
  x: number;
  y: number;
}

interface MenuState {
  showMenu: boolean;
  menuPosition: Position;
  selectedProductId: string | null;
  selectedProductName: string | null;
}

export function useProductContextMenu() {
  const [state, setState] = useState<MenuState>({
    showMenu: false,
    menuPosition: { x: 0, y: 0 },
    selectedProductId: null,
    selectedProductName: null,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef(false);

  // Open menu
  const openMenu = useCallback((productId: string, productName: string, position: Position) => {
    setState({
      showMenu: true,
      menuPosition: position,
      selectedProductId: productId,
      selectedProductName: productName,
    });
  }, []);

  // Close menu
  const closeMenu = useCallback(() => {
    setState({
      showMenu: false,
      menuPosition: { x: 0, y: 0 },
      selectedProductId: null,
      selectedProductName: null,
    });
  }, []);

  // Get context menu props for element
  const getContextMenuProps = useCallback((productId: string, productName: string) => {
    return {
      // Right-click for desktop
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        openMenu(productId, productName, {
          x: e.clientX,
          y: e.clientY,
        });
      },

      // Touch events for mobile long-press
      onTouchStart: (e: React.TouchEvent) => {
        longPressTriggeredRef.current = false;
        
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;

        // Set timer for long-press (500ms)
        longPressTimerRef.current = setTimeout(() => {
          longPressTriggeredRef.current = true;
          
          // Vibrate if available (haptic feedback)
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }

          openMenu(productId, productName, {
            x: startX,
            y: startY,
          });
        }, 500);
      },

      onTouchMove: (e: React.TouchEvent) => {
        // Cancel long-press if user moves finger too much
        const touch = e.touches[0];
        const moveThreshold = 10; // pixels

        if (longPressTimerRef.current) {
          const deltaX = Math.abs(touch.clientX - touch.clientX);
          const deltaY = Math.abs(touch.clientY - touch.clientY);

          if (deltaX > moveThreshold || deltaY > moveThreshold) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      },

      onTouchEnd: () => {
        // Clear timer if touch ends before 500ms
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      },

      onTouchCancel: () => {
        // Clear timer if touch is cancelled
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      },
    };
  }, [openMenu]);

  // Check if long-press was triggered (to prevent click event)
  const wasLongPress = useCallback(() => {
    return longPressTriggeredRef.current;
  }, []);

  // Auto-close menu on scroll or window resize
  useEffect(() => {
    if (!state.showMenu) return;

    const handleScrollOrResize = () => {
      closeMenu();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [state.showMenu, closeMenu]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  return {
    showMenu: state.showMenu,
    menuPosition: state.menuPosition,
    selectedProductId: state.selectedProductId,
    selectedProductName: state.selectedProductName,
    openMenu,
    closeMenu,
    getContextMenuProps,
    wasLongPress,
  };
}