/// <reference types="cypress" />

// ***********************************************
// Custom Cypress Commands for Variant Testing
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login
       * @example cy.login('admin@test.com', 'password')
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Custom command to login with stored credentials
       * @example cy.loginAsAdmin()
       */
      loginAsAdmin(): Chainable<void>;
      
      /**
       * Custom command to set auth token
       * @example cy.setAuthToken('token123')
       */
      setAuthToken(token: string): Chainable<void>;
      
      /**
       * Custom command to create a test product
       * @example cy.createProduct({ name: 'Test Product', sku: 'TEST-001', price: 100, stock: 50 })
       */
      createProduct(data: {
        name: string;
        sku: string;
        price: number;
        stock: number;
        category_id?: string;
      }): Chainable<any>;
      
      /**
       * Custom command to delete a product
       * @example cy.deleteProduct('product-id-123')
       */
      deleteProduct(productId: string): Chainable<void>;
      
      /**
       * Custom command to wait for API request
       * @example cy.waitForApi('@getProducts')
       */
      waitForApi(alias: string): Chainable<any>;
    }
  }
}

// ========================================
// AUTHENTICATION COMMANDS
// ========================================

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/admin');
  
  // Wait for auth to complete
  cy.wait(1000);
});

Cypress.Commands.add('loginAsAdmin', () => {
  const email = Cypress.env('testEmail');
  const password = Cypress.env('testPassword');
  cy.login(email, password);
});

Cypress.Commands.add('setAuthToken', (token: string) => {
  localStorage.setItem('token', token);
});

// ========================================
// PRODUCT COMMANDS
// ========================================

Cypress.Commands.add('createProduct', (data) => {
  const tenantId = Cypress.env('testTenantId');
  const apiUrl = Cypress.env('apiUrl');
  const token = localStorage.getItem('token');
  
  return cy.request({
    method: 'POST',
    url: `${apiUrl}/tenants/${tenantId}/products`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: {
      name: data.name,
      sku: data.sku,
      price: data.price,
      stock: data.stock,
      category_id: data.category_id || null,
      description: 'Test product created by Cypress',
      status: 'active',
    },
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body.data;
  });
});

Cypress.Commands.add('deleteProduct', (productId: string) => {
  const tenantId = Cypress.env('testTenantId');
  const apiUrl = Cypress.env('apiUrl');
  const token = localStorage.getItem('token');
  
  cy.request({
    method: 'DELETE',
    url: `${apiUrl}/tenants/${tenantId}/products/${productId}`,
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    failOnStatusCode: false, // Don't fail if product doesn't exist
  });
});

Cypress.Commands.add('waitForApi', (alias: string) => {
  cy.wait(alias).its('response.statusCode').should('eq', 200);
});

// ========================================
// CUSTOM ASSERTIONS
// ========================================

// Add custom chai assertion for variant SKU format
chai.Assertion.addMethod('variantSku', function () {
  const obj = this._obj;
  
  // SKU should contain product SKU + variant attributes
  // Example: TSHIRT-S-RED or PROD-001-L-BLUE
  new chai.Assertion(obj).to.be.a('string');
  new chai.Assertion(obj).to.match(/^[A-Z0-9]+-[A-Z0-9-]+$/);
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Generate random SKU for testing
 */
export const generateRandomSku = (prefix: string = 'TEST'): string => {
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}-${timestamp}`;
};

/**
 * Generate random product name
 */
export const generateRandomProductName = (): string => {
  const adjectives = ['Premium', 'Deluxe', 'Classic', 'Modern', 'Elegant'];
  const nouns = ['T-Shirt', 'Shoes', 'Jacket', 'Pants', 'Hat'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
};

export {};