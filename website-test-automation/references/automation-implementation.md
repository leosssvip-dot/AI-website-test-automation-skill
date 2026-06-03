# Automation Implementation

Use this reference after source-backed test cases exist and the user asks to implement or prepare concrete automated tests.

## Implementation Flow

1. Select cases whose `automation.recommended` is true and whose data/auth/environment controls are known.
2. Pick the lowest-cost layer that proves the behavior: API/route, component, browser runner, or browser-agent smoke.
3. Reuse the project runner, fixtures, test utilities, auth helpers, and naming conventions before adding anything new. Use [test-infrastructure.md](test-infrastructure.md) for auth/session reuse, test data lifecycle, selector strategy, environment bootstrapping, and suite architecture.
4. Decide file placement from the repo's existing layout; otherwise use a conventional path such as `tests/e2e`, `tests/api`, `src/**/*.test.tsx`, or `cypress/e2e`.
5. Implement deterministic assertions for state, route, response, DOM, accessibility, network, or artifact outcomes. Judge assertion strength with [test-quality.md](test-quality.md), and for API, route, or service boundaries follow [api-contract-testing.md](api-contract-testing.md) for contract and state verification.
6. Add fixtures only when the case needs stable data. Keep secrets, customer data, and provider payloads out of fixtures.
7. For complete automation landing tasks, collect at least one browser-agent smoke evidence item, such as a screenshot, console/network summary, mobile overflow check, upload interaction, or local-only network-negative observation. Skip this only when the user explicitly limited scope to API, component, or unit tests, and record the scoped-skip reason.
8. Run the narrowest command that covers the new tests, then report command, result, failures, and artifacts.
9. If a selected case cannot be automated safely, downgrade it to `manual`, `exploratory`, or `not-automated-risk-note` and explain the blocker.

## Required Handoff For Implemented Tests

- Test case IDs covered.
- Files added or changed.
- Runner and command.
- Fixture/data setup.
- Assertions implemented.
- Browser-agent smoke evidence, or explicit scoped-skip reason.
- Evidence artifacts expected on failure.
- Known gaps and cases intentionally left manual.

## Layer Patterns

| Layer | Use when | Typical assertions | Evidence |
| --- | --- | --- | --- |
| API/route | Contract, auth, validation, billing, provider dispatch, webhook state | status, JSON shape, DB/state mutation, side-effect calls | command output, mocked call summary |
| Component | UI state, form validation, action availability, local interactions | role/text queries, state changes, callback calls | command output, DOM snippet if needed |
| Browser runner | Cross-page workflow, routing, storage, uploads, responsive behavior | URL, role locators, network wait, screenshot/trace | trace, screenshot, video, report |
| Browser-agent smoke | Quick local confidence, screenshots, console/network observations | visible state, no console errors, no overflow, key network calls | screenshot path, console/network summary |
| Manual/live | Paid providers, subjective quality, external callback delivery, real payment/webhook | redacted live evidence, callback/poll state, cost cap | redacted logs, safe IDs, manual notes |

## Template Assets

- `assets/automation-templates/playwright.spec.ts`: durable browser regression.
- `assets/automation-templates/cypress.cy.ts`: Cypress app/e2e regression.
- `assets/automation-templates/vitest-route.test.ts`: API/route contract tests.
- `assets/automation-templates/testing-library.test.tsx`: React component tests.
- `assets/automation-templates/selenium.test.js`: Selenium/WebDriver smoke tests.
- `assets/automation-templates/webdriverio.e2e.js`: WebdriverIO browser workflow smoke tests.

## Code Review Checklist

- Each implemented test maps to a case ID and source evidence.
- Selectors prefer accessible roles, labels, or stable test IDs already used by the project.
- Waits are event or state based; avoid arbitrary sleeps.
- Tests own or reset their data.
- Third-party services are mocked unless the case is explicitly manual/live.
- Failure artifacts are enabled for browser runner tests.
- Complete automation landing includes browser-agent smoke evidence or an explicit scoped-skip reason.
- Commands are scoped and documented.
- New tests are not duplicating lower-layer coverage without adding confidence.
