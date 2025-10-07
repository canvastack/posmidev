/**
 * Variant Store - Zustand
 * Phase 6: Product Variants
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All state is tenant-scoped
 * - No global variant data across tenants
 * - tenantId is required for all operations
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProductVariant,
  VariantAttribute,
  VariantTemplate,
  VariantMatrixConfig,
  VariantMatrixCell,
  VariantFilters,
} from '../types/variant';

// ========================================
// STATE INTERFACE
// ========================================

interface VariantState {
  // Current variants (cached)
  variants: ProductVariant[];
  currentVariant: ProductVariant | null;
  
  // Attributes & Templates
  attributes: VariantAttribute[];
  templates: VariantTemplate[];
  popularAttributes: VariantAttribute[];
  
  // Matrix Builder State
  matrixConfig: VariantMatrixConfig | null;
  matrixCells: VariantMatrixCell[];
  isDirty: boolean;
  
  // Filters & Search
  filters: VariantFilters;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  selectedVariantIds: string[];
  
  // ========================================
  // ACTIONS: Variants
  // ========================================
  
  /**
   * Set variants list
   */
  setVariants: (variants: ProductVariant[]) => void;
  
  /**
   * Add a variant to the list
   */
  addVariant: (variant: ProductVariant) => void;
  
  /**
   * Update a variant in the list
   */
  updateVariant: (variantId: string, updates: Partial<ProductVariant>) => void;
  
  /**
   * Remove a variant from the list
   */
  removeVariant: (variantId: string) => void;
  
  /**
   * Set current variant
   */
  setCurrentVariant: (variant: ProductVariant | null) => void;
  
  /**
   * Clear all variants
   */
  clearVariants: () => void;
  
  // ========================================
  // ACTIONS: Attributes
  // ========================================
  
  /**
   * Set attributes list
   */
  setAttributes: (attributes: VariantAttribute[]) => void;
  
  /**
   * Add an attribute
   */
  addAttribute: (attribute: VariantAttribute) => void;
  
  /**
   * Update an attribute
   */
  updateAttribute: (attributeId: string, updates: Partial<VariantAttribute>) => void;
  
  /**
   * Remove an attribute
   */
  removeAttribute: (attributeId: string) => void;
  
  /**
   * Set popular attributes
   */
  setPopularAttributes: (attributes: VariantAttribute[]) => void;
  
  // ========================================
  // ACTIONS: Templates
  // ========================================
  
  /**
   * Set templates list
   */
  setTemplates: (templates: VariantTemplate[]) => void;
  
  /**
   * Add a template
   */
  addTemplate: (template: VariantTemplate) => void;
  
  /**
   * Update a template
   */
  updateTemplate: (templateId: string, updates: Partial<VariantTemplate>) => void;
  
  /**
   * Remove a template
   */
  removeTemplate: (templateId: string) => void;
  
  // ========================================
  // ACTIONS: Matrix Builder
  // ========================================
  
  /**
   * Initialize matrix builder with config
   */
  initializeMatrix: (config: VariantMatrixConfig, cells?: VariantMatrixCell[]) => void;
  
  /**
   * Update matrix cell
   */
  updateMatrixCell: (
    combination: Record<string, string>,
    updates: Partial<VariantMatrixCell>
  ) => void;
  
  /**
   * Bulk update matrix cells
   */
  bulkUpdateMatrixCells: (updates: Partial<VariantMatrixCell>) => void;
  
  /**
   * Reset matrix builder
   */
  resetMatrix: () => void;
  
  /**
   * Mark matrix as dirty/clean
   */
  setDirty: (isDirty: boolean) => void;
  
  /**
   * Get matrix cells as variant inputs
   */
  getMatrixVariantInputs: () => any[];
  
  // ========================================
  // ACTIONS: Filters
  // ========================================
  
  /**
   * Update filters
   */
  setFilters: (filters: Partial<VariantFilters>) => void;
  
  /**
   * Reset filters
   */
  resetFilters: () => void;
  
  /**
   * Set search query
   */
  setSearch: (search: string) => void;
  
  // ========================================
  // ACTIONS: Selection
  // ========================================
  
  /**
   * Select variant IDs
   */
  setSelectedVariantIds: (ids: string[]) => void;
  
  /**
   * Toggle variant selection
   */
  toggleVariantSelection: (id: string) => void;
  
  /**
   * Select all variants
   */
  selectAllVariants: () => void;
  
  /**
   * Clear selection
   */
  clearSelection: () => void;
  
  // ========================================
  // ACTIONS: UI State
  // ========================================
  
  /**
   * Set loading state
   */
  setLoading: (isLoading: boolean) => void;
  
  /**
   * Set error
   */
  setError: (error: string | null) => void;
  
  /**
   * Clear error
   */
  clearError: () => void;
  
  /**
   * Reset entire store
   */
  reset: () => void;
}

// ========================================
// INITIAL STATE
// ========================================

const initialState = {
  variants: [],
  currentVariant: null,
  attributes: [],
  templates: [],
  popularAttributes: [],
  matrixConfig: null,
  matrixCells: [],
  isDirty: false,
  filters: {
    search: '',
    attributes: {},
  },
  isLoading: false,
  error: null,
  selectedVariantIds: [],
};

// ========================================
// STORE IMPLEMENTATION
// ========================================

export const useVariantStore = create<VariantState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // ========================================
      // VARIANTS
      // ========================================
      
      setVariants: (variants) =>
        set({ variants, error: null }),
      
      addVariant: (variant) =>
        set((state) => ({
          variants: [...state.variants, variant],
        })),
      
      updateVariant: (variantId, updates) =>
        set((state) => ({
          variants: state.variants.map((v) =>
            v.id === variantId ? { ...v, ...updates } : v
          ),
        })),
      
      removeVariant: (variantId) =>
        set((state) => ({
          variants: state.variants.filter((v) => v.id !== variantId),
          selectedVariantIds: state.selectedVariantIds.filter((id) => id !== variantId),
        })),
      
      setCurrentVariant: (variant) =>
        set({ currentVariant: variant }),
      
      clearVariants: () =>
        set({ variants: [], currentVariant: null }),
      
      // ========================================
      // ATTRIBUTES
      // ========================================
      
      setAttributes: (attributes) =>
        set({ attributes }),
      
      addAttribute: (attribute) =>
        set((state) => ({
          attributes: [...state.attributes, attribute],
        })),
      
      updateAttribute: (attributeId, updates) =>
        set((state) => ({
          attributes: state.attributes.map((a) =>
            a.id === attributeId ? { ...a, ...updates } : a
          ),
        })),
      
      removeAttribute: (attributeId) =>
        set((state) => ({
          attributes: state.attributes.filter((a) => a.id !== attributeId),
        })),
      
      setPopularAttributes: (attributes) =>
        set({ popularAttributes: attributes }),
      
      // ========================================
      // TEMPLATES
      // ========================================
      
      setTemplates: (templates) =>
        set({ templates }),
      
      addTemplate: (template) =>
        set((state) => ({
          templates: [...state.templates, template],
        })),
      
      updateTemplate: (templateId, updates) =>
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === templateId ? { ...t, ...updates } : t
          ),
        })),
      
      removeTemplate: (templateId) =>
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== templateId),
        })),
      
      // ========================================
      // MATRIX BUILDER
      // ========================================
      
      initializeMatrix: (config, cells) => {
        // Use provided cells or generate from config
        const matrixCells = cells || generateMatrixCells(config);
        set({
          matrixConfig: config,
          matrixCells,
          isDirty: false,
        });
      },
      
      updateMatrixCell: (combination, updates) =>
        set((state) => ({
          matrixCells: state.matrixCells.map((cell) =>
            isSameCombination(cell.combination, combination)
              ? { ...cell, ...updates, isDirty: true }
              : cell
          ),
          isDirty: true,
        })),
      
      bulkUpdateMatrixCells: (updates) =>
        set((state) => ({
          matrixCells: state.matrixCells.map((cell) => ({
            ...cell,
            ...updates,
            isDirty: true,
          })),
          isDirty: true,
        })),
      
      resetMatrix: () =>
        set({
          matrixConfig: null,
          matrixCells: [],
          isDirty: false,
        }),
      
      setDirty: (isDirty) =>
        set({ isDirty }),
      
      getMatrixVariantInputs: () => {
        const { matrixCells, matrixConfig } = get();
        if (!matrixConfig) return [];
        
        return matrixCells
          .filter((cell) => cell.isNew || cell.isDirty)
          .map((cell) => ({
            sku: cell.sku || '',
            name: generateVariantName(cell.combination),
            attributes: cell.combination,
            price: cell.price || matrixConfig.basePrice,
            stock: cell.stock || matrixConfig.baseStock,
            is_active: true,
          }));
      },
      
      // ========================================
      // FILTERS
      // ========================================
      
      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),
      
      resetFilters: () =>
        set({
          filters: {
            search: '',
            attributes: {},
          },
        }),
      
      setSearch: (search) =>
        set((state) => ({
          filters: { ...state.filters, search },
        })),
      
      // ========================================
      // SELECTION
      // ========================================
      
      setSelectedVariantIds: (ids) =>
        set({ selectedVariantIds: ids }),
      
      toggleVariantSelection: (id) =>
        set((state) => ({
          selectedVariantIds: state.selectedVariantIds.includes(id)
            ? state.selectedVariantIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedVariantIds, id],
        })),
      
      selectAllVariants: () =>
        set((state) => ({
          selectedVariantIds: state.variants.map((v) => v.id),
        })),
      
      clearSelection: () =>
        set({ selectedVariantIds: [] }),
      
      // ========================================
      // UI STATE
      // ========================================
      
      setLoading: (isLoading) =>
        set({ isLoading }),
      
      setError: (error) =>
        set({ error, isLoading: false }),
      
      clearError: () =>
        set({ error: null }),
      
      reset: () =>
        set(initialState),
    }),
    {
      name: 'variant-storage',
      // Only persist certain fields (not loading states, errors, etc.)
      partialize: (state) => ({
        filters: state.filters,
        selectedVariantIds: state.selectedVariantIds,
      }),
    }
  )
);

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Generate matrix cells from config
 */
function generateMatrixCells(config: VariantMatrixConfig): VariantMatrixCell[] {
  const { attributes, basePrice, baseStock } = config;
  
  if (attributes.length === 0) return [];
  
  // Generate all combinations
  const combinations = generateCombinations(
    attributes.map((attr) => attr.values),
    attributes.map((attr) => attr.name)
  );
  
  return combinations.map((combination) => ({
    combination,
    isNew: true,
    isDirty: false,
    price: basePrice,
    stock: baseStock,
  }));
}

/**
 * Generate all combinations recursively
 */
function generateCombinations(
  valueSets: string[][],
  keys: string[]
): Record<string, string>[] {
  if (valueSets.length === 0) return [{}];
  
  const [firstSet, ...restSets] = valueSets;
  const [firstKey, ...restKeys] = keys;
  const restCombinations = generateCombinations(restSets, restKeys);
  
  const combinations: Record<string, string>[] = [];
  for (const value of firstSet) {
    for (const restCombination of restCombinations) {
      combinations.push({
        [firstKey]: value,
        ...restCombination,
      });
    }
  }
  
  return combinations;
}

/**
 * Check if two combinations are the same
 */
function isSameCombination(
  a: Record<string, string>,
  b: Record<string, string>
): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  
  if (keysA.length !== keysB.length) return false;
  
  for (let i = 0; i < keysA.length; i++) {
    if (keysA[i] !== keysB[i]) return false;
    if (a[keysA[i]] !== b[keysB[i]]) return false;
  }
  
  return true;
}

/**
 * Generate variant name from combination
 */
function generateVariantName(combination: Record<string, string>): string {
  return Object.entries(combination)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
}

export default useVariantStore;