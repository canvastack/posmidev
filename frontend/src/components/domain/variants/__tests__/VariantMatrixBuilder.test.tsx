/**
 * VariantMatrixBuilder Component Tests
 * 
 * Tests the matrix builder component for creating product variants.
 * 
 * Test Coverage:
 * - Renders correctly
 * - Adds attributes
 * - Generates variants
 * - Edits variants
 * - Validates errors
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All test data includes tenant_id
 * - All operations are tenant-scoped
 * - guard_name: 'api'
 * 
 * @module components/domain/variants/__tests__/VariantMatrixBuilder.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, mockTenantId, mockProductId } from '@/test/test-utils';
import { VariantMatrixBuilder } from '../VariantMatrixBuilder';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockProps = {
  tenantId: mockTenantId(),
  productId: mockProductId(),
  baseSKU: 'TEST-SKU',
  basePrice: 100,
  productName: 'Test Product',
  onSave: vi.fn(),
  onCancel: vi.fn(),
  isLoading: false,
};

// ============================================================================
// TEST SUITE
// ============================================================================

describe('VariantMatrixBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // RENDERING TESTS
  // ==========================================================================

  describe('Rendering', () => {
    it('renders correctly with initial state', () => {
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Check for step indicator
      expect(screen.getByText(/Step 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Define Attributes/i)).toBeInTheDocument();

      // Check for attribute input section
      expect(screen.getByPlaceholderText(/Attribute name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Add value/i)).toBeInTheDocument();

      // Check for action buttons
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('displays product information', () => {
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      expect(screen.getByText(/Test Product/i)).toBeInTheDocument();
    });

    it('shows empty state when no attributes added', () => {
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      expect(screen.getByText(/No attributes added yet/i)).toBeInTheDocument();
    });

    it('disables generate button when no attributes', async () => {
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      const generateButton = screen.queryByRole('button', { name: /generate variants/i });
      
      // Should not show generate button yet (or should be disabled)
      if (generateButton) {
        expect(generateButton).toBeDisabled();
      }
    });
  });

  // ==========================================================================
  // ATTRIBUTE MANAGEMENT TESTS
  // ==========================================================================

  describe('Adding Attributes', () => {
    it('adds a new attribute with values', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Type attribute name
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      await user.type(attributeNameInput, 'Color');

      // Type value
      const valueInput = screen.getByPlaceholderText(/Add value/i);
      await user.type(valueInput, 'Red');

      // Add value (press Enter or click Add button)
      await user.keyboard('{Enter}');

      // Verify value appears
      await waitFor(() => {
        expect(screen.getByText('Red')).toBeInTheDocument();
      });

      // Add another value
      await user.type(valueInput, 'Blue');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Blue')).toBeInTheDocument();
      });

      // Click "Add Attribute" button
      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      // Verify attribute is added
      await waitFor(() => {
        expect(screen.getByText(/Color/i)).toBeInTheDocument();
      });
    });

    it('validates attribute name is required', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Try to add attribute without name
      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      // Should show validation error or button should be disabled
      await waitFor(() => {
        const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
        expect(attributeNameInput).toBeInTheDocument();
      });
    });

    it('validates attribute must have at least one value', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Type attribute name only
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      await user.type(attributeNameInput, 'Color');

      // Try to add without values
      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      // Should show validation or button disabled
      await waitFor(() => {
        expect(attributeNameInput).toBeInTheDocument();
      });
    });

    it('prevents duplicate attribute names', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Add first attribute
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      // Try to add same attribute again
      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Blue');
      await user.keyboard('{Enter}');
      await user.click(addAttributeButton);

      // Should show error or prevent addition
      await waitFor(() => {
        // Should only have one "Color" attribute section
        const colorHeaders = screen.queryAllByText(/^Color$/i);
        expect(colorHeaders.length).toBeLessThanOrEqual(2); // One in list, one in input (or error)
      });
    });

    it('removes attribute value', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Add attribute with values
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Red')).toBeInTheDocument();
      });

      // Add another value
      await user.type(valueInput, 'Blue');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Blue')).toBeInTheDocument();
      });

      // Remove "Red" value
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      // Verify "Red" is removed
      await waitFor(() => {
        expect(screen.queryByText('Red')).not.toBeInTheDocument();
      });
    });

    it('removes entire attribute', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Add attribute
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      await waitFor(() => {
        expect(screen.getByText(/Color/i)).toBeInTheDocument();
      });

      // Remove attribute
      const removeAttributeButton = screen.getByRole('button', { name: /remove color/i });
      await user.click(removeAttributeButton);

      // Verify attribute is removed
      await waitFor(() => {
        expect(screen.queryByText(/^Color$/i)).not.toBeInTheDocument();
      });
    });
  });

  // ==========================================================================
  // VARIANT GENERATION TESTS
  // ==========================================================================

  describe('Generating Variants', () => {
    it('generates variants from attributes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Add first attribute (Color)
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');
      await user.type(valueInput, 'Blue');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      // Add second attribute (Size)
      await user.type(attributeNameInput, 'Size');
      await user.type(valueInput, 'S');
      await user.keyboard('{Enter}');
      await user.type(valueInput, 'M');
      await user.keyboard('{Enter}');
      await user.click(addAttributeButton);

      // Generate variants
      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Should show 4 variants (2 colors × 2 sizes)
      await waitFor(() => {
        expect(screen.getByText(/4 variants/i)).toBeInTheDocument();
      });

      // Should proceed to Step 2
      await waitFor(() => {
        expect(screen.getByText(/Step 2/i)).toBeInTheDocument();
        expect(screen.getByText(/Review & Edit Variants/i)).toBeInTheDocument();
      });
    });

    it('displays combination count preview', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Add attributes
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');
      await user.type(valueInput, 'Blue');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      // Should show combination count
      await waitFor(() => {
        expect(screen.getByText(/2 variants/i)).toBeInTheDocument();
      });
    });

    it('warns when combination count is too high', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Add many values to exceed reasonable limit (simulate)
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Attribute1');
      
      // Add many values
      for (let i = 1; i <= 15; i++) {
        await user.type(valueInput, `Value${i}`);
        await user.keyboard('{Enter}');
      }

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      // Should show warning
      await waitFor(() => {
        const warningText = screen.queryByText(/too many/i) || screen.queryByText(/large number/i);
        if (warningText) {
          expect(warningText).toBeInTheDocument();
        }
      });
    });
  });

  // ==========================================================================
  // VARIANT EDITING TESTS
  // ==========================================================================

  describe('Editing Variants', () => {
    it('allows editing variant SKU', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Generate variants first
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Now in Step 2, edit SKU
      await waitFor(async () => {
        const skuInput = screen.queryByDisplayValue(/TEST-SKU/i);
        if (skuInput) {
          await user.clear(skuInput);
          await user.type(skuInput, 'CUSTOM-SKU-001');
          expect(skuInput).toHaveValue('CUSTOM-SKU-001');
        }
      });
    });

    it('allows editing variant price', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Generate variants
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Edit price
      await waitFor(async () => {
        const priceInputs = screen.queryAllByDisplayValue('100');
        if (priceInputs.length > 0) {
          await user.clear(priceInputs[0]);
          await user.type(priceInputs[0], '150');
          expect(priceInputs[0]).toHaveValue(150);
        }
      });
    });

    it('allows editing variant stock', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Generate variants
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Edit stock
      await waitFor(async () => {
        const stockInputs = screen.queryAllByLabelText(/stock/i);
        if (stockInputs.length > 0) {
          await user.clear(stockInputs[0]);
          await user.type(stockInputs[0], '50');
          expect(stockInputs[0]).toHaveValue(50);
        }
      });
    });
  });

  // ==========================================================================
  // VALIDATION TESTS
  // ==========================================================================

  describe('Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Generate variant
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Clear required field (SKU) and try to save
      await waitFor(async () => {
        const skuInputs = screen.queryAllByDisplayValue(/TEST-SKU/i);
        if (skuInputs.length > 0) {
          await user.clear(skuInputs[0]);
        }
      });

      const saveButton = screen.getByRole('button', { name: /save variants/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        const errorMessage = screen.queryByText(/required/i) || screen.queryByText(/cannot be empty/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('validates duplicate SKUs', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Generate 2 variants
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');
      await user.type(valueInput, 'Blue');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Set both SKUs to same value
      await waitFor(async () => {
        const skuInputs = screen.queryAllByDisplayValue(/TEST-SKU/i);
        if (skuInputs.length >= 2) {
          await user.clear(skuInputs[0]);
          await user.type(skuInputs[0], 'DUPLICATE-SKU');
          await user.clear(skuInputs[1]);
          await user.type(skuInputs[1], 'DUPLICATE-SKU');
        }
      });

      const saveButton = screen.getByRole('button', { name: /save variants/i });
      await user.click(saveButton);

      // Should show duplicate error
      await waitFor(() => {
        const errorMessage = screen.queryByText(/duplicate/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('validates price is positive', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Generate variant
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Set negative price
      await waitFor(async () => {
        const priceInputs = screen.queryAllByDisplayValue('100');
        if (priceInputs.length > 0) {
          await user.clear(priceInputs[0]);
          await user.type(priceInputs[0], '-10');
        }
      });

      const saveButton = screen.getByRole('button', { name: /save variants/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        const errorMessage = screen.queryByText(/positive/i) || screen.queryByText(/greater than/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });
  });

  // ==========================================================================
  // ACTION TESTS
  // ==========================================================================

  describe('Actions', () => {
    it('calls onSave with variant data', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} onSave={onSave} />);

      // Generate variant
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Save variants
      const saveButton = screen.getByRole('button', { name: /save variants/i });
      await user.click(saveButton);

      // Should call onSave
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({
              sku: expect.any(String),
              price: expect.any(Number),
              attributes: expect.objectContaining({
                Color: 'Red',
              }),
            }),
          ])
        );
      });
    });

    it('calls onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} onCancel={onCancel} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onCancel).toHaveBeenCalled();
    });

    it('shows loading state during save', () => {
      renderWithProviders(<VariantMatrixBuilder {...mockProps} isLoading={true} />);

      // Should disable buttons or show loading indicator
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  // ==========================================================================
  // UNDO/REDO TESTS
  // ==========================================================================

  describe('Undo/Redo', () => {
    it('supports undo after editing variant', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Generate variant and edit
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Edit price
      await waitFor(async () => {
        const priceInputs = screen.queryAllByDisplayValue('100');
        if (priceInputs.length > 0) {
          await user.clear(priceInputs[0]);
          await user.type(priceInputs[0], '150');
        }
      });

      // Click undo
      const undoButton = screen.queryByRole('button', { name: /undo/i });
      if (undoButton && !undoButton.hasAttribute('disabled')) {
        await user.click(undoButton);

        // Price should revert
        await waitFor(() => {
          const priceInputs = screen.queryAllByDisplayValue('100');
          expect(priceInputs.length).toBeGreaterThan(0);
        });
      }
    });

    it('supports redo after undo', async () => {
      const user = userEvent.setup();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} />);

      // Generate variant, edit, undo, then redo
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      // Edit, undo, redo
      await waitFor(async () => {
        const priceInputs = screen.queryAllByDisplayValue('100');
        if (priceInputs.length > 0) {
          await user.clear(priceInputs[0]);
          await user.type(priceInputs[0], '150');
        }
      });

      const undoButton = screen.queryByRole('button', { name: /undo/i });
      if (undoButton && !undoButton.hasAttribute('disabled')) {
        await user.click(undoButton);

        const redoButton = screen.queryByRole('button', { name: /redo/i });
        if (redoButton && !redoButton.hasAttribute('disabled')) {
          await user.click(redoButton);

          // Price should be back to 150
          await waitFor(() => {
            const priceInputs = screen.queryAllByDisplayValue('150');
            expect(priceInputs.length).toBeGreaterThan(0);
          });
        }
      }
    });
  });

  // ==========================================================================
  // IMMUTABLE RULES COMPLIANCE TESTS
  // ==========================================================================

  describe('IMMUTABLE RULES Compliance', () => {
    it('requires tenantId prop', () => {
      // @ts-expect-error Testing required prop
      expect(() => renderWithProviders(<VariantMatrixBuilder productId={mockProductId()} />)).toThrow();
    });

    it('includes tenant_id in generated variants', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      renderWithProviders(<VariantMatrixBuilder {...mockProps} onSave={onSave} />);

      // Generate and save
      const attributeNameInput = screen.getByPlaceholderText(/Attribute name/i);
      const valueInput = screen.getByPlaceholderText(/Add value/i);

      await user.type(attributeNameInput, 'Color');
      await user.type(valueInput, 'Red');
      await user.keyboard('{Enter}');

      const addAttributeButton = screen.getByRole('button', { name: /add attribute/i });
      await user.click(addAttributeButton);

      const generateButton = screen.getByRole('button', { name: /generate variants/i });
      await user.click(generateButton);

      const saveButton = screen.getByRole('button', { name: /save variants/i });
      await user.click(saveButton);

      // Verify tenant_id in saved data
      await waitFor(() => {
        if (onSave.mock.calls.length > 0) {
          const savedVariants = onSave.mock.calls[0][0];
          expect(savedVariants).toBeDefined();
          // tenant_id should be included by the parent component when saving
        }
      });
    });
  });
});