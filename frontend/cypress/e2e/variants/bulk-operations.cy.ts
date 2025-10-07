/// <reference types="cypress" />

import { generateRandomSku, generateRandomProductName } from '../../support/commands';

describe('Bulk Variant Operations', () => {
  let testProductId: string;

  before(() => {
    cy.loginAsAdmin();

    // Create test product with multiple variants
    const productData = {
      name: generateRandomProductName(),
      sku: generateRandomSku('BULK'),
      price: 60000,
      stock: 100,
    };

    cy.createProduct(productData).then((product) => {
      testProductId = product.id;

      // Enable variants and create 5 test variants
      const tenantId = Cypress.env('testTenantId');
      const apiUrl = Cypress.env('apiUrl');
      const token = localStorage.getItem('token');

      // Enable variants
      cy.request({
        method: 'PUT',
        url: `${apiUrl}/tenants/${tenantId}/products/${testProductId}`,
        headers: { 'Authorization': `Bearer ${token}` },
        body: { has_variants: true },
      });

      // Create 5 variants
      const sizes = ['XS', 'S', 'M', 'L', 'XL'];
      sizes.forEach((size, index) => {
        cy.request({
          method: 'POST',
          url: `${apiUrl}/tenants/${tenantId}/products/${testProductId}/variants`,
          headers: { 'Authorization': `Bearer ${token}` },
          body: {
            sku: `${productData.sku}-${size}`,
            name: `Size ${size}`,
            price: 60000 + (index * 5000),
            stock: 20,
            attributes: { Size: size },
            is_active: true,
          },
        });
      });
    });
  });

  beforeEach(() => {
    Cypress.Cookies.preserveOnce('token');
  });

  after(() => {
    if (testProductId) {
      cy.deleteProduct(testProductId);
    }
  });

  it('should select multiple variants using checkboxes', () => {
    // Navigate to variants tab
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();

    // Wait for variants to load
    cy.get('[data-testid="variant-row"]').should('have.length', 5);

    // Select first 3 variants
    cy.get('[data-testid="variant-checkbox"]').eq(0).click();
    cy.get('[data-testid="variant-checkbox"]').eq(1).click();
    cy.get('[data-testid="variant-checkbox"]').eq(2).click();

    // Verify selection count
    cy.contains('3 selected').should('be.visible');

    // Verify bulk action bar visible
    cy.get('[data-testid="bulk-action-bar"]').should('be.visible');
  });

  it('should select all variants using header checkbox', () => {
    // Visit variants tab
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();

    // Click "Select All" checkbox in header
    cy.get('[data-testid="select-all-checkbox"]').click();

    // Verify all 5 variants selected
    cy.contains('5 selected').should('be.visible');

    // Verify all checkboxes checked
    cy.get('[data-testid="variant-checkbox"]').each(($checkbox) => {
      cy.wrap($checkbox).should('be.checked');
    });

    // Unselect all
    cy.get('[data-testid="select-all-checkbox"]').click();

    // Verify none selected
    cy.contains('selected').should('not.exist');
  });

  it('should bulk update prices by percentage', () => {
    // Select 3 variants
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();
    
    cy.get('[data-testid="variant-checkbox"]').eq(0).click();
    cy.get('[data-testid="variant-checkbox"]').eq(1).click();
    cy.get('[data-testid="variant-checkbox"]').eq(2).click();

    // Click "Bulk Edit" button
    cy.contains('button', 'Bulk Edit').click();

    // Verify bulk edit modal opened
    cy.contains('Bulk Edit Variants').should('be.visible');
    cy.contains('3 variants will be updated').should('be.visible');

    // Select "Update Price"
    cy.get('[data-testid="bulk-action-select"]').click();
    cy.contains('li', 'Update Price').click();

    // Select "Percentage" mode
    cy.get('[data-testid="price-mode"]').click();
    cy.contains('li', 'Percentage').click();

    // Enter +10% increase
    cy.get('input[name="price_adjustment"]').clear().type('10');

    // Preview changes
    cy.contains('button', 'Preview').click();

    // Verify preview table shows new prices
    cy.get('[data-testid="preview-row"]').should('have.length', 3);
    cy.get('[data-testid="new-price"]').first().should('contain', '66,000'); // 60000 + 10%

    // Apply changes
    cy.contains('button', 'Apply Changes').click();

    // Verify success message
    cy.contains('3 variants updated successfully').should('be.visible');

    // Verify modal closed
    cy.contains('Bulk Edit Variants').should('not.exist');

    // Verify prices updated in list
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="variant-price"]').should('contain', '66,000');
    });
  });

  it('should bulk activate/deactivate variants', () => {
    // Select all variants
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();
    cy.get('[data-testid="select-all-checkbox"]').click();

    // Click bulk actions dropdown
    cy.get('[data-testid="bulk-actions-menu"]').click();

    // Click "Deactivate"
    cy.contains('li', 'Deactivate').click();

    // Confirm action
    cy.contains('button', 'Confirm').click();

    // Verify success
    cy.contains('5 variants deactivated').should('be.visible');

    // Verify all variants show as inactive
    cy.get('[data-testid="variant-status"]').each(($status) => {
      cy.wrap($status).should('contain', 'Inactive');
    });

    // Reactivate all
    cy.get('[data-testid="select-all-checkbox"]').click();
    cy.get('[data-testid="bulk-actions-menu"]').click();
    cy.contains('li', 'Activate').click();
    cy.contains('button', 'Confirm').click();

    // Verify all active again
    cy.get('[data-testid="variant-status"]').each(($status) => {
      cy.wrap($status).should('contain', 'Active');
    });
  });

  it('should bulk delete variants with confirmation', () => {
    // Select 2 variants to delete
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();
    
    cy.get('[data-testid="variant-checkbox"]').eq(3).click();
    cy.get('[data-testid="variant-checkbox"]').eq(4).click();

    // Click bulk delete
    cy.get('[data-testid="bulk-actions-menu"]').click();
    cy.contains('li', 'Delete').click();

    // Verify confirmation dialog
    cy.contains('Delete 2 Variants?').should('be.visible');
    cy.contains('This action cannot be undone').should('be.visible');

    // Confirm deletion
    cy.contains('button', 'Delete').click();

    // Verify success
    cy.contains('2 variants deleted').should('be.visible');

    // Verify only 3 variants remain
    cy.get('[data-testid="variant-row"]').should('have.length', 3);

    // Verify deleted variants not in list
    cy.contains('Size XL').should('not.exist');
    cy.contains('Size L').should('not.exist');
  });

  it('should bulk update stock levels', () => {
    // Select remaining 3 variants
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();
    cy.get('[data-testid="select-all-checkbox"]').click();

    // Open bulk edit
    cy.contains('button', 'Bulk Edit').click();

    // Select "Update Stock"
    cy.get('[data-testid="bulk-action-select"]').click();
    cy.contains('li', 'Update Stock').click();

    // Select "Set to" mode
    cy.get('[data-testid="stock-mode"]').click();
    cy.contains('li', 'Set to').click();

    // Set stock to 50
    cy.get('input[name="stock_value"]').clear().type('50');

    // Apply changes
    cy.contains('button', 'Apply Changes').click();

    // Verify success
    cy.contains('3 variants updated').should('be.visible');

    // Verify stock updated
    cy.get('[data-testid="variant-stock"]').each(($stock) => {
      cy.wrap($stock).should('contain', '50');
    });
  });

  it('should handle bulk operation errors gracefully', () => {
    // Select variants
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();
    cy.get('[data-testid="select-all-checkbox"]').click();

    // Open bulk edit
    cy.contains('button', 'Bulk Edit').click();

    // Try to set invalid price
    cy.get('[data-testid="bulk-action-select"]').click();
    cy.contains('li', 'Update Price').click();
    
    cy.get('input[name="price_adjustment"]').clear().type('-200');

    // Try to apply
    cy.contains('button', 'Apply Changes').click();

    // Verify error message shown
    cy.contains('Invalid price adjustment').should('be.visible');

    // Verify modal still open (not closed on error)
    cy.contains('Bulk Edit Variants').should('be.visible');

    // Cancel operation
    cy.contains('button', 'Cancel').click();

    // Verify modal closed
    cy.contains('Bulk Edit Variants').should('not.exist');
  });
});