# Test Infrastructure

Use this when landing durable automation, not just authoring cases. Most flaky, slow, or unmaintainable suites fail here — in auth, data, selectors, environment, or architecture — rather than in the test logic itself. Stay tool-agnostic: the patterns below map onto the project's existing runner.

## Auth And Session Reuse

Re-logging in through the UI before every test is the most common cause of slow, flaky e2e suites.

- Authenticate once, persist the session, and reuse it across tests. Mechanisms by stack: Playwright `storageState`, Cypress `cy.session`, WebdriverIO/Selenium saved cookies or a programmatic login request.
- Prefer a programmatic/API login (set cookie or token directly) over driving the login form, except in the one test that explicitly covers login.
- Keep one saved session per role (anonymous, user, admin, billing-owner). Build them in a global setup step, not inside each test.
- Never commit real credentials or saved session files. Read them from env or a test-account secret, and gitignore generated state.
- Re-create or refresh session state when it can expire; assert the session is valid at setup so an expired token fails fast with a clear message.

## Test Data Lifecycle

A test must own its data so it can run in isolation, in parallel, and repeatedly.

- Create the data the test needs (factory, seed script, API call, or fixture) and tear it down or namespace it so reruns do not collide.
- Generate unique values (email+timestamp, UUID suffix) instead of shared hardcoded records, so parallel workers do not fight over the same row.
- Prefer setup through the fastest reliable layer: API or DB seed for preconditions, UI only for the behavior under test.
- Decide a cleanup strategy: per-test teardown, per-suite reset, or disposable namespace/tenant. Make it deterministic, not "hope the next run overwrites it".
- Keep secrets, customer data, and provider payloads out of fixtures and seeds. Use synthetic data.
- For destructive or stateful flows, isolate by unique account, workspace, or tenant rather than sharing one global record.

## Selector And Test-ID Strategy

Selector choice decides how often the suite breaks on unrelated UI edits.

| Priority | Selector | Use when |
| --- | --- | --- |
| 1 | Accessible role + name | Interactive elements: buttons, links, inputs, headings |
| 2 | Label / placeholder / associated text | Form fields and labeled controls |
| 3 | Stable `data-testid` already in the source | No reliable role/label, or ambiguous matches |
| 4 | Text content | Stable, user-visible copy that is unlikely to churn |

- Avoid CSS/XPath tied to layout, nth-child, generated class names, or DOM structure.
- When no stable hook exists, add a `data-testid` (or the project's existing convention) to the source instead of writing a brittle selector. Record it as a small source change in the handoff.
- Reuse the project's existing test-id convention; do not introduce a competing one.

## Environment Bootstrapping

Tests need a known, ready target before they run.

- Resolve the base URL from config/env (`BASE_URL`), never hardcode `localhost:3000` in each test.
- Start the app and wait for genuine readiness (health endpoint or expected response), not a fixed sleep. Many runners have a built-in web-server/wait hook — use it.
- Pin or document required services: database, mock servers, third-party stubs, env vars, seeded migrations.
- Make the same command work locally and in CI; differences in viewport, fonts, timezone, or locale are a frequent source of CI-only failures — set them explicitly.
- Fail fast with a clear message when a prerequisite (service down, missing env, unseeded data) is absent, instead of letting tests fail deep with confusing errors.

## Suite Architecture

Structure exists to keep the suite maintainable as it grows, not for its own sake.

- Encapsulate page/flow interactions (page objects, screen helpers, or fixtures) so a UI change updates one place, not every test.
- Centralize setup, auth, and data helpers as fixtures or shared utilities; keep test bodies focused on behavior and assertions.
- Keep assertions in the test, not hidden inside helpers, so failures point to intent.
- Name tests by behavior and map each to a case ID and source evidence (see [test-case-authoring.md](test-case-authoring.md)).
- Match the repo's existing layout and naming before inventing new structure.

## Guardrails

- No arbitrary sleeps; wait on events, responses, or state.
- No shared mutable global data across tests that run in parallel.
- No real credentials, session files, or PII committed to the repo.
- Do not build new infrastructure when the project already has auth helpers, factories, fixtures, or a base config — reuse them.
- When a flow cannot be made deterministic (uncontrolled data, external timing, real provider), keep it manual or exploratory rather than landing a flaky test. See [automation-selection.md](automation-selection.md).
