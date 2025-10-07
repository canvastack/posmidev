/// <reference types="cypress" />

import { generateRandomSku, generateRandomProductName } from '../../support/commands';

describe('Edit Product Variants', () => {
  let testProductId: string;
  let testVariantId: string;

  before(() => {
    cy.loginAsAdmin();

    // Create test product with variants via API
    const productData = {
      name: generateRandomProductName(),
      sku: generateRandomSku('EDIT'),
      price: 75000,
      stock: 50,
    };

    cy.createProduct(productData).then((product) => {
      testProductId = product.id;

      // Enable variants
      const tenantId = Cypress.env('testTenantId');
      const apiUrl = Cypress.env('apiUrl');
      const token = localStorage.getItem('token');

      cy.request({
        method: 'PUT',
        url: `${apiUrl}/tenants/${tenantId}/products/${testProductId}`,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: {
          has_variants: true,
        },
      });

      // Create a test variant
      cy.request({
        method: 'POST',
        url: `${apiUrl}/tenants/${tenantId}/products/${testProductId}/variants`,
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: {
          sku: `${productData.sku}-L-BLACK`,
          name: 'Large Black',
          price: 80000,
          stock: 25,
          attributes: {
            Size: 'L',
            Color: 'Black',
          },
          is_active: true,
        },
      }).then((response) => {
        testVariantId = response.body.data.id;
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

  it('should open edit modal for a variant', () => {
    // Navigate to product variants
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();

    // Wait for variants to load
    cy.get('[data-testid="variant-row"]').should('have.length.at.least', 1);

    // Click edit button on first variant
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="edit-variant"]').click();
    });

    // Verify edit modal opened
    cy.contains('Edit Variant').should('be.visible');

    // Verify form fields populated
    cy.get('input[name="name"]').should('have.value', 'Large Black');
    cy.get('input[name="price"]').should('have.value', '80000');
    cy.get('input[name="stock"]').should('have.value', '25');
  });

  it('should update variant price successfully', () => {
    // Should be in edit modal already or reopen
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'Variants').click();
    
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="edit-variant"]').click();
    });

    // Update price
    cy.get('input[name="price"]').clear().type('85000');

    // Save changes
    cy.contains('button', 'Save Changes').click();

    // Verify success message
    cy.contains('Variant updated successfully').should('be.visible');

    // Verify modal closed
    cy.contains('Edit Variant').should('not.exist');

    // Verify new price in list
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="variant-price"]').should('contain', '85,000');
    });
  });

  it('should update variant stock successfully', () => {
    // Open edit modal
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="edit-variant"]').click();
    });

    // Update stock
    cy.get('input[name="stock"]').clear().type('40');

    // Save changes
    cy.contains('button', 'Save Changes').click();

    // Verify success
    cy.contains('Variant updated successfully').should('be.visible');

    // Verify new stock in list
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="variant-stock"]').should('contain', '40');
    });
  });

  it('should toggle variant active status', () => {
    // Open edit modal
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="edit-variant"]').click();
    });

    // Find and toggle "Active" switch
    cy.get('[data-testid="is-active-switch"]').click();

    // Save changes
    cy.contains('button', 'Save Changes').click();

    // Verify success
    cy.contains('Variant updated successfully').should('be.visible');

    // Verify variant shows as inactive in list
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="variant-status"]').should('contain', 'Inactive');
    });

    // Toggle back to active
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="edit-variant"]').click();
    });
    cy.get('[data-testid="is-active-switch"]').click();
    cy.contains('button', 'Save Changes').click();

    // Verify active again
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="variant-status"]').should('contain', 'Active');
    });
  });

  it('should validate required fields when editing', () => {
    // Open edit modal
    cy.get('[data-testid="variant-row"]').first().within(() => {
      cy.get('[data-testid="edit-variant"]').click();
    });

    // Clear price (required field)
    cy.get('input[name="price"]').clear();

    // Try to save
    cy.contains('button', 'Save Changes').click();

    // Verify validation error shown
    cy.contains('Price is required').should('be.visible');

    // Modal should still be open
    cy.contains('Edit Variant').should('be.visible');

    // Fill price again
    cy.get('input[name="price"]').type('85000');

    // Now save should work
    cy.contains('button', 'Save Changes').click();

    // Verify success
    cy.contains('Variant updated successfully').should('be.visible');
  });

  it('should show audit history for variant changes', () => {
    // Navigate to variant detail or history tab
    cy.visit(`/admin/products/${testProductId}`);
    cy.contains('[role="tab"]', 'History').click();

    // Verify audit log visible
    cy.contains('Audit History').should('be.visible');

    // Verify recent changes logged
    cy.contains('Price updated').should('be.visible');
    cy.contains('Stock updated').should('be.visible');

    // Verify timestamp shown
    cy.get('[data-testid="audit-timestamp"]').should('be.visible');

    // Verify user shown
    cy.get('[data-testid="audit-user"]').should('contain', 'admin');
  });
});