/**
 * Material Management E2E Tests
 * 
 * Tests the complete material management workflow:
 * 1. Create Material
 * 2. Edit Material
 * 3. Adjust Stock
 * 4. View Transaction History
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All operations are tenant-scoped
 * - tenant_id included in all API calls
 * - guard_name: 'api'
 * 
 * @module cypress/e2e/bom/material-management.cy
 */

describe('Material Management Flow', () => {
  const testTenantId = Cypress.env('TEST_TENANT_ID') || '550e8400-e29b-41d4-a716-446655440000';
  const testMaterial = {
    name: `E2E Test Material ${Date.now()}`,
    code: `E2E-MAT-${Date.now()}`,
    unit: 'kg',
    category: 'raw_materials',
    unit_cost: 5000,
    current_stock: 100,
    min_stock: 20,
    max_stock: 500,
    reorder_point: 30,
    reorder_quantity: 100,
    supplier_name: 'Test Supplier',
  };

  before(() => {
    // Login
    cy.visit('/login');
    cy.get('input[name="email"]').type(Cypress.env('TEST_USER_EMAIL') || 'test@example.com');
    cy.get('input[name="password"]').type(Cypress.env('TEST_USER_PASSWORD') || 'password');
    cy.get('button[type="submit"]').click();
    
    // Wait for redirect
    cy.url().should('include', '/admin');
  });

  beforeEach(() => {
    // Preserve auth cookies
    Cy.Cookies.preserveOnce('auth_token', 'session_id');
  });

  describe('Create Material', () => {
    it('should navigate to materials page', () => {
      cy.visit(`/admin/tenants/${testTenantId}/materials`);
      cy.contains('Materials').should('be.visible');
    });

    it('should open create material dialog', () => {
      cy.get('button').contains(/create|new|add/i).click();
      cy.contains(/create material|new material/i).should('be.visible');
    });

    it('should fill and submit material form', () => {
      // Fill basic information
      cy.get('input[name="name"]').clear().type(testMaterial.name);
      cy.get('input[name="code"]').clear().type(testMaterial.code);
      cy.get('textarea[name="description"]').clear().type('E2E test material description');
      
      // Select unit
      cy.get('select[name="unit"]').select(testMaterial.unit);
      
      // Select category
      cy.get('select[name="category"]').select(testMaterial.category);
      
      // Fill pricing and stock
      cy.get('input[name="unit_cost"]').clear().type(testMaterial.unit_cost.toString());
      cy.get('input[name="current_stock"]').clear().type(testMaterial.current_stock.toString());
      cy.get('input[name="min_stock"]').clear().type(testMaterial.min_stock.toString());
      cy.get('input[name="max_stock"]').clear().type(testMaterial.max_stock.toString());
      cy.get('input[name="reorder_point"]').clear().type(testMaterial.reorder_point.toString());
      cy.get('input[name="reorder_quantity"]').clear().type(testMaterial.reorder_quantity.toString());
      
      // Fill supplier information
      cy.get('input[name="supplier_name"]').clear().type(testMaterial.supplier_name);
      
      // Submit form
      cy.get('button[type="submit"]').contains(/create|save/i).click();
      
      // Verify success message
      cy.contains(/success|created/i, { timeout: 10000 }).should('be.visible');
    });

    it('should display new material in list', () => {
      // Search for the created material
      cy.get('input[placeholder*="Search"]').clear().type(testMaterial.name);
      
      // Wait for search results
      cy.wait(1000);
      
      // Verify material appears in list
      cy.contains(testMaterial.name).should('be.visible');
      cy.contains(testMaterial.code).should('be.visible');
    });
  });

  describe('Edit Material', () => {
    it('should open edit material dialog', () => {
      // Search for material
      cy.get('input[placeholder*="Search"]').clear().type(testMaterial.code);
      cy.wait(1000);
      
      // Click edit button
      cy.contains(testMaterial.name)
        .parents('tr, .material-row')
        .find('button')
        .contains(/edit/i)
        .click();
      
      cy.contains(/edit material|update material/i).should('be.visible');
    });

    it('should update material information', () => {
      const updatedName = `${testMaterial.name} (Updated)`;
      
      // Update name
      cy.get('input[name="name"]').clear().type(updatedName);
      
      // Update unit cost
      cy.get('input[name="unit_cost"]').clear().type('6000');
      
      // Update reorder point
      cy.get('input[name="reorder_point"]').clear().type('35');
      
      // Submit form
      cy.get('button[type="submit"]').contains(/update|save/i).click();
      
      // Verify success message
      cy.contains(/success|updated/i, { timeout: 10000 }).should('be.visible');
      
      // Store updated name for next tests
      testMaterial.name = updatedName;
    });

    it('should display updated information', () => {
      // Search for updated material
      cy.get('input[placeholder*="Search"]').clear().type(testMaterial.code);
      cy.wait(1000);
      
      // Verify updated name
      cy.contains(testMaterial.name).should('be.visible');
    });
  });

  describe('Adjust Stock', () => {
    it('should open stock adjustment dialog', () => {
      // Search for material
      cy.get('input[placeholder*="Search"]').clear().type(testMaterial.code);
      cy.wait(1000);
      
      // Click adjust stock button
      cy.contains(testMaterial.name)
        .parents('tr, .material-row')
        .find('button')
        .contains(/adjust|stock/i)
        .click();
      
      cy.contains(/adjust stock|stock adjustment/i).should('be.visible');
    });

    it('should add stock (stock in)', () => {
      // Select transaction type
      cy.get('select[name="type"]').select('in');
      
      // Enter quantity
      cy.get('input[name="quantity"]').clear().type('50');
      
      // Enter reference
      cy.get('input[name="reference"]').clear().type('PO-12345');
      
      // Enter notes
      cy.get('textarea[name="notes"]').clear().type('E2E test stock adjustment - IN');
      
      // Submit
      cy.get('button[type="submit"]').contains(/submit|adjust/i).click();
      
      // Verify success
      cy.contains(/success|adjusted/i, { timeout: 10000 }).should('be.visible');
    });

    it('should verify stock increased', () => {
      // Search for material
      cy.get('input[placeholder*="Search"]').clear().type(testMaterial.code);
      cy.wait(1000);
      
      // Click to view details
      cy.contains(testMaterial.name).click();
      
      // Verify stock shows increased value (100 + 50 = 150)
      cy.contains(/150|current stock.*150/i).should('be.visible');
    });

    it('should reduce stock (stock out)', () => {
      // Open adjust stock dialog again
      cy.get('button').contains(/adjust|stock/i).click();
      
      // Select transaction type
      cy.get('select[name="type"]').select('out');
      
      // Enter quantity
      cy.get('input[name="quantity"]').clear().type('30');
      
      // Enter reference
      cy.get('input[name="reference"]').clear().type('WO-67890');
      
      // Enter notes
      cy.get('textarea[name="notes"]').clear().type('E2E test stock adjustment - OUT');
      
      // Submit
      cy.get('button[type="submit"]').contains(/submit|adjust/i).click();
      
      // Verify success
      cy.contains(/success|adjusted/i, { timeout: 10000 }).should('be.visible');
    });

    it('should verify stock decreased', () => {
      // Verify stock shows decreased value (150 - 30 = 120)
      cy.contains(/120|current stock.*120/i).should('be.visible');
    });
  });

  describe('View Transaction History', () => {
    it('should display transaction history section', () => {
      // Should be on material detail page
      cy.contains(/transaction history|stock movements/i).should('be.visible');
    });

    it('should show both IN and OUT transactions', () => {
      // Verify IN transaction
      cy.contains('PO-12345').should('be.visible');
      cy.contains(/\+50|in.*50/i).should('be.visible');
      
      // Verify OUT transaction
      cy.contains('WO-67890').should('be.visible');
      cy.contains(/-30|out.*30/i).should('be.visible');
    });

    it('should display transaction details', () => {
      // Click on first transaction
      cy.contains('PO-12345').click();
      
      // Verify transaction details modal/section
      cy.contains(/transaction details|stock movement/i).should('be.visible');
      cy.contains('E2E test stock adjustment - IN').should('be.visible');
    });

    it('should filter transactions by type', () => {
      // Go back to transaction list
      cy.get('button').contains(/back|close/i).click();
      
      // Apply filter for IN transactions only
      cy.get('select[name="transaction_type"]').select('in');
      cy.wait(500);
      
      // Verify only IN transaction is shown
      cy.contains('PO-12345').should('be.visible');
      cy.contains('WO-67890').should('not.exist');
      
      // Clear filter
      cy.get('select[name="transaction_type"]').select('all');
      cy.wait(500);
      
      // Verify both transactions are shown again
      cy.contains('PO-12345').should('be.visible');
      cy.contains('WO-67890').should('be.visible');
    });
  });

  describe('Low Stock Alert', () => {
    it('should trigger low stock alert when stock is below reorder point', () => {
      // Adjust stock to below reorder point (35)
      cy.get('button').contains(/adjust|stock/i).click();
      
      // Stock out to bring below reorder point
      cy.get('select[name="type"]').select('out');
      cy.get('input[name="quantity"]').clear().type('90'); // 120 - 90 = 30 (below 35)
      cy.get('textarea[name="notes"]').clear().type('Test low stock alert');
      cy.get('button[type="submit"]').contains(/submit|adjust/i).click();
      
      cy.wait(2000);
      
      // Navigate to dashboard
      cy.visit(`/admin/tenants/${testTenantId}/bom-dashboard`);
      
      // Verify alert appears in alerts section
      cy.contains(/low stock|alerts/i).should('be.visible');
      cy.contains(testMaterial.name).should('be.visible');
    });
  });

  after(() => {
    // Cleanup: Delete test material (optional)
    // This would require implementing a delete endpoint or using API call
    cy.log('Test material created:', testMaterial.code);
  });
});