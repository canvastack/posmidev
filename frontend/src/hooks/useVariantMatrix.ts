/**
 * Custom hook for managing variant matrix builder
 * 
 * Features:
 * - Attribute management (add, remove, update)
 * - Automatic variant generation from attribute combinations
 * - Matrix cell updates (individual and bulk)
 * - Undo/redo functionality
 * - Dirty state tracking
 * - Validation and conflict detection
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All variants generated include tenant_id
 * - Matrix operations are tenant-scoped
 * 
 * @module hooks/useVariantMatrix
 */

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useVariantStore } from '../stores/variantStore';
import { 
  generateVariantCombinations, 
  generateVariantSKU,
  calculateVariantPrice,
  isReasonableCombinationCount,
  calculateCombinationCount,
  validateVariantInput,
  checkDuplicateSKUs,
} from '../utils/variantHelpers';
import { 
  type ProductVariantInput, 
  type VariantMatrixCell, 
  type VariantMatrixConfig 
} from '../types/variant';
import { useToast } from './use-toast';

// ============================================================================
// TYPES
// ============================================================================

interface MatrixAttribute {
  name: string;
  values: string[];
}

interface HistoryState {
  matrixCells: VariantMatrixCell[];
  timestamp: number;
}

interface UseVariantMatrixOptions {
  tenantId: string;
  productId: string;
  baseSKU?: string;
  basePrice?: number;
  maxHistorySteps?: number;
}

interface UseVariantMatrixReturn {
  // State
  attributes: MatrixAttribute[];
  matrixCells: VariantMatrixCell[];
  matrixConfig: VariantMatrixConfig | null;
  isDirty: boolean;
  combinationCount: number;
  isReasonableCount: boolean;
  validationErrors: Record<string, string[]>;
  
  // Attribute actions
  addAttribute: (name: string, values: string[]) => void;
  removeAttribute: (name: string) => void;
  updateAttributeValues: (name: string, values: string[]) => void;
  
  // Matrix actions
  generateMatrix: () => void;
  updateCell: (cellId: string, updates: Partial<VariantMatrixCell>) => void;
  bulkUpdateCells: (cellIds: string[], updates: Partial<VariantMatrixCell>) => void;
  removeCell: (cellId: string) => void;
  removeCells: (cellIds: string[]) => void;
  resetMatrix: () => void;
  
  // Variant generation
  getVariantInputs: (opts?: { mode?: 'changed' | 'all' | 'selected'; selectedIds?: string[] }) => ProductVariantInput[];
  
  // Validation
  validateMatrix: (opts?: { mode?: 'changed' | 'all' | 'selected'; selectedIds?: string[] }) => boolean;
  
  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  
  // Utility
  clearDirty: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing variant matrix builder
 * 
 * @param options - Configuration options
 * @returns Matrix state and actions
 * 
 * @example
 * ```tsx
 * const {
 *   attributes,
 *   addAttribute,
 *   generateMatrix,
 *   updateCell,
 *   getVariantInputs,
 * } = useVariantMatrix({
 *   tenantId,
 *   productId,
 *   baseSKU: 'TSHIRT',
 *   basePrice: 19.99,
 * });
 * 
 * // Add attributes
 * addAttribute('Size', ['S', 'M', 'L', 'XL']);
 * addAttribute('Color', ['Red', 'Blue', 'Black']);
 * 
 * // Generate matrix (creates 4 × 3 = 12 variants)
 * generateMatrix();
 * 
 * // Update individual cell
 * updateCell('cell-id', { price: 21.99 });
 * 
 * // Get variant inputs for API submission
 * const variants = getVariantInputs();
 * ```
 */
export function useVariantMatrix(options: UseVariantMatrixOptions): UseVariantMatrixReturn {
  const { tenantId, productId, baseSKU = '', basePrice = 0, maxHistorySteps = 50 } = options;
  const { toast } = useToast();
  
  // Zustand store state
  const {
    matrixCells,
    matrixConfig,
    isDirty,
    initializeMatrix,
    updateMatrixCell,
    bulkUpdateMatrixCells,
    removeMatrixCell,
    removeMatrixCells,
    resetMatrix: storeResetMatrix,
    setDirty,
    getMatrixVariantInputs,
  } = useVariantStore();

  // Local state for attributes
  const [attributes, setAttributes] = useState<MatrixAttribute[]>([]);
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /**
   * Calculate total number of variant combinations
   */
  const combinationCount = useMemo(() => {
    return calculateCombinationCount(
      attributes.map(attr => ({ name: attr.name, values: attr.values }))
    );
  }, [attributes]);

  /**
   * Check if combination count is reasonable (not too large)
   */
  const isReasonableCount = useMemo(() => {
    return isReasonableCombinationCount(combinationCount);
  }, [combinationCount]);

  /**
   * Check if undo is available
   */
  const canUndo = historyIndex > 0;

  /**
   * Check if redo is available
   */
  const canRedo = historyIndex < history.length - 1;

  // ============================================================================
  // HISTORY MANAGEMENT
  // ============================================================================

  /**
   * Save current state to history (snapshot latest store state)
   */
  const saveToHistory = useCallback(() => {
    // Read the freshest matrixCells from the store
    const latestCells = useVariantStore.getState().matrixCells;
    // Deep-ish clone to avoid accidental mutations affecting history
    const cloned = latestCells.map(c => ({ ...c, combination: { ...c.combination } }));

    const newState: HistoryState = {
      matrixCells: cloned,
      timestamp: Date.now(),
    };

    // Remove any future states if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add new state
    newHistory.push(newState);
    
    // Limit history size
    if (newHistory.length > maxHistorySteps) {
      newHistory.shift();
    } else {
      setHistoryIndex(prev => prev + 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex, maxHistorySteps]);

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    if (!canUndo) return;
    
    const previousState = history[historyIndex - 1];
    if (previousState) {
      // Restore previous state to store
      initializeMatrix({
        attributes: attributes.map(a => ({ name: a.name, values: a.values })),
        basePrice: basePrice ?? (matrixConfig?.basePrice ?? 0),
        baseStock: matrixConfig?.baseStock ?? 0,
      }, previousState.matrixCells);
      
      setHistoryIndex(prev => prev - 1);
      setDirty(true);
      
      toast({
        title: 'Undone',
        description: 'Last action has been undone.',
      });
    }
  }, [canUndo, history, historyIndex, initializeMatrix, tenantId, productId, baseSKU, basePrice, attributes, setDirty, toast]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    if (!canRedo) return;
    
    const nextState = history[historyIndex + 1];
    if (nextState) {
      // Restore next state to store
      initializeMatrix({
        attributes: attributes.map(a => ({ name: a.name, values: a.values })),
        basePrice: basePrice ?? (matrixConfig?.basePrice ?? 0),
        baseStock: matrixConfig?.baseStock ?? 0,
      }, nextState.matrixCells);
      
      setHistoryIndex(prev => prev + 1);
      setDirty(true);
      
      toast({
        title: 'Redone',
        description: 'Action has been redone.',
      });
    }
  }, [canRedo, history, historyIndex, initializeMatrix, tenantId, productId, baseSKU, basePrice, attributes, setDirty, toast]);

  // ============================================================================
  // ATTRIBUTE MANAGEMENT
  // ============================================================================

  /**
   * Add a new attribute with its values
   */
  const addAttribute = useCallback((name: string, values: string[]) => {
    // Validate input
    if (!name.trim()) {
      toast({
        title: 'Invalid attribute',
        description: 'Attribute name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    if (values.length === 0) {
      toast({
        title: 'Invalid attribute',
        description: 'Attribute must have at least one value.',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate
    if (attributes.some(attr => attr.name.toLowerCase() === name.toLowerCase())) {
      toast({
        title: 'Duplicate attribute',
        description: `Attribute "${name}" already exists.`,
        variant: 'destructive',
      });
      return;
    }

    setAttributes(prev => [...prev, { name, values }]);
    setDirty(true);
    
    toast({
      title: 'Attribute added',
      description: `Attribute "${name}" with ${values.length} values has been added.`,
    });
  }, [attributes, setDirty, toast]);

  /**
   * Remove an attribute
   */
  const removeAttribute = useCallback((name: string) => {
    setAttributes(prev => prev.filter(attr => attr.name !== name));
    setDirty(true);
    
    toast({
      title: 'Attribute removed',
      description: `Attribute "${name}" has been removed.`,
    });
  }, [setDirty, toast]);

  /**
   * Update values for an existing attribute
   */
  const updateAttributeValues = useCallback((name: string, values: string[]) => {
    if (values.length === 0) {
      toast({
        title: 'Invalid values',
        description: 'Attribute must have at least one value.',
        variant: 'destructive',
      });
      return;
    }

    setAttributes(prev => 
      prev.map(attr => 
        attr.name === name ? { ...attr, values } : attr
      )
    );
    setDirty(true);
  }, [setDirty, toast]);

  // ============================================================================
  // MATRIX GENERATION
  // ============================================================================

  /**
   * Generate matrix from current attributes
   */
  const generateMatrix = useCallback(() => {
    if (attributes.length === 0) {
      toast({
        title: 'No attributes',
        description: 'Add at least one attribute to generate variants.',
        variant: 'destructive',
      });
      return;
    }

    // Check if combination count is reasonable
    if (!isReasonableCount) {
      toast({
        title: 'Too many combinations',
        description: `Generating ${combinationCount} variants may cause performance issues. Consider reducing attributes or values.`,
        variant: 'destructive',
      });
      return;
    }

    // Generate combinations
    const combinations = generateVariantCombinations(
      attributes.map(attr => ({ name: attr.name, values: attr.values }))
    );

    // Convert to matrix cells with unique SKUs
    const cells: VariantMatrixCell[] = combinations.map((combination, index) => {
      // Generate SKU with incremental number (1-based index)
      const sku = generateVariantSKU(baseSKU, combination, '{BASE}-{ATTR:all}', index + 1);
      const priceResult = calculateVariantPrice(basePrice, combination);

      return {
        id: Object.keys(combination).sort().map(k => `${k}=${combination[k]}`).join('|'),
        combination,
        isNew: true,
        isDirty: false,
        sku,
        price: priceResult.price,
        stock: 0,
      };
    });

    // Initialize matrix in store
    initializeMatrix({
      attributes: attributes,
      basePrice: basePrice,
      baseStock: 0,
    }, cells);

    // Save to history
    saveToHistory();

    toast({
      title: 'Matrix generated',
      description: `Successfully generated ${cells.length} variant combinations.`,
    });
  }, [
    attributes, 
    isReasonableCount, 
    combinationCount, 
    baseSKU, 
    basePrice, 
    tenantId, 
    productId,
    initializeMatrix,
    saveToHistory,
    toast
  ]);

  // ============================================================================
  // MATRIX UPDATES
  // ============================================================================

  /**
   * Update a single matrix cell
   */
  const updateCell = useCallback((cellId: string, updates: Partial<VariantMatrixCell>) => {
    updateMatrixCell(cellId, updates);
    setDirty(true);
    saveToHistory();
  }, [updateMatrixCell, setDirty, saveToHistory]);

  /**
   * Bulk update multiple cells
   */
  const bulkUpdateCells = useCallback((cellIds: string[], updates: Partial<VariantMatrixCell>) => {
    bulkUpdateMatrixCells(cellIds, updates);
    setDirty(true);
    saveToHistory();
    
    toast({
      title: 'Cells updated',
      description: `Updated ${cellIds.length} variant(s).`,
    });
  }, [bulkUpdateMatrixCells, setDirty, saveToHistory, toast]);

  /**
   * Reset matrix to initial state
   */
  const resetMatrix = useCallback(() => {
    storeResetMatrix();
    setAttributes([]);
    setHistory([]);
    setHistoryIndex(-1);
    setValidationErrors({});
    
    toast({
      title: 'Matrix reset',
      description: 'Matrix has been reset to initial state.',
    });
  }, [storeResetMatrix, toast]);

  /**
   * Remove a single cell
   */
  const removeCell = useCallback((cellId: string) => {
    removeMatrixCell(cellId);
    setDirty(true);
    // snapshot updated state into history
    saveToHistory();
  }, [removeMatrixCell, setDirty, saveToHistory]);

  /**
   * Remove multiple cells
   */
  const removeCells = useCallback((cellIds: string[]) => {
    removeMatrixCells(cellIds);
    setDirty(true);
    // snapshot updated state into history
    saveToHistory();
  }, [removeMatrixCells, setDirty, saveToHistory]);

  // ============================================================================
  // VARIANT GENERATION
  // ============================================================================

  /**
   * Get variant inputs for API submission
   */
  const getVariantInputs = useCallback((opts?: { mode?: 'changed' | 'all' | 'selected'; selectedIds?: string[] }): ProductVariantInput[] => {
    return getMatrixVariantInputs(opts);
  }, [getMatrixVariantInputs]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Validate all matrix cells
   */
  const validateMatrix = useCallback((opts?: { mode?: 'changed' | 'all' | 'selected'; selectedIds?: string[] }): boolean => {
    const inputs = getVariantInputs(opts);
    const errors: Record<string, string[]> = {};
    
    // Validate each variant within selected scope
    inputs.forEach((input, index) => {
      const validationResult = validateVariantInput(input);
      if (validationResult.length > 0) {
        errors[`variant-${index}`] = validationResult;
      }
    });

    // Check for duplicate SKUs only within the scoped inputs
    const skuCheck = checkDuplicateSKUs(inputs);
    if (skuCheck.hasDuplicates) {
      errors['duplicate-skus'] = skuCheck.duplicateSKUs.map(
        sku => `Duplicate SKU found: ${sku.toUpperCase()} (used in ${skuCheck.duplicates[sku].length} variants)`
      );
    }

    setValidationErrors(errors);

    const isValid = Object.keys(errors).length === 0;
    
    if (!isValid) {
      toast({
        title: 'Validation failed',
        description: `Found ${Object.keys(errors).length} validation error(s).`,
        variant: 'destructive',
      });
    }

    return isValid;
  }, [getVariantInputs, toast]);

  // ============================================================================
  // UTILITY
  // ============================================================================

  /**
   * Clear dirty flag
   */
  const clearDirty = useCallback(() => {
    setDirty(false);
  }, [setDirty]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    attributes,
    matrixCells,
    matrixConfig,
    isDirty,
    combinationCount,
    isReasonableCount,
    validationErrors,
    
    // Attribute actions
    addAttribute,
    removeAttribute,
    updateAttributeValues,
    
    // Matrix actions
    generateMatrix,
    updateCell,
    bulkUpdateCells,
    removeCell,
    removeCells,
    resetMatrix,
    
    // Variant generation
    getVariantInputs,
    
    // Validation
    validateMatrix,
    
    // Undo/Redo
    canUndo,
    canRedo,
    undo,
    redo,
    
    // Utility
    clearDirty,
  };
}