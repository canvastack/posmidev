// ***********************************************************
// This support file is processed and loaded automatically
// before your test files.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Suppress uncaught exceptions from breaking tests
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent failing the test
  // Useful for third-party scripts that throw errors
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  return true;
});

// Set global defaults
beforeEach(() => {
  // Clear local storage
  cy.clearLocalStorage();
  
  // Clear cookies
  cy.clearCookies();
  
  // Set viewport
  cy.viewport(1280, 720);
});