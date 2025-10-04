import { useState, useCallback, useMemo } from 'react';

export interface BulkSelectionHook<T = string> {
  selectedIds: Set<T>;
  selectAll: () => void;
  clearSelection: () => void;
  toggleSelection: (id: T) => void;
  isSelected: (id: T) => boolean;
  isAllSelected: boolean;
  selectedCount: number;
  hasSelection: boolean;
}

/**
 * Hook for managing bulk selection state
 * 
 * @param allIds - Array of all available IDs (e.g., all product IDs on current page)
 * @returns BulkSelectionHook interface with selection state and methods
 * 
 * @example
 * const products = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];
 * const productIds = products.map(p => p.id);
 * const selection = useBulkSelection(productIds);
 * 
 * // Check if item is selected
 * selection.isSelected('1'); // false
 * 
 * // Toggle single item
 * selection.toggleSelection('1'); // selects item '1'
 * 
 * // Select all
 * selection.selectAll(); // selects all items
 * 
 * // Clear selection
 * selection.clearSelection();
 */
export function useBulkSelection<T = string>(allIds: T[]): BulkSelectionHook<T> {
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(allIds));
  }, [allIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelection = useCallback((id: T) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const isSelected = useCallback(
    (id: T) => selectedIds.has(id),
    [selectedIds]
  );

  const isAllSelected = useMemo(
    () => allIds.length > 0 && allIds.every((id) => selectedIds.has(id)),
    [allIds, selectedIds]
  );

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  return {
    selectedIds,
    selectAll,
    clearSelection,
    toggleSelection,
    isSelected,
    isAllSelected,
    selectedCount,
    hasSelection,
  };
}