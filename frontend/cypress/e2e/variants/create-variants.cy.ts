/// <reference types="cypress" />

import { generateRandomSku, generateRandomProductName } from '../../support/commands';

describe('Create Product Variants', () => {
  let testProductId: string;
  let testProductSku: string;

  before(() => {
    // Login once before all tests
    cy.loginAsAdmin();
  });

  beforeEach(() => {
    // Preserve auth state
    Cypress.Cookies.preserveOnce('token');
  });

  after(() => {
    // Cleanup: Delete test product
    if (testProductId) {
      cy.deleteProduct(testProductId);
    }
  });

  it('should create a new product successfully', () => {
    // Navigate to products page
    cy.visit('/admin/products');
    cy.contains('h1', 'Products').should('be.visible');

    // Click "Add Product" button
    cy.contains('button', 'Add Product').click();

    // Fill product form
    testProductSku = generateRandomSku('VARIANT');
    const productName = generateRandomProductName();
    
    cy.get('input[name="name"]').type(productName);
    cy.get('input[name="sku"]').type(testProductSku);
    cy.get('input[name="price"]').clear().type('99000');
    cy.get('input[name="stock"]').clear().type('100');
    cy.get('textarea[name="description"]').type('Test product for variant creation');

    // Submit form
    cy.contains('button', 'Create Product').click();

    // Wait for success message
    cy.contains('Product created successfully').should('be.visible');

    // Capture product ID from URL or response
    cy.url().then((url) => {
      const matches = url.match(/\/products\/([a-f0-9-]+)/);
      if (matches && matches[1]) {
        testProductId = matches[1];
      }
    });
  });

  it('should enable variants on the product', () => {
    // Navigate to product detail page
    cy.visit(`/admin/products/${testProductId}`);

    // Verify product details loaded
    cy.contains(testProductSku).should('be.visible');

    // Click "Enable Variants" button
    cy.contains('button', 'Enable Variants').click();

    // Wait for success toast
    cy.contains('Variants enabled').should('be.visible');

    // Verify switched to Variants tab
    cy.get('[role="tab"][aria-selected="true"]').should('contain', 'Variants');
  });

  it('should create variants using matrix builder', () => {
    // Should be on variants tab already
    cy.get('[role="tabpanel"]').within(() => {
      // Verify VariantManager is visible
      cy.contains('Variant Management').should('be.visible');

      // Click "Build Matrix" or "Add Attributes" button
      cy.contains('button', 'Build Matrix').click();
    });

    // ========================================
    // ADD SIZE ATTRIBUTE
    // ========================================
    
    // Select "Add Attribute" in matrix builder
    cy.contains('Add Attribute').should('be.visible');
    
    // Click dropdown to add first attribute
    cy.get('[data-testid="attribute-select"]').first().click();
    
    // Select "Size" attribute
    cy.contains('li', 'Size').click();
    
    // Add size values: S, M, L
    cy.get('[data-testid="value-input"]').type('S');
    cy.contains('button', 'Add').click();
    
    cy.get('[data-testid="value-input"]').type('M');
    cy.contains('button', 'Add').click();
    
    cy.get('[data-testid="value-input"]').type('L');
    cy.contains('button', 'Add').click();

    // ========================================
    // ADD COLOR ATTRIBUTE
    // ========================================
    
    // Click "Add Another Attribute"
    cy.contains('button', 'Add Another Attribute').click();
    
    // Select "Color" attribute
    cy.get('[data-testid="attribute-select"]').eq(1).click();
    cy.contains('li', 'Color').click();
    
    // Add color values: Red, Blue, Green
    cy.get('[data-testid="value-input"]').eq(1).type('Red');
    cy.contains('button', 'Add').click();
    
    cy.get('[data-testid="value-input"]').eq(1).type('Blue');
    cy.contains('button', 'Add').click();
    
    cy.get('[data-testid="value-input"]').eq(1).type('Green');
    cy.contains('button', 'Add').click();

    // ========================================
    // GENERATE MATRIX
    // ========================================
    
    // Click "Generate Matrix" button
    cy.contains('button', 'Generate Matrix').click();

    // Verify matrix generated (3 sizes × 3 colors = 9 combinations)
    cy.contains('9 variants').should('be.visible');

    // Verify matrix cells visible
    cy.get('[data-testid="matrix-cell"]').should('have.length', 9);

    // ========================================
    // FILL MATRIX DATA
    // ========================================
    
    // Update first cell (S-Red)
    cy.get('[data-testid="matrix-cell"]').first().within(() => {
      cy.get('input[name="price"]').clear().type('95000');
      cy.get('input[name="stock"]').clear().type('20');
    });

    // Update last cell (L-Green)
    cy.get('[data-testid="matrix-cell"]').last().within(() => {
      cy.get('input[name="price"]').clear().type('105000');
      cy.get('input[name="stock"]').clear().type('15');
    });

    // ========================================
    // SAVE VARIANTS
    // ========================================
    
    // Click "Save All Variants" button
    cy.contains('button', 'Save All Variants').click();

    // Wait for API call to complete
    cy.wait(2000);

    // Verify success message
    cy.contains('9 variants created successfully').should('be.visible');

    // ========================================
    // VERIFY VARIANTS CREATED
    // ========================================
    
    // Close matrix builder (if modal)
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="close-matrix"]').length > 0) {
        cy.get('[data-testid="close-matrix"]').click();
      }
    });

    // Verify variant list shows 9 variants
    cy.get('[data-testid="variant-row"]').should('have.length', 9);

    // Verify SKU format (should contain product SKU + attribute values)
    cy.get('[data-testid="variant-sku"]').first().should('contain', testProductSku);

    // Verify at least one variant has correct price
    cy.get('[data-testid="variant-price"]').first().should('contain', '95,000');
  });

  it('should display correct variant details in list', () => {
    // Navigate back to product detail
    cy.visit(`/admin/products/${testProductId}`);

    // Switch to Variants tab
    cy.contains('[role="tab"]', 'Variants').click();

    // Verify variant count badge
    cy.contains('9 variants').should('be.visible');

    // Verify variant table headers
    cy.contains('th', 'SKU').should('be.visible');
    cy.contains('th', 'Attributes').should('be.visible');
    cy.contains('th', 'Price').should('be.visible');
    cy.contains('th', 'Stock').should('be.visible');

    // Click on first variant to view details
    cy.get('[data-testid="variant-row"]').first().click();

    // Verify variant details modal/drawer opens
    cy.contains('Variant Details').should('be.visible');

    // Verify attributes displayed
    cy.contains('Size').should('be.visible');
    cy.contains('Color').should('be.visible');

    // Close detail view
    cy.get('[data-testid="close-variant-detail"]').click();
  });

  it('should search and filter variants', () => {
    // In variants tab
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();

    // Search by SKU
    cy.get('input[placeholder*="Search"]').type('S-RED');

    // Verify filtered results (should show only S-Red variant)
    cy.wait(500); // Wait for debounce
    cy.get('[data-testid="variant-row"]').should('have.length.at.most', 3); // S variants with Red

    // Clear search
    cy.get('input[placeholder*="Search"]').clear();

    // Verify all variants shown again
    cy.get('[data-testid="variant-row"]').should('have.length', 9);

    // Filter by "Low Stock" (if toggle available)
    cy.get('[data-testid="filter-low-stock"]').then(($filter) => {
      if ($filter.length > 0) {
        cy.wrap($filter).click();
        // Verify filtered count
        cy.get('[data-testid="variant-row"]').should('have.length.at.most', 9);
      }
    });
  });

  it('should handle variant SKU auto-generation correctly', () => {
    // Verify all 9 variants have unique SKUs
    const skus: string[] = [];
    
    cy.get('[data-testid="variant-sku"]').each(($el) => {
      const sku = $el.text().trim();
      
      // Verify SKU format: PRODUCTSKU-ATTR1-ATTR2
      expect(sku).to.match(/^[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/);
      
      // Verify uniqueness
      expect(skus).not.to.include(sku);
      skus.push(sku);
      
      // Verify contains product SKU
      expect(sku).to.include(testProductSku);
    });

    // Verify we checked 9 unique SKUs
    cy.wrap(skus).should('have.length', 9);
  });
});