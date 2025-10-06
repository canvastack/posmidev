/**
 * VariantMatrixBuilder Component
 * 
 * Interactive matrix builder for creating product variants
 * from attribute combinations.
 * 
 * Features:
 * - Step 1: Attribute Definition (add/remove attributes and values)
 * - Step 2: Variant Table (generated combinations with inline editing)
 * - Undo/Redo functionality
 * - Real-time combination count
 * - Bulk operations
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - Requires tenantId prop (TypeScript enforced)
 * - All variants include tenant_id
 * - All API calls are tenant-scoped
 * 
 * @module components/domain/variants/VariantMatrixBuilder
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useVariantMatrix } from '../../../hooks/useVariantMatrix';
import { 
  Plus, 
  X, 
  RefreshCw, 
  Undo2, 
  Redo2, 
  Sparkles, 
  AlertTriangle,
  CheckCircle2,
  Save,
  ChevronRight,
  Info,
  Edit2,
  Trash2,
  DollarSign,
  Package,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { VariantMatrixCell } from '../../../types/variant';

// ============================================================================
// TYPES
// ============================================================================

export interface VariantMatrixBuilderProps {
  /** Tenant ID (IMMUTABLE RULE: Required for all operations) */
  tenantId: string;
  
  /** Product ID */
  productId: string;
  
  /** Base SKU for auto-generation */
  baseSKU?: string;
  
  /** Base price for variants */
  basePrice?: number;
  
  /** Product name for display */
  productName?: string;
  
  /** Callback when variants are saved */
  onSave?: (variantInputs: any[]) => void;
  
  /** Callback when cancelled */
  onCancel?: () => void;
  
  /** Loading state (during save) */
  isLoading?: boolean;
}

interface AttributeInputState {
  name: string;
  values: string[];
  currentValue: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Matrix builder component for creating product variants
 * 
 * @example
 * ```tsx
 * <VariantMatrixBuilder
 *   tenantId={tenantId}
 *   productId={productId}
 *   baseSKU="TSHIRT"
 *   basePrice={19.99}
 *   productName="Cotton T-Shirt"
 *   onSave={handleSave}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export function VariantMatrixBuilder({
  tenantId,
  productId,
  baseSKU = '',
  basePrice = 0,
  productName = 'Product',
  onSave,
  onCancel,
  isLoading = false,
}: VariantMatrixBuilderProps) {
  // ============================================================================
  // HOOKS
  // ============================================================================
  
  const {
    attributes,
    matrixCells,
    isDirty,
    combinationCount,
    isReasonableCount,
    validationErrors,
    addAttribute,
    removeAttribute,
    updateAttributeValues,
    generateMatrix,
    getVariantInputs,
    validateMatrix,
    canUndo,
    canRedo,
    undo,
    redo,
    resetMatrix,
  } = useVariantMatrix({
    tenantId,
    productId,
    baseSKU,
    basePrice,
  });

  // ============================================================================
  // STATE
  // ============================================================================
  
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  
  // New attribute input state
  const [newAttribute, setNewAttribute] = useState<AttributeInputState>({
    name: '',
    values: [],
    currentValue: '',
  });
  
  // Track which attribute is being edited
  const [editingAttribute, setEditingAttribute] = useState<string | null>(null);
  
  // Inline editing state
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'sku' | 'price' | 'stock' | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  // Selection state for bulk operations
  const [selectedCellIds, setSelectedCellIds] = useState<Set<string>>(new Set());
  
  // Bulk operation modals
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkPriceValue, setBulkPriceValue] = useState<string>('');
  const [bulkStockValue, setBulkStockValue] = useState<string>('');
  const [bulkPriceOperation, setBulkPriceOperation] = useState<'set' | 'increase' | 'decrease'>('set');

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const hasAttributes = attributes.length > 0;
  const hasMatrix = matrixCells.length > 0;
  
  const canGenerate = hasAttributes && combinationCount > 0;
  
  const stepStatus = useMemo(() => {
    return {
      step1Complete: hasAttributes && combinationCount > 0,
      step2Complete: hasMatrix && validateMatrix(),
    };
  }, [hasAttributes, combinationCount, hasMatrix, validateMatrix]);
  
  // Selection computed values
  const selectedCount = selectedCellIds.size;
  const allSelected = matrixCells.length > 0 && selectedCellIds.size === matrixCells.length;
  const someSelected = selectedCellIds.size > 0 && selectedCellIds.size < matrixCells.length;

  // ============================================================================
  // ATTRIBUTE MANAGEMENT
  // ============================================================================
  
  /**
   * Add value to current attribute input
   */
  const handleAddValue = useCallback(() => {
    const trimmedValue = newAttribute.currentValue.trim();
    
    if (!trimmedValue) return;
    
    // Check for duplicates
    if (newAttribute.values.includes(trimmedValue)) {
      return;
    }
    
    setNewAttribute(prev => ({
      ...prev,
      values: [...prev.values, trimmedValue],
      currentValue: '',
    }));
  }, [newAttribute.currentValue, newAttribute.values]);
  
  /**
   * Remove value from current attribute input
   */
  const handleRemoveValue = useCallback((value: string) => {
    setNewAttribute(prev => ({
      ...prev,
      values: prev.values.filter(v => v !== value),
    }));
  }, []);
  
  /**
   * Create new attribute
   */
  const handleCreateAttribute = useCallback(() => {
    const trimmedName = newAttribute.name.trim();
    
    if (!trimmedName || newAttribute.values.length === 0) {
      return;
    }
    
    addAttribute(trimmedName, newAttribute.values);
    
    // Reset input
    setNewAttribute({
      name: '',
      values: [],
      currentValue: '',
    });
  }, [newAttribute, addAttribute]);
  
  /**
   * Handle Enter key in input fields
   */
  const handleKeyPress = useCallback((
    e: React.KeyboardEvent,
    action: 'value' | 'attribute'
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      if (action === 'value') {
        handleAddValue();
      } else if (action === 'attribute') {
        handleCreateAttribute();
      }
    }
  }, [handleAddValue, handleCreateAttribute]);

  // ============================================================================
  // MATRIX GENERATION
  // ============================================================================
  
  /**
   * Generate matrix and move to step 2
   */
  const handleGenerate = useCallback(() => {
    generateMatrix();
    setCurrentStep(2);
  }, [generateMatrix]);
  
  /**
   * Regenerate matrix (stay on current step)
   */
  const handleRegenerate = useCallback(() => {
    generateMatrix();
  }, [generateMatrix]);

  // ============================================================================
  // INLINE EDITING
  // ============================================================================
  
  /**
   * Start editing a cell field
   */
  const handleStartEdit = useCallback((cellId: string, field: 'sku' | 'price' | 'stock', currentValue: string | number) => {
    setEditingCell(cellId);
    setEditingField(field);
    setEditValue(String(currentValue));
  }, []);
  
  /**
   * Save inline edit
   */
  const handleSaveEdit = useCallback(() => {
    if (!editingCell || !editingField) return;
    
    const updates: Partial<VariantMatrixCell> = {};
    
    if (editingField === 'sku') {
      const trimmed = editValue.trim();
      if (!trimmed) return; // Don't save empty SKU
      updates.sku = trimmed;
    } else if (editingField === 'price') {
      const parsed = parseFloat(editValue);
      if (isNaN(parsed) || parsed < 0) return; // Don't save invalid price
      updates.price = parsed;
    } else if (editingField === 'stock') {
      const parsed = parseInt(editValue);
      if (isNaN(parsed) || parsed < 0) return; // Don't save invalid stock
      updates.stock_quantity = parsed;
    }
    
    updateCell(editingCell, updates);
    
    setEditingCell(null);
    setEditingField(null);
    setEditValue('');
  }, [editingCell, editingField, editValue, updateCell]);
  
  /**
   * Cancel inline edit
   */
  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditingField(null);
    setEditValue('');
  }, []);
  
  /**
   * Handle key press in edit input
   */
  const handleEditKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // ============================================================================
  // SELECTION & BULK OPERATIONS
  // ============================================================================
  
  /**
   * Toggle selection of a single cell
   */
  const handleToggleSelect = useCallback((cellId: string) => {
    setSelectedCellIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cellId)) {
        newSet.delete(cellId);
      } else {
        newSet.add(cellId);
      }
      return newSet;
    });
  }, []);
  
  /**
   * Toggle select all
   */
  const handleToggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedCellIds(new Set());
    } else {
      setSelectedCellIds(new Set(matrixCells.map(cell => cell.id)));
    }
  }, [allSelected, matrixCells]);
  
  /**
   * Clear selection
   */
  const handleClearSelection = useCallback(() => {
    setSelectedCellIds(new Set());
  }, []);
  
  /**
   * Delete selected variants
   */
  const handleDeleteSelected = useCallback(() => {
    if (selectedCellIds.size === 0) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedCellIds.size} variant${selectedCellIds.size !== 1 ? 's' : ''}?`
    );
    
    if (!confirmed) return;
    
    // Remove selected cells from matrix
    const cellsToKeep = matrixCells.filter(cell => !selectedCellIds.has(cell.id));
    
    // Update matrix through hook (this would need to be added to useVariantMatrix)
    // For now, we'll just clear selection
    // TODO: Add removeCell/removeCells method to useVariantMatrix hook
    
    setSelectedCellIds(new Set());
  }, [selectedCellIds, matrixCells]);
  
  /**
   * Delete individual variant
   */
  const handleDeleteVariant = useCallback((cellId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this variant?');
    if (!confirmed) return;
    
    // TODO: Add removeCell method to useVariantMatrix hook
    // For now, just clear from selection if selected
    setSelectedCellIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(cellId);
      return newSet;
    });
  }, []);
  
  /**
   * Apply bulk price update
   */
  const handleApplyBulkPrice = useCallback(() => {
    const value = parseFloat(bulkPriceValue);
    if (isNaN(value) || value < 0) return;
    
    const selectedCells = Array.from(selectedCellIds);
    if (selectedCells.length === 0) return;
    
    const updates: Partial<VariantMatrixCell> = {};
    
    if (bulkPriceOperation === 'set') {
      updates.price = value;
    }
    // For increase/decrease, we need to update each cell individually
    else {
      selectedCells.forEach(cellId => {
        const cell = matrixCells.find(c => c.id === cellId);
        if (!cell) return;
        
        let newPrice = cell.price;
        if (bulkPriceOperation === 'increase') {
          newPrice += value;
        } else if (bulkPriceOperation === 'decrease') {
          newPrice = Math.max(0, newPrice - value);
        }
        
        updateCell(cellId, { price: newPrice });
      });
      
      setShowBulkPriceModal(false);
      setBulkPriceValue('');
      return;
    }
    
    bulkUpdateCells(selectedCells, updates);
    setShowBulkPriceModal(false);
    setBulkPriceValue('');
  }, [bulkPriceValue, bulkPriceOperation, selectedCellIds, matrixCells, updateCell, bulkUpdateCells]);
  
  /**
   * Apply bulk stock update
   */
  const handleApplyBulkStock = useCallback(() => {
    const value = parseInt(bulkStockValue);
    if (isNaN(value) || value < 0) return;
    
    const selectedCells = Array.from(selectedCellIds);
    if (selectedCells.length === 0) return;
    
    bulkUpdateCells(selectedCells, { stock_quantity: value });
    setShowBulkStockModal(false);
    setBulkStockValue('');
  }, [bulkStockValue, selectedCellIds, bulkUpdateCells]);

  // ============================================================================
  // SAVE & CANCEL
  // ============================================================================
  
  /**
   * Save variants
   */
  const handleSave = useCallback(() => {
    if (!validateMatrix()) {
      return;
    }
    
    const variantInputs = getVariantInputs();
    onSave?.(variantInputs);
  }, [validateMatrix, getVariantInputs, onSave]);
  
  /**
   * Cancel and reset
   */
  const handleCancel = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      
      if (!confirmed) return;
    }
    
    resetMatrix();
    onCancel?.();
  }, [isDirty, resetMatrix, onCancel]);

  // ============================================================================
  // RENDER: COMBINATION COUNT BADGE
  // ============================================================================
  
  const renderCombinationBadge = () => {
    if (combinationCount === 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Info className="h-4 w-4" />
          <span>Add attributes to see variant count</span>
        </div>
      );
    }
    
    const badge = (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
        isReasonableCount.isReasonable
          ? "bg-green-50 text-green-700 border border-green-200"
          : "bg-red-50 text-red-700 border border-red-200"
      )}>
        <Sparkles className="h-4 w-4" />
        <span>
          {combinationCount} variant{combinationCount !== 1 ? 's' : ''} will be generated
        </span>
      </div>
    );
    
    if (!isReasonableCount.isReasonable && isReasonableCount.warning) {
      return (
        <div className="space-y-2">
          {badge}
          <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{isReasonableCount.warning}</span>
          </div>
        </div>
      );
    }
    
    return badge;
  };

  // ============================================================================
  // RENDER: BULK ACTION TOOLBAR
  // ============================================================================
  
  const renderBulkActionToolbar = () => {
    if (selectedCount === 0 || currentStep !== 2) return null;
    
    return (
      <div className="p-4 bg-primary/5 border-t border-b border-primary/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Check className="h-4 w-4" />
            <span>{selectedCount} selected</span>
          </div>
          
          <button
            onClick={handleClearSelection}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Clear
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBulkPriceModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <DollarSign className="h-4 w-4" />
            <span>Update Price</span>
          </button>
          
          <button
            onClick={() => setShowBulkStockModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Package className="h-4 w-4" />
            <span>Update Stock</span>
          </button>
          
          <button
            onClick={handleDeleteSelected}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 active:bg-red-200 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // RENDER: BULK PRICE MODAL
  // ============================================================================
  
  const renderBulkPriceModal = () => {
    if (!showBulkPriceModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBulkPriceModal(false)}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Bulk Update Price
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operation
              </label>
              <select
                value={bulkPriceOperation}
                onChange={(e) => setBulkPriceOperation(e.target.value as 'set' | 'increase' | 'decrease')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="set">Set to</option>
                <option value="increase">Increase by</option>
                <option value="decrease">Decrease by</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Amount
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bulkPriceValue}
                onChange={(e) => setBulkPriceValue(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
            </div>
            
            <p className="text-sm text-gray-600">
              This will update {selectedCount} variant{selectedCount !== 1 ? 's' : ''}.
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setShowBulkPriceModal(false)}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyBulkPrice}
              disabled={!bulkPriceValue || parseFloat(bulkPriceValue) < 0}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // RENDER: BULK STOCK MODAL
  // ============================================================================
  
  const renderBulkStockModal = () => {
    if (!showBulkStockModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBulkStockModal(false)}>
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Bulk Update Stock
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={bulkStockValue}
                onChange={(e) => setBulkStockValue(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
            </div>
            
            <p className="text-sm text-gray-600">
              This will set stock to {bulkStockValue || 0} for {selectedCount} variant{selectedCount !== 1 ? 's' : ''}.
            </p>
          </div>
          
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setShowBulkStockModal(false)}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyBulkStock}
              disabled={!bulkStockValue || parseInt(bulkStockValue) < 0}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: QUICK ACTIONS BAR
  // ============================================================================
  
  const renderQuickActions = () => {
    return (
      <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border-t border-b border-gray-200">
        {/* Left: Undo/Redo */}
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              canUndo
                ? "text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                : "text-gray-400 cursor-not-allowed"
            )}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Undo</span>
          </button>
          
          <button
            onClick={redo}
            disabled={!canRedo}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              canRedo
                ? "text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                : "text-gray-400 cursor-not-allowed"
            )}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-4 w-4" />
            <span className="hidden sm:inline">Redo</span>
          </button>
        </div>
        
        {/* Center: Combination Count */}
        <div className="flex-1 flex justify-center">
          {renderCombinationBadge()}
        </div>
        
        {/* Right: Generate/Regenerate */}
        <div className="flex items-center gap-2">
          {hasMatrix && (
            <button
              onClick={handleRegenerate}
              disabled={!canGenerate || isLoading}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                canGenerate && !isLoading
                  ? "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>
          )}
          
          {!hasMatrix && (
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isLoading}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                canGenerate && !isLoading
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate Variants</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: ATTRIBUTE DEFINITION (STEP 1)
  // ============================================================================
  
  const renderAttributeDefinition = () => {
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900">
            Step 1: Define Attributes
          </h3>
          <p className="text-sm text-gray-600">
            Add attributes (like Size, Color, Material) and their values to generate variant combinations.
          </p>
        </div>
        
        {/* New Attribute Input */}
        <div className="space-y-4 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="space-y-3">
            {/* Attribute Name Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attribute Name
              </label>
              <input
                type="text"
                placeholder="e.g., Size, Color, Material"
                value={newAttribute.name}
                onChange={(e) => setNewAttribute(prev => ({ ...prev, name: e.target.value }))}
                onKeyPress={(e) => handleKeyPress(e, 'attribute')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            
            {/* Attribute Values Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Values
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Small, Medium, Large"
                  value={newAttribute.currentValue}
                  onChange={(e) => setNewAttribute(prev => ({ ...prev, currentValue: e.target.value }))}
                  onKeyPress={(e) => handleKeyPress(e, 'value')}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  onClick={handleAddValue}
                  disabled={!newAttribute.currentValue.trim()}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    newAttribute.currentValue.trim()
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300"
                      : "bg-gray-50 text-gray-400 cursor-not-allowed"
                  )}
                >
                  Add
                </button>
              </div>
            </div>
            
            {/* Value Chips */}
            {newAttribute.values.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {newAttribute.values.map((value) => (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    <span>{value}</span>
                    <button
                      onClick={() => handleRemoveValue(value)}
                      className="text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Add Attribute Button */}
            <button
              onClick={handleCreateAttribute}
              disabled={!newAttribute.name.trim() || newAttribute.values.length === 0}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                newAttribute.name.trim() && newAttribute.values.length > 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <Plus className="h-4 w-4" />
              <span>Add Attribute</span>
            </button>
          </div>
        </div>
        
        {/* Existing Attributes List */}
        {attributes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">
              Defined Attributes ({attributes.length})
            </h4>
            
            <div className="space-y-2">
              {attributes.map((attr) => (
                <div
                  key={attr.name}
                  className="flex items-start justify-between gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{attr.name}</span>
                      <span className="text-xs text-gray-500">
                        ({attr.values.length} value{attr.values.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {attr.values.map((value) => (
                        <span
                          key={value}
                          className="inline-flex items-center px-2.5 py-0.5 bg-primary/10 text-primary rounded text-sm"
                        >
                          {value}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeAttribute(attr.name)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title={`Remove ${attr.name}`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {attributes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm">
              No attributes defined yet. Add your first attribute above to get started.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER: VARIANT TABLE (STEP 2)
  // ============================================================================
  
  const renderVariantTable = () => {
    if (!hasMatrix) {
      return (
        <div className="p-6 text-center text-gray-500">
          <Info className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm">
            Click "Generate Variants" to create the matrix.
          </p>
        </div>
      );
    }
    
    return (
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Step 2: Review & Edit Variants
            </h3>
            <p className="text-sm text-gray-600">
              {matrixCells.length} variant{matrixCells.length !== 1 ? 's' : ''} generated. 
              Click any field to edit.
            </p>
          </div>
          
          <button
            onClick={() => setCurrentStep(1)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>Back to Attributes</span>
          </button>
        </div>
        
        {/* Variant Table with Inline Editing */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  {attributes.map((attr) => (
                    <th
                      key={attr.name}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {attr.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {matrixCells.map((cell) => {
                  const isSelected = selectedCellIds.has(cell.id);
                  const isEditingSKU = editingCell === cell.id && editingField === 'sku';
                  const isEditingPrice = editingCell === cell.id && editingField === 'price';
                  const isEditingStock = editingCell === cell.id && editingField === 'stock';
                  
                  return (
                    <tr 
                      key={cell.id} 
                      className={cn(
                        "transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-gray-50"
                      )}
                    >
                      {/* Selection Checkbox */}
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(cell.id)}
                          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </td>
                      
                      {/* SKU (Editable) */}
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        {isEditingSKU ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              onBlur={handleSaveEdit}
                              className="w-full px-2 py-1 border border-primary rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(cell.id, 'sku', cell.sku)}
                            className="group w-full text-left flex items-center gap-2 hover:text-primary transition-colors"
                          >
                            <span>{cell.sku}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>
                      
                      {/* Attributes (Read-only) */}
                      {attributes.map((attr) => (
                        <td key={attr.name} className="px-4 py-3 text-sm text-gray-700">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded bg-gray-100 text-gray-800">
                            {cell.attributes[attr.name] || '-'}
                          </span>
                        </td>
                      ))}
                      
                      {/* Price (Editable) */}
                      <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                        {isEditingPrice ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              onBlur={handleSaveEdit}
                              className="w-24 px-2 py-1 border border-primary rounded text-right focus:ring-2 focus:ring-primary focus:border-transparent"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(cell.id, 'price', cell.price)}
                            className="group w-full text-right flex items-center justify-end gap-2 hover:text-primary transition-colors"
                          >
                            <span>${cell.price.toFixed(2)}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>
                      
                      {/* Stock (Editable) */}
                      <td className="px-4 py-3 text-sm text-center text-gray-700">
                        {isEditingStock ? (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleEditKeyPress}
                              onBlur={handleSaveEdit}
                              className="w-20 px-2 py-1 border border-primary rounded text-center focus:ring-2 focus:ring-primary focus:border-transparent"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(cell.id, 'stock', cell.stock_quantity)}
                            className="group w-full text-center flex items-center justify-center gap-2 hover:text-primary transition-colors"
                          >
                            <span>{cell.stock_quantity}</span>
                            <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        )}
                      </td>
                      
                      {/* Delete Button */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteVariant(cell.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete variant"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Info Message */}
        <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
          <Info className="h-5 w-5 flex-shrink-0" />
          <span>
            💡 Tip: Click any SKU, price, or stock value to edit. Press Enter to save, Escape to cancel.
          </span>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: MAIN
  // ============================================================================
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Variant Matrix Builder
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Creating variants for: <span className="font-medium">{productName}</span>
              </p>
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                currentStep === 1
                  ? "bg-primary text-primary-foreground"
                  : stepStatus.step1Complete
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-gray-100 text-gray-600"
              )}>
                <span>1. Attributes</span>
                {stepStatus.step1Complete && <CheckCircle2 className="h-4 w-4" />}
              </div>
              
              <ChevronRight className="h-5 w-5 text-gray-400" />
              
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                currentStep === 2
                  ? "bg-primary text-primary-foreground"
                  : stepStatus.step2Complete
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-gray-100 text-gray-600"
              )}>
                <span>2. Review & Edit</span>
                {stepStatus.step2Complete && <CheckCircle2 className="h-4 w-4" />}
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Actions Bar */}
        {renderQuickActions()}
        
        {/* Bulk Action Toolbar */}
        {renderBulkActionToolbar()}
        
        {/* Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 ? renderAttributeDefinition() : renderVariantTable()}
        </div>
      
      {/* Footer Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-4">
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        
        <div className="flex items-center gap-3">
          {currentStep === 2 && (
            <button
              onClick={() => setCurrentStep(1)}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          )}
          
          {currentStep === 1 && canGenerate && (
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80 disabled:opacity-50"
              )}
            >
              <span>Next: Review Variants</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          
          {currentStep === 2 && hasMatrix && (
            <button
              onClick={handleSave}
              disabled={isLoading || !stepStatus.step2Complete}
              className={cn(
                "inline-flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors",
                "bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:opacity-50"
              )}
            >
              <Save className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span>{isLoading ? 'Saving...' : 'Save Variants'}</span>
            </button>
          )}
        </div>
      </div>
      </div>
      
      {/* Modals */}
      {renderBulkPriceModal()}
      {renderBulkStockModal()}
    </>
  );
}

export default VariantMatrixBuilder;