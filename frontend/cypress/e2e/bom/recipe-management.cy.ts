/**
 * Recipe Management E2E Tests
 * 
 * Tests the complete recipe management workflow:
 * 1. Create Recipe
 * 2. Add Materials to Recipe
 * 3. Activate Recipe
 * 4. View Cost Breakdown
 * 5. Calculate Available Quantity
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All operations are tenant-scoped
 * - tenant_id included in all API calls
 * - guard_name: 'api'
 * 
 * @module cypress/e2e/bom/recipe-management.cy
 */

describe('Recipe Management Flow', () => {
  const testTenantId = Cypress.env('TEST_TENANT_ID') || '550e8400-e29b-41d4-a716-446655440000';
  const testProductId = Cypress.env('TEST_PRODUCT_ID') || '660e8400-e29b-41d4-a716-446655440000';
  
  const testRecipe = {
    name: `E2E Test Recipe ${Date.now()}`,
    description: 'E2E test recipe for chocolate cake',
    yield_quantity: 10,
    yield_unit: 'pcs',
    production_time_minutes: 60,
  };

  const testMaterials = [
    { name: 'Flour', quantity: 5, unit: 'kg' },
    { name: 'Sugar', quantity: 2, unit: 'kg' },
    { name: 'Cocoa Powder', quantity: 1, unit: 'kg' },
  ];

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

  describe('Create Recipe', () => {
    it('should navigate to recipes page', () => {
      cy.visit(`/admin/tenants/${testTenantId}/recipes`);
      cy.contains('Recipes').should('be.visible');
    });

    it('should open create recipe form', () => {
      cy.get('button').contains(/create|new|add/i).click();
      cy.url().should('include', '/recipes/create');
      cy.contains(/create recipe|new recipe/i).should('be.visible');
    });

    it('should fill recipe basic information', () => {
      // Fill recipe name
      cy.get('input[name="name"]').clear().type(testRecipe.name);
      
      // Fill description
      cy.get('textarea[name="description"]').clear().type(testRecipe.description);
      
      // Select product (if product selector exists)
      if (Cypress.$('select[name="product_id"]').length > 0) {
        cy.get('select[name="product_id"]').select(testProductId);
      }
      
      // Fill yield information
      cy.get('input[name="yield_quantity"]').clear().type(testRecipe.yield_quantity.toString());
      cy.get('select[name="yield_unit"]').select(testRecipe.yield_unit);
      
      // Fill production time
      cy.get('input[name="production_time_minutes"]').clear().type(testRecipe.production_time_minutes.toString());
    });

    it('should save recipe (step 1)', () => {
      // Click next or save button
      cy.get('button').contains(/next|continue|save/i).click();
      
      // Verify success or moved to materials section
      cy.contains(/success|materials|add materials/i, { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Add Materials to Recipe', () => {
    it('should be on recipe materials section', () => {
      cy.contains(/materials|recipe materials|bill of materials/i).should('be.visible');
    });

    testMaterials.forEach((material, index) => {
      it(`should add material ${index + 1}: ${material.name}`, () => {
        // Click add material button
        cy.get('button').contains(/add material|search material/i).click();
        
        // Search for material
        cy.get('input[placeholder*="Search"]').clear().type(material.name);
        cy.wait(1000);
        
        // Select material from list
        cy.contains(material.name).click();
        
        // Fill quantity
        cy.get('input[name*="quantity"]').last().clear().type(material.quantity.toString());
        
        // Select unit (if needed)
        if (Cypress.$('select[name*="unit"]').length > 0) {
          cy.get('select[name*="unit"]').last().select(material.unit);
        }
        
        // Confirm material addition
        cy.get('button').contains(/add|confirm/i).click();
        
        // Verify material added to list
        cy.contains(material.name).should('be.visible');
        cy.contains(material.quantity.toString()).should('be.visible');
      });
    });

    it('should display total material cost', () => {
      // Verify cost summary section
      cy.contains(/total cost|material cost/i).should('be.visible');
      
      // Verify cost is calculated (IDR format)
      cy.contains(/Rp|IDR/).should('be.visible');
    });

    it('should display cost per unit', () => {
      // Verify cost per unit is displayed
      cy.contains(/cost per unit|unit cost/i).should('be.visible');
    });

    it('should save recipe with materials', () => {
      // Click save button
      cy.get('button').contains(/save|finish|complete/i).click();
      
      // Verify success message
      cy.contains(/success|created/i, { timeout: 10000 }).should('be.visible');
      
      // Should redirect to recipe detail or list page
      cy.url().should('match', /\/recipes\//);
    });
  });

  describe('View Recipe Detail', () => {
    it('should display recipe information', () => {
      // If not already on detail page, navigate to it
      if (!window.location.pathname.includes('/recipes/')) {
        cy.visit(`/admin/tenants/${testTenantId}/recipes`);
        cy.get('input[placeholder*="Search"]').clear().type(testRecipe.name);
        cy.wait(1000);
        cy.contains(testRecipe.name).click();
      }
      
      // Verify recipe details
      cy.contains(testRecipe.name).should('be.visible');
      cy.contains(testRecipe.description).should('be.visible');
    });

    it('should display recipe materials list', () => {
      // Verify all materials are listed
      testMaterials.forEach((material) => {
        cy.contains(material.name).should('be.visible');
        cy.contains(material.quantity.toString()).should('be.visible');
      });
    });

    it('should display cost breakdown', () => {
      cy.contains(/cost breakdown|pricing/i).should('be.visible');
      
      // Verify individual material costs
      cy.contains(/material cost|total material cost/i).should('be.visible');
      
      // Verify cost per unit
      cy.contains(/cost per unit/i).should('be.visible');
    });

    it('should calculate available quantity based on stock', () => {
      // Verify available quantity section
      cy.contains(/available quantity|can produce/i).should('be.visible');
      
      // Should show how many units can be produced with current stock
      cy.contains(/\d+\s*(pcs|units)/i).should('be.visible');
    });

    it('should display limiting material', () => {
      // Verify which material is limiting production
      cy.contains(/limiting|bottleneck|constraint/i).should('be.visible');
    });
  });

  describe('Activate Recipe', () => {
    it('should have activate button', () => {
      cy.get('button').contains(/activate/i).should('be.visible');
    });

    it('should activate recipe', () => {
      // Click activate button
      cy.get('button').contains(/activate/i).click();
      
      // Confirm activation if dialog appears
      if (Cypress.$('button:contains("Confirm")').length > 0) {
        cy.contains('button', /confirm|yes/i).click();
      }
      
      // Verify success message
      cy.contains(/success|activated/i, { timeout: 10000 }).should('be.visible');
      
      // Verify status badge changed to active
      cy.contains(/active|status.*active/i).should('be.visible');
    });

    it('should display as active in recipe list', () => {
      // Navigate back to recipes list
      cy.visit(`/admin/tenants/${testTenantId}/recipes`);
      
      // Search for recipe
      cy.get('input[placeholder*="Search"]').clear().type(testRecipe.name);
      cy.wait(1000);
      
      // Verify active badge
      cy.contains(testRecipe.name)
        .parents('tr, .recipe-row')
        .contains(/active/i)
        .should('be.visible');
    });
  });

  describe('Edit Recipe Materials', () => {
    it('should allow editing material quantity', () => {
      // Navigate to recipe detail
      cy.contains(testRecipe.name).click();
      
      // Click edit button
      cy.get('button').contains(/edit|modify/i).click();
      
      // Find first material quantity input and update it
      cy.get('input[name*="quantity"]').first().clear().type('6');
      
      // Save changes
      cy.get('button').contains(/save|update/i).click();
      
      // Verify success
      cy.contains(/success|updated/i, { timeout: 10000 }).should('be.visible');
      
      // Verify cost recalculated
      cy.contains(/total cost/i).should('be.visible');
    });

    it('should allow adding new material', () => {
      // Click add material button
      cy.get('button').contains(/add material/i).click();
      
      // Search for new material
      cy.get('input[placeholder*="Search"]').clear().type('Butter');
      cy.wait(1000);
      
      // Select material
      cy.contains('Butter').click();
      
      // Fill quantity
      cy.get('input[name*="quantity"]').last().clear().type('0.5');
      
      // Confirm
      cy.get('button').contains(/add|confirm/i).click();
      
      // Verify material added
      cy.contains('Butter').should('be.visible');
    });

    it('should allow removing material', () => {
      // Find remove button for last material
      cy.contains('Butter')
        .parents('.material-row, tr')
        .find('button')
        .contains(/remove|delete/i)
        .click();
      
      // Confirm deletion if dialog appears
      if (Cypress.$('button:contains("Confirm")').length > 0) {
        cy.contains('button', /confirm|yes/i).click();
      }
      
      // Verify material removed
      cy.contains('Butter').should('not.exist');
    });
  });

  describe('Recipe Version Management', () => {
    it('should display current version', () => {
      cy.contains(/version|v\d+/i).should('be.visible');
    });

    it('should create new version when editing active recipe', () => {
      // Try to edit active recipe
      cy.get('button').contains(/edit|modify/i).click();
      
      // Should warn about creating new version
      if (Cypress.$('*:contains("new version")').length > 0) {
        cy.contains(/new version|create version/i).should('be.visible');
        
        // Confirm creating new version
        cy.get('button').contains(/create|confirm/i).click();
        
        // Verify version incremented
        cy.contains(/v2|version 2/i).should('be.visible');
      }
    });
  });

  describe('Deactivate Recipe', () => {
    it('should deactivate recipe', () => {
      // Navigate to recipe detail if not there
      cy.visit(`/admin/tenants/${testTenantId}/recipes`);
      cy.get('input[placeholder*="Search"]').clear().type(testRecipe.name);
      cy.wait(1000);
      cy.contains(testRecipe.name).click();
      
      // Click deactivate button
      cy.get('button').contains(/deactivate/i).click();
      
      // Confirm deactivation
      if (Cypress.$('button:contains("Confirm")').length > 0) {
        cy.contains('button', /confirm|yes/i).click();
      }
      
      // Verify success message
      cy.contains(/success|deactivated/i, { timeout: 10000 }).should('be.visible');
      
      // Verify status badge changed
      cy.contains(/inactive|draft/i).should('be.visible');
    });
  });

  after(() => {
    // Cleanup note
    cy.log('Test recipe created:', testRecipe.name);
  });
});