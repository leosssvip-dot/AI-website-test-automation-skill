# Test Case Authoring

Test cases first. Browser automation is an implementation choice after product-grounded cases exist.

## Test Case Types

- Happy path.
- Negative path.
- Boundary and validation.
- Permission and role access.
- State transition.
- Data lifecycle.
- API contract (see [api-contract-testing.md](api-contract-testing.md)).
- Responsive and cross-browser.
- Accessibility.
- Visual regression.
- Performance smoke.
- Security smoke.
- i18n and localization.
- Human logic and reasonableness.

## Deriving Cases

Apply [test-design-techniques.md](test-design-techniques.md) — equivalence partitioning, boundary values, decision tables, state transitions, pairwise combinations, and error guessing — to derive these case types systematically instead of listing only happy paths.

## Quality Rubric

A useful test case must:

- Be traceable to product docs, source code, existing tests, reports, or observed behavior.
- Have a clear risk and priority.
- Have executable steps.
- Have deterministic expected results when possible.
- Name required data and preconditions.
- Separate durable automation from manual or exploratory checks.
- Compare documented expectation, observed behavior, and human expectation for workflows that can be unreasonable even when implemented correctly.
- Record assumptions and unknowns.

## Good Example

```yaml
id: TC-AUTH-001
title: Valid user logs in and lands on dashboard
source:
  docs: ["docs/PRD.md#FR-1"]
  code: ["src/app/login/page.tsx", "src/server/auth.ts"]
  observed: []
source_status: documented
mismatch: ""
human_expectation: "User expects a clear next step after login."
why_unreasonable: ""
logic_risk: false
suggested_product_fix: ""
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
negative_cases:
  - Invalid credentials show a safe error and do not create a session
data_needs:
  - Active test user with known credentials
automation:
  recommended: true
  target: durable-regression
  preferred_tools: ["existing browser runner"]
evidence:
  required:
    - Login route source
    - Auth server/session source
assumptions: []
unknowns: []
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

## Human-Logic Cases

Use `logic_risk: true` when the test exists because a flow may be unreasonable for a first-time user, returning user, or mistake-prone user. These cases can become exploratory checks or product-decision blockers; do not turn them into durable regression tests until the intended behavior is accepted.
