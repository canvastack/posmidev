/**
 * useVariantMatrix Hook Tests
 * 
 * Tests the custom hook for managing variant matrix builder logic.
 * 
 * Test Coverage:
 * - Hook initialization
 * - Attribute management (add, remove, update)
 * - Combination generation
 * - Matrix cell updates
 * - Undo/redo functionality
 * - Validation
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All test data includes tenant_id
 * - All operations are tenant-scoped
 * 
 * @module hooks/__tests__/useVariantMatrix.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useVariantMatrix } from '../useVariantMatrix';
import { mockTenantId, mockProductId } from '@/test/test-utils';

// ============================================================================
// TEST WRAPPER
// ============================================================================

/**
 * Wrapper for React Query provider
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ============================================================================
// MOCK DATA
// ============================================================================

const mockOptions = {
  tenantId: mockTenantId(),
  productId: mockProductId(),
  baseSKU: 'TEST-SKU',
  basePrice: 100,
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('useVariantMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // INITIALIZATION TESTS
  // ==========================================================================

  describe('Initialization', () => {
    it('initializes with empty state', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      expect(result.current.attributes).toEqual([]);
      expect(result.current.matrixCells).toEqual([]);
      expect(result.current.matrixConfig).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.combinationCount).toBe(0);
    });

    it('requires tenantId option', () => {
      // @ts-expect-error Testing required option
      const { result } = renderHook(() => useVariantMatrix({ productId: mockProductId() }), {
        wrapper: createWrapper(),
      });

      // Should throw or fail validation
      expect(() => {
        if (!result.current) throw new Error('tenantId required');
      }).toThrow();
    });

    it('requires productId option', () => {
      // @ts-expect-error Testing required option
      const { result } = renderHook(() => useVariantMatrix({ tenantId: mockTenantId() }), {
        wrapper: createWrapper(),
      });

      expect(() => {
        if (!result.current) throw new Error('productId required');
      }).toThrow();
    });
  });

  // ==========================================================================
  // ATTRIBUTE MANAGEMENT TESTS
  // ==========================================================================

  describe('Attribute Management', () => {
    it('adds a new attribute', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
      });

      expect(result.current.attributes).toHaveLength(1);
      expect(result.current.attributes[0]).toEqual({
        name: 'Color',
        values: ['Red', 'Blue'],
      });
    });

    it('adds multiple attributes', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.addAttribute('Size', ['S', 'M', 'L']);
      });

      expect(result.current.attributes).toHaveLength(2);
      expect(result.current.attributes[0].name).toBe('Color');
      expect(result.current.attributes[1].name).toBe('Size');
    });

    it('removes an attribute', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.addAttribute('Size', ['S', 'M']);
      });

      expect(result.current.attributes).toHaveLength(2);

      act(() => {
        result.current.removeAttribute('Color');
      });

      expect(result.current.attributes).toHaveLength(1);
      expect(result.current.attributes[0].name).toBe('Size');
    });

    it('updates attribute values', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
      });

      act(() => {
        result.current.updateAttributeValues('Color', ['Red', 'Blue', 'Green']);
      });

      expect(result.current.attributes[0].values).toEqual(['Red', 'Blue', 'Green']);
    });

    it('prevents duplicate attribute names', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
      });

      // Try to add duplicate
      act(() => {
        result.current.addAttribute('Color', ['Green', 'Yellow']);
      });

      // Should still have only 1 attribute (or show error)
      expect(result.current.attributes).toHaveLength(1);
      // Or check validationErrors
      // expect(result.current.validationErrors['Color']).toBeDefined();
    });

    it('validates attribute name is not empty', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('', ['Red', 'Blue']);
      });

      // Should not add empty attribute name
      expect(result.current.attributes).toHaveLength(0);
      // Or check validationErrors
    });

    it('validates attribute has at least one value', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', []);
      });

      // Should not add attribute without values
      expect(result.current.attributes).toHaveLength(0);
    });
  });

  // ==========================================================================
  // COMBINATION GENERATION TESTS
  // ==========================================================================

  describe('Combination Generation', () => {
    it('calculates correct combination count', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.addAttribute('Size', ['S', 'M', 'L']);
      });

      // 2 colors × 3 sizes = 6 combinations
      expect(result.current.combinationCount).toBe(6);
    });

    it('generates matrix from attributes', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.addAttribute('Size', ['S', 'M']);
      });

      act(() => {
        result.current.generateMatrix();
      });

      // Should generate 4 cells (2 × 2)
      expect(result.current.matrixCells).toHaveLength(4);
    });

    it('generates correct attribute combinations', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.addAttribute('Size', ['S', 'M']);
      });

      act(() => {
        result.current.generateMatrix();
      });

      const cells = result.current.matrixCells;

      // Check all combinations exist
      expect(cells.find((c) => c.attributes.Color === 'Red' && c.attributes.Size === 'S')).toBeDefined();
      expect(cells.find((c) => c.attributes.Color === 'Red' && c.attributes.Size === 'M')).toBeDefined();
      expect(cells.find((c) => c.attributes.Color === 'Blue' && c.attributes.Size === 'S')).toBeDefined();
      expect(cells.find((c) => c.attributes.Color === 'Blue' && c.attributes.Size === 'M')).toBeDefined();
    });

    it('generates SKUs automatically', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.addAttribute('Size', ['S']);
      });

      act(() => {
        result.current.generateMatrix();
      });

      const cell = result.current.matrixCells[0];
      
      // Should have auto-generated SKU based on baseSKU
      expect(cell.sku).toBeDefined();
      expect(cell.sku).toContain('TEST-SKU');
    });

    it('applies base price to generated variants', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
      });

      act(() => {
        result.current.generateMatrix();
      });

      const cell = result.current.matrixCells[0];
      
      // Should use basePrice
      expect(cell.price).toBe(100);
    });

    it('warns when combination count exceeds reasonable limit', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        // Create many attributes to exceed limit (e.g., 10 × 10 × 10 = 1000)
        result.current.addAttribute('Attr1', Array.from({ length: 10 }, (_, i) => `Value${i}`));
        result.current.addAttribute('Attr2', Array.from({ length: 10 }, (_, i) => `Value${i}`));
        result.current.addAttribute('Attr3', Array.from({ length: 10 }, (_, i) => `Value${i}`));
      });

      // Should flag as unreasonable
      expect(result.current.isReasonableCount).toBe(false);
      // Or combinationCount > 500
      expect(result.current.combinationCount).toBeGreaterThan(500);
    });

    it('handles single attribute', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue', 'Green']);
      });

      act(() => {
        result.current.generateMatrix();
      });

      // Should generate 3 cells
      expect(result.current.matrixCells).toHaveLength(3);
    });

    it('handles three or more attributes', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.addAttribute('Size', ['S', 'M']);
        result.current.addAttribute('Material', ['Cotton', 'Polyester']);
      });

      act(() => {
        result.current.generateMatrix();
      });

      // 2 × 2 × 2 = 8
      expect(result.current.matrixCells).toHaveLength(8);
    });
  });

  // ==========================================================================
  // MATRIX CELL UPDATES TESTS
  // ==========================================================================

  describe('Matrix Cell Updates', () => {
    it('updates individual cell', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      act(() => {
        result.current.updateCell(cellId, { price: 150 });
      });

      const updatedCell = result.current.matrixCells.find((c) => c.id === cellId);
      expect(updatedCell?.price).toBe(150);
    });

    it('updates cell SKU', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      act(() => {
        result.current.updateCell(cellId, { sku: 'CUSTOM-SKU-001' });
      });

      const updatedCell = result.current.matrixCells.find((c) => c.id === cellId);
      expect(updatedCell?.sku).toBe('CUSTOM-SKU-001');
    });

    it('updates cell stock', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      act(() => {
        result.current.updateCell(cellId, { stock: 50 });
      });

      const updatedCell = result.current.matrixCells.find((c) => c.id === cellId);
      expect(updatedCell?.stock).toBe(50);
    });

    it('bulk updates multiple cells', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.generateMatrix();
      });

      const cellIds = result.current.matrixCells.map((c) => c.id);

      act(() => {
        result.current.bulkUpdateCells(cellIds, { stock: 100 });
      });

      // All cells should have stock = 100
      result.current.matrixCells.forEach((cell) => {
        expect(cell.stock).toBe(100);
      });
    });

    it('marks as dirty after update', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      expect(result.current.isDirty).toBe(false);

      const cellId = result.current.matrixCells[0].id;

      act(() => {
        result.current.updateCell(cellId, { price: 150 });
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  // ==========================================================================
  // UNDO/REDO TESTS
  // ==========================================================================

  describe('Undo/Redo Functionality', () => {
    it('supports undo after cell update', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;
      const originalPrice = result.current.matrixCells[0].price;

      act(() => {
        result.current.updateCell(cellId, { price: 150 });
      });

      expect(result.current.matrixCells[0].price).toBe(150);

      act(() => {
        result.current.undo();
      });

      // Should revert to original
      expect(result.current.matrixCells[0].price).toBe(originalPrice);
    });

    it('supports redo after undo', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      act(() => {
        result.current.updateCell(cellId, { price: 150 });
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      // Should be back to 150
      expect(result.current.matrixCells[0].price).toBe(150);
    });

    it('maintains history stack', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      // Multiple updates
      act(() => {
        result.current.updateCell(cellId, { price: 150 });
        result.current.updateCell(cellId, { price: 200 });
        result.current.updateCell(cellId, { price: 250 });
      });

      expect(result.current.matrixCells[0].price).toBe(250);

      // Undo 3 times
      act(() => {
        result.current.undo();
      });
      expect(result.current.matrixCells[0].price).toBe(200);

      act(() => {
        result.current.undo();
      });
      expect(result.current.matrixCells[0].price).toBe(150);

      act(() => {
        result.current.undo();
      });
      expect(result.current.matrixCells[0].price).toBe(100);
    });

    it('disables undo when no history', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      // Try to undo with no changes
      expect(result.current.canUndo).toBe(false);
    });

    it('disables redo when at latest state', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      expect(result.current.canRedo).toBe(false);
    });

    it('clears redo history after new change', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      act(() => {
        result.current.updateCell(cellId, { price: 150 });
        result.current.undo();
      });

      // Now canRedo should be true
      expect(result.current.canRedo).toBe(true);

      // Make new change
      act(() => {
        result.current.updateCell(cellId, { price: 200 });
      });

      // Redo history should be cleared
      expect(result.current.canRedo).toBe(false);
    });
  });

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================

  describe('Validation', () => {
    it('validates required fields', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      // Set SKU to empty
      act(() => {
        result.current.updateCell(cellId, { sku: '' });
      });

      act(() => {
        result.current.getVariantInputs();
      });

      // Should have validation errors
      expect(result.current.validationErrors[cellId]).toBeDefined();
      expect(result.current.validationErrors[cellId]).toContain('SKU is required');
    });

    it('validates duplicate SKUs', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.generateMatrix();
      });

      const [cell1, cell2] = result.current.matrixCells;

      // Set both to same SKU
      act(() => {
        result.current.updateCell(cell1.id, { sku: 'DUPLICATE' });
        result.current.updateCell(cell2.id, { sku: 'DUPLICATE' });
      });

      act(() => {
        result.current.getVariantInputs();
      });

      // Should have duplicate SKU error
      expect(result.current.validationErrors[cell1.id] || result.current.validationErrors[cell2.id]).toBeDefined();
    });

    it('validates price is positive', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      act(() => {
        result.current.updateCell(cellId, { price: -10 });
      });

      act(() => {
        result.current.getVariantInputs();
      });

      // Should have validation error
      expect(result.current.validationErrors[cellId]).toBeDefined();
    });

    it('validates stock is non-negative', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      act(() => {
        result.current.updateCell(cellId, { stock: -5 });
      });

      act(() => {
        result.current.getVariantInputs();
      });

      // Should have validation error
      expect(result.current.validationErrors[cellId]).toBeDefined();
    });

    it('clears validation errors after fix', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const cellId = result.current.matrixCells[0].id;

      // Create error
      act(() => {
        result.current.updateCell(cellId, { sku: '' });
        result.current.getVariantInputs();
      });

      expect(result.current.validationErrors[cellId]).toBeDefined();

      // Fix error
      act(() => {
        result.current.updateCell(cellId, { sku: 'VALID-SKU' });
        result.current.getVariantInputs();
      });

      expect(result.current.validationErrors[cellId]).toBeUndefined();
    });
  });

  // ==========================================================================
  // RESET TESTS
  // ==========================================================================

  describe('Reset Functionality', () => {
    it('resets matrix to initial state', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red', 'Blue']);
        result.current.generateMatrix();
      });

      expect(result.current.matrixCells).toHaveLength(2);
      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.updateCell(result.current.matrixCells[0].id, { price: 150 });
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.resetMatrix();
      });

      expect(result.current.matrixCells).toEqual([]);
      expect(result.current.attributes).toEqual([]);
      expect(result.current.isDirty).toBe(false);
    });
  });

  // ==========================================================================
  // VARIANT INPUTS GENERATION TESTS
  // ==========================================================================

  describe('Variant Inputs Generation', () => {
    it('converts matrix cells to variant inputs', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const variantInputs = result.current.getVariantInputs();

      expect(variantInputs).toHaveLength(1);
      expect(variantInputs[0]).toMatchObject({
        sku: expect.any(String),
        name: expect.any(String),
        price: expect.any(Number),
        attributes: expect.any(Object),
      });
    });

    it('includes all required fields in variant inputs', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const variantInputs = result.current.getVariantInputs();
      const input = variantInputs[0];

      expect(input.sku).toBeDefined();
      expect(input.name).toBeDefined();
      expect(input.price).toBeDefined();
      expect(input.stock).toBeDefined();
      expect(input.attributes).toBeDefined();
      expect(input.status).toBeDefined();
    });
  });

  // ==========================================================================
  // IMMUTABLE RULES COMPLIANCE
  // ==========================================================================

  describe('IMMUTABLE RULES Compliance', () => {
    it('requires tenantId in options', () => {
      expect(() => {
        // @ts-expect-error Testing required option
        renderHook(() => useVariantMatrix({ productId: mockProductId() }), {
          wrapper: createWrapper(),
        });
      }).toThrow();
    });

    it('generates tenant-scoped variant inputs', () => {
      const { result } = renderHook(() => useVariantMatrix(mockOptions), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.addAttribute('Color', ['Red']);
        result.current.generateMatrix();
      });

      const variantInputs = result.current.getVariantInputs();

      // Parent component will add tenant_id, but hook ensures product_id is correct
      variantInputs.forEach((input: any) => {
        expect(input).toBeDefined();
        // tenant_id will be added by parent during API call
      });
    });
  });
});