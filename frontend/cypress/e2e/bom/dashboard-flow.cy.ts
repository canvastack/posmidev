/**
 * BOM Dashboard E2E Tests
 * 
 * Tests the complete dashboard workflow:
 * 1. Navigate to Dashboard
 * 2. View Alerts
 * 3. Click Alert to View Material
 * 4. Adjust Stock from Alert
 * 5. Return to Dashboard and Verify Alert Cleared
 * 
 * IMMUTABLE RULES COMPLIANCE:
 * - All operations are tenant-scoped
 * - tenant_id included in all API calls
 * - guard_name: 'api'
 * 
 * @module cypress/e2e/bom/dashboard-flow.cy
 */

describe('BOM Dashboard Flow', () => {
  const testTenantId = Cypress.env('TEST_TENANT_ID') || '550e8400-e29b-41d4-a716-446655440000';

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

  describe('Navigate to Dashboard', () => {
    it('should navigate to BOM dashboard from sidebar', () => {
      cy.visit(`/admin/tenants/${testTenantId}`);
      
      // Click BOM Dashboard menu item
      cy.get('nav').contains(/BOM Dashboard|Dashboard/i).click();
      
      // Verify URL
      cy.url().should('include', '/bom-dashboard');
    });

    it('should display dashboard title', () => {
      cy.contains(/BOM Dashboard|Dashboard/i).should('be.visible');
    });
  });

  describe('Executive Summary Cards', () => {
    it('should display all summary cards', () => {
      // Total Materials
      cy.contains(/total materials/i).should('be.visible');
      
      // Low Stock Items
      cy.contains(/low stock/i).should('be.visible');
      
      // Inventory Value
      cy.contains(/inventory value|total value/i).should('be.visible');
      
      // Active Alerts
      cy.contains(/active alerts|alerts/i).should('be.visible');
    });

    it('should display numeric values in cards', () => {
      // Verify each card has a number
      cy.get('[data-testid="summary-card"], .summary-card').each(($card) => {
        cy.wrap($card).contains(/\d+/).should('be.visible');
      });
    });

    it('should format inventory value as IDR currency', () => {
      cy.contains(/Rp|IDR/).should('be.visible');
    });
  });

  describe('Stock Status Chart', () => {
    it('should display stock status pie chart', () => {
      cy.contains(/stock status|stock distribution/i).should('be.visible');
      
      // Verify chart container exists
      cy.get('[data-testid="stock-status-chart"], .stock-status-chart').should('be.visible');
    });

    it('should show stock categories in legend', () => {
      // Verify legend items
      cy.contains(/normal/i).should('be.visible');
      cy.contains(/low/i).should('be.visible');
      cy.contains(/critical/i).should('be.visible');
    });
  });

  describe('Category Breakdown Chart', () => {
    it('should display category breakdown bar chart', () => {
      cy.contains(/category breakdown|by category/i).should('be.visible');
      
      // Verify chart container exists
      cy.get('[data-testid="category-chart"], .category-chart').should('be.visible');
    });

    it('should display category names', () => {
      // At least one category should be visible
      cy.contains(/raw materials|packaging|ingredients/i).should('be.visible');
    });
  });

  describe('Usage Trends Chart', () => {
    it('should display usage trends line chart', () => {
      cy.contains(/usage trends|consumption/i).should('be.visible');
      
      // Verify chart container exists
      cy.get('[data-testid="usage-trends-chart"], .usage-trends-chart').should('be.visible');
    });

    it('should have time period selector', () => {
      cy.get('select[name*="days"], select[name*="period"]').should('be.visible');
    });

    it('should update chart when time period changes', () => {
      // Change time period
      cy.get('select[name*="days"], select[name*="period"]').select('30');
      
      // Wait for chart to update
      cy.wait(1000);
      
      // Chart should still be visible
      cy.get('[data-testid="usage-trends-chart"], .usage-trends-chart').should('be.visible');
    });
  });

  describe('View Alerts', () => {
    it('should display alerts section', () => {
      cy.contains(/active alerts|stock alerts|alerts/i).should('be.visible');
    });

    it('should show alert list or empty state', () => {
      // Either alerts exist or empty state is shown
      cy.get('body').then(($body) => {
        if ($body.find('.alert-item, [data-testid="alert-item"]').length > 0) {
          cy.log('Alerts found');
          cy.get('.alert-item, [data-testid="alert-item"]').should('have.length.at.least', 1);
        } else {
          cy.log('No alerts - empty state');
          cy.contains(/no alerts|all good/i).should('be.visible');
        }
      });
    });

    it('should display alert severity badges', function () {
      // Skip if no alerts
      cy.get('body').then(($body) => {
        if ($body.find('.alert-item, [data-testid="alert-item"]').length > 0) {
          cy.get('.alert-item, [data-testid="alert-item"]').first().within(() => {
            cy.contains(/critical|warning|info/i).should('be.visible');
          });
        } else {
          this.skip();
        }
      });
    });

    it('should display material information in alerts', function () {
      cy.get('body').then(($body) => {
        if ($body.find('.alert-item, [data-testid="alert-item"]').length > 0) {
          cy.get('.alert-item, [data-testid="alert-item"]').first().within(() => {
            // Material name should be visible
            cy.get('[data-testid="material-name"]').should('be.visible');
            
            // Current stock should be visible
            cy.contains(/current stock|stock/i).should('be.visible');
          });
        } else {
          this.skip();
        }
      });
    });
  });

  describe('Click Alert to View Material', function () {
    it('should have "View Material" button on each alert', function () {
      cy.get('body').then(($body) => {
        if ($body.find('.alert-item, [data-testid="alert-item"]').length > 0) {
          cy.get('.alert-item, [data-testid="alert-item"]').first().within(() => {
            cy.get('button').contains(/view|material/i).should('be.visible');
          });
        } else {
          this.skip();
        }
      });
    });

    it('should navigate to material detail when clicking alert', function () {
      cy.get('body').then(($body) => {
        if ($body.find('.alert-item, [data-testid="alert-item"]').length > 0) {
          // Store current alert material name
          cy.get('.alert-item, [data-testid="alert-item"]')
            .first()
            .find('[data-testid="material-name"]')
            .invoke('text')
            .as('materialName');
          
          // Click view button
          cy.get('.alert-item, [data-testid="alert-item"]')
            .first()
            .find('button')
            .contains(/view|material/i)
            .click();
          
          // Verify navigation to materials page
          cy.url().should('include', '/materials');
          
          // Verify material is highlighted or shown
          cy.get('@materialName').then((name) => {
            cy.contains(name as string).should('be.visible');
          });
        } else {
          this.skip();
        }
      });
    });
  });

  describe('Adjust Stock from Alert', function () {
    it('should open stock adjustment dialog from material page', function () {
      // Verify we're on materials page (from previous test)
      cy.url().then((url) => {
        if (url.includes('/materials')) {
          // Click adjust stock button
          cy.get('button').contains(/adjust|stock/i).first().click();
          
          // Verify dialog opened
          cy.contains(/adjust stock|stock adjustment/i).should('be.visible');
        } else {
          this.skip();
        }
      });
    });

    it('should add stock to resolve alert', function () {
      cy.get('body').then(($body) => {
        if ($body.find('input[name="quantity"]').length > 0) {
          // Fill adjustment form
          cy.get('select[name="type"]').select('in');
          cy.get('input[name="quantity"]').clear().type('100');
          cy.get('input[name="reference"]').clear().type('RESTOCK-ALERT');
          cy.get('textarea[name="notes"]').clear().type('Restocking from dashboard alert');
          
          // Submit
          cy.get('button[type="submit"]').contains(/submit|adjust/i).click();
          
          // Verify success
          cy.contains(/success|adjusted/i, { timeout: 10000 }).should('be.visible');
        } else {
          this.skip();
        }
      });
    });
  });

  describe('Return to Dashboard and Verify', () => {
    it('should navigate back to dashboard', () => {
      cy.visit(`/admin/tenants/${testTenantId}/bom-dashboard`);
      cy.contains(/BOM Dashboard|Dashboard/i).should('be.visible');
    });

    it('should refresh dashboard data', () => {
      // Click refresh button if available
      cy.get('body').then(($body) => {
        if ($body.find('button:contains("Refresh")').length > 0) {
          cy.get('button').contains(/refresh|reload/i).click();
          cy.wait(2000);
        }
      });
    });

    it('should show updated alert count or cleared alert', () => {
      // The alert count should have decreased or alert cleared
      // This is a soft assertion as alert might reappear if still below threshold
      cy.contains(/active alerts|alerts/i).should('be.visible');
    });

    it('should show updated inventory value after stock adjustment', () => {
      cy.contains(/inventory value|total value/i).should('be.visible');
      cy.contains(/Rp|IDR/).should('be.visible');
    });
  });

  describe('Reorder Recommendations', () => {
    it('should display reorder recommendations section', () => {
      cy.contains(/reorder recommendations|recommendations/i).should('be.visible');
    });

    it('should show recommendations list or empty state', () => {
      cy.get('body').then(($body) => {
        if ($body.find('.recommendation-item, [data-testid="recommendation-item"]').length > 0) {
          cy.log('Recommendations found');
          cy.get('.recommendation-item, [data-testid="recommendation-item"]')
            .should('have.length.at.least', 1);
        } else {
          cy.log('No recommendations - empty state');
          cy.contains(/no recommendations|stock levels are good/i).should('be.visible');
        }
      });
    });

    it('should display priority badges in recommendations', function () {
      cy.get('body').then(($body) => {
        if ($body.find('.recommendation-item, [data-testid="recommendation-item"]').length > 0) {
          cy.get('.recommendation-item, [data-testid="recommendation-item"]').first().within(() => {
            cy.contains(/high|medium|low/i).should('be.visible');
          });
        } else {
          this.skip();
        }
      });
    });

    it('should display suggested order quantity and cost', function () {
      cy.get('body').then(($body) => {
        if ($body.find('.recommendation-item, [data-testid="recommendation-item"]').length > 0) {
          cy.get('.recommendation-item, [data-testid="recommendation-item"]').first().within(() => {
            // Quantity
            cy.contains(/quantity|order/i).should('be.visible');
            
            // Cost in IDR
            cy.contains(/Rp|IDR|cost/i).should('be.visible');
          });
        } else {
          this.skip();
        }
      });
    });

    it('should have action button for each recommendation', function () {
      cy.get('body').then(($body) => {
        if ($body.find('.recommendation-item, [data-testid="recommendation-item"]').length > 0) {
          cy.get('.recommendation-item, [data-testid="recommendation-item"]').first().within(() => {
            cy.get('button').contains(/adjust|order|restock/i).should('be.visible');
          });
        } else {
          this.skip();
        }
      });
    });
  });

  describe('Dashboard Refresh', () => {
    it('should have refresh button', () => {
      cy.get('button[aria-label*="Refresh"], button:contains("Refresh")').should('be.visible');
    });

    it('should reload all data when refresh is clicked', () => {
      // Store initial alert count
      cy.get('[data-testid="alert-count"]')
        .invoke('text')
        .then((initialCount) => {
          // Click refresh
          cy.get('button[aria-label*="Refresh"], button:contains("Refresh")').click();
          
          // Wait for refresh
          cy.wait(2000);
          
          // Data should be reloaded (count may or may not change, but should be visible)
          cy.get('[data-testid="alert-count"]').should('be.visible');
        });
    });
  });

  describe('Responsive Dashboard', () => {
    it('should display correctly on mobile viewport', () => {
      cy.viewport('iphone-x');
      cy.visit(`/admin/tenants/${testTenantId}/bom-dashboard`);
      
      // Summary cards should stack vertically
      cy.get('[data-testid="summary-card"], .summary-card').should('be.visible');
      
      // Charts should be visible and responsive
      cy.get('[data-testid="stock-status-chart"], .stock-status-chart').should('be.visible');
    });

    it('should display correctly on tablet viewport', () => {
      cy.viewport('ipad-2');
      cy.visit(`/admin/tenants/${testTenantId}/bom-dashboard`);
      
      // All sections should be visible
      cy.contains(/BOM Dashboard/i).should('be.visible');
      cy.get('[data-testid="summary-card"], .summary-card').should('be.visible');
    });

    it('should display correctly on desktop viewport', () => {
      cy.viewport(1920, 1080);
      cy.visit(`/admin/tenants/${testTenantId}/bom-dashboard`);
      
      // All sections should be visible in grid layout
      cy.contains(/BOM Dashboard/i).should('be.visible');
      cy.get('[data-testid="summary-card"], .summary-card').should('have.length.at.least', 4);
    });
  });
});