describe('TC-WORKFLOW-001 documented workflow', () => {
  beforeEach(() => {
    cy.visit('/replace-with-route');
  });

  it('completes the workflow and shows the expected state', () => {
    cy.findByRole('textbox', { name: /replace with label/i }).type('replace-with-value');
    cy.findByRole('button', { name: /replace with action/i }).click();

    cy.location('pathname').should('match', /replace-with-expected-route/);
    cy.findByRole('heading', { name: /replace with expected state/i }).should('be.visible');
  });
});
