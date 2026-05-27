# Test Case Authoring

Test cases first. Browser automation is an implementation choice after product-grounded cases exist.

## Test Case Types

- Happy path.
- Negative path.
- Boundary and validation.
- Permission and role access.
- State transition.
- Data lifecycle.
- API contract.
- Responsive and cross-browser.
- Accessibility.
- Visual regression.
- Performance smoke.
- Security smoke.
- i18n and localization.

## Quality Rubric

A useful test case must:

- Be traceable to product docs, source code, existing tests, reports, or observed behavior.
- Have a clear risk and priority.
- Have executable steps.
- Have deterministic expected results when possible.
- Name required data and preconditions.
- Separate durable automation from manual or exploratory checks.
- Record assumptions and unknowns.

## Good Example

```yaml
id: TC-AUTH-001
title: Valid user logs in and lands on dashboard
source:
  docs: ["docs/PRD.md#FR-1"]
  code: ["src/app/login/page.tsx", "src/server/auth.ts"]
type: e2e
priority: P0
risk: auth/session
persona: registered_user
preconditions:
  - Active user exists
steps:
  - Open login page
  - Enter valid credentials
  - Submit form
expected:
  - User reaches dashboard
  - Session is established
automation:
  recommended: true
  target: durable-regression
```

## Anti-Example

```yaml
title: Check login works
steps:
  - Test login
expected:
  - It works
```

Reject cases like this because they lack source evidence, risk, preconditions, executable steps, and deterministic expectations.

