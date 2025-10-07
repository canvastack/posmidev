/// <reference types="cypress" />

import { generateRandomSku, generateRandomProductName } from '../../support/commands';

describe('Variant Template Usage', () => {
  let testProductId: string;

  beforeEach(() => {
    cy.loginAsAdmin();
    
    // Create fresh product for each test
    const productData = {
      name: generateRandomProductName(),
      sku: generateRandomSku('TMPL'),
      price: 50000,
      stock: 100,
    };

    cy.createProduct(productData).then((product) => {
      testProductId = product.id;
    });

    Cypress.Cookies.preserveOnce('token');
  });

  afterEach(() => {
    if (testProductId) {
      cy.deleteProduct(testProductId);
    }
  });

  it('should open template gallery from variant manager', () => {
    // Navigate to product and enable variants
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('button', 'Enable Variants').click();

    // Verify switched to variants tab
    cy.get('[role="tab"][aria-selected="true"]').should('contain', 'Variants');

    // Click "Use Template" button
    cy.contains('button', 'Use Template').click();

    // Verify template gallery modal opened
    cy.contains('Variant Templates').should('be.visible');
    cy.contains('Quick-start with pre-configured attribute combinations').should('be.visible');

    // Verify search box visible
    cy.get('input[placeholder*="Search templates"]').should('be.visible');

    // Verify filter tabs visible
    cy.contains('button', 'All').should('be.visible');
    cy.contains('button', 'System').should('be.visible');
    cy.contains('button', 'Custom').should('be.visible');
  });

  it('should display system templates correctly', () => {
    // Open template gallery
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('button', 'Enable Variants').click();
    cy.contains('button', 'Use Template').click();

    // Filter by "System" templates
    cy.contains('button', 'System').click();

    // Verify at least 4 system templates visible
    cy.get('[data-testid="template-card"]').should('have.length.at.least', 4);

    // Verify "Apparel - Size & Color" template exists
    cy.contains('[data-testid="template-card"]', 'Apparel - Size & Color').should('be.visible');

    // Verify template shows variant count
    cy.contains('12 variants').should('be.visible');

    // Verify template shows category icon
    cy.get('[data-testid="template-icon"]').should('be.visible');
  });

  it('should preview template before applying', () => {
    // Open template gallery
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('button', 'Enable Variants').click();
    cy.contains('button', 'Use Template').click();

    // Click on "Apparel - Size & Color" template
    cy.contains('[data-testid="template-card"]', 'Apparel - Size & Color').click();

    // Verify template selected (highlighted)
    cy.contains('[data-testid="template-card"]', 'Apparel - Size & Color')
      .should('have.class', 'border-primary');

    // Verify preview panel shows template details
    cy.get('[data-testid="template-preview"]').within(() => {
      cy.contains('Apparel - Size & Color').should('be.visible');
      cy.contains('12 variants will be created').should('be.visible');

      // Verify attributes listed
      cy.contains('Size').should('be.visible');
      cy.contains('S, M, L, XL').should('be.visible');
      cy.contains('Color').should('be.visible');
      cy.contains('Black, White, Gray').should('be.visible');
    });

    // Verify "Apply Template" button enabled
    cy.contains('button', 'Apply Template').should('not.be.disabled');
  });

  it('should apply template and create variants successfully', () => {
    // Open template gallery
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('button', 'Enable Variants').click();
    cy.contains('button', 'Use Template').click();

    // Select "Apparel - Size & Color" template
    cy.contains('[data-testid="template-card"]', 'Apparel - Size & Color').click();

    // Configure base stock (optional)
    cy.get('input[name="base_stock"]').clear().type('25');

    // Apply template
    cy.contains('button', 'Apply Template').click();

    // Verify confirmation dialog
    cy.contains('Create 12 Variants?').should('be.visible');
    cy.contains('button', 'Create Variants').click();

    // Wait for API call
    cy.wait(2000);

    // Verify success message
    cy.contains('12 variants created from template').should('be.visible');

    // Verify modal closed
    cy.contains('Variant Templates').should('not.exist');

    // Verify variants created in list
    cy.get('[data-testid="variant-row"]').should('have.length', 12);

    // Verify first variant has correct attributes
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="variant-attributes"]').should('contain', 'Size');
      cy.get('[data-testid="variant-attributes"]').should('contain', 'Color');
    });

    // Verify stock set correctly (base_stock = 25)
    cy.get('[data-testid="variant-stock"]').first().should('contain', '25');
  });

  it('should search templates by name or category', () => {
    // Open template gallery
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('button', 'Enable Variants').click();
    cy.contains('button', 'Use Template').click();

    // Search for "shoes"
    cy.get('input[placeholder*="Search templates"]').type('Shoes');

    // Wait for search debounce
    cy.wait(500);

    // Verify only shoe templates shown
    cy.get('[data-testid="template-card"]').each(($card) => {
      cy.wrap($card).should('contain', 'Shoes');
    });

    // Clear search
    cy.get('input[placeholder*="Search templates"]').clear();

    // Search by category "Electronics"
    cy.get('input[placeholder*="Search templates"]').type('Electronics');
    cy.wait(500);

    // Verify electronics templates shown
    cy.contains('[data-testid="template-card"]', 'Electronics').should('be.visible');
  });

  it('should filter templates by type (System/Custom)', () => {
    // Open template gallery
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('button', 'Enable Variants').click();
    cy.contains('button', 'Use Template').click();

    // Initially "All" tab selected
    const allCount = Cypress.$('[data-testid="template-card"]').length;

    // Click "System" tab
    cy.contains('button', 'System').click();

    // Verify only system templates shown (should have 'system' badge)
    cy.get('[data-testid="template-card"]').each(($card) => {
      cy.wrap($card).find('[data-testid="template-type"]').should('contain', 'System');
    });

    // Click "Custom" tab
    cy.contains('button', 'Custom').click();

    // If no custom templates, show empty state
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="template-card"]').length === 0) {
        cy.contains('No custom templates yet').should('be.visible');
        cy.contains('Create your first template').should('be.visible');
      } else {
        // If custom templates exist, verify they have 'custom' badge
        cy.get('[data-testid="template-card"]').each(($card) => {
          cy.wrap($card).find('[data-testid="template-type"]').should('contain', 'Custom');
        });
      }
    });
  });

  it('should handle template application errors gracefully', () => {
    // Open template gallery
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('button', 'Enable Variants').click();
    cy.contains('button', 'Use Template').click();

    // Select a template
    cy.get('[data-testid="template-card"]').first().click();

    // Set invalid base stock
    cy.get('input[name="base_stock"]').clear().type('-10');

    // Try to apply
    cy.contains('button', 'Apply Template').click();

    // Verify validation error
    cy.contains('Stock must be 0 or greater').should('be.visible');

    // Verify modal still open
    cy.contains('Variant Templates').should('be.visible');

    // Fix stock value
    cy.get('input[name="base_stock"]').clear().type('10');

    // Now apply should work
    cy.contains('button', 'Apply Template').click();
    cy.contains('button', 'Create Variants').click();

    // Verify success
    cy.wait(2000);
    cy.contains('variants created from template').should('be.visible');
  });

  it('should close template gallery without applying', () => {
    // Open template gallery
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('button', 'Enable Variants').click();
    cy.contains('button', 'Use Template').click();

    // Verify modal open
    cy.contains('Variant Templates').should('be.visible');

    // Click close button (X)
    cy.get('[data-testid="close-template-gallery"]').click();

    // Verify modal closed
    cy.contains('Variant Templates').should('not.exist');

    // Verify no variants created
    cy.get('[data-testid="variant-row"]').should('have.length', 0);

    // Verify still on variants tab
    cy.get('[role="tab"][aria-selected="true"]').should('contain', 'Variants');
  });
});