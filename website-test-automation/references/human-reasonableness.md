# Human Reasonableness Review

Use this gate after product modeling and before writing source-backed test cases. The goal is to test like a human, not just confirm that implementation matches requirements.

## Core Rule

Do not assume the PRD, plan, design, or current implementation is reasonable. Compare documented expectation, observed behavior, and human expectation. When they differ, record a logic risk before converting it into a test case, exploratory check, or product decision.

## Required Personas

Review every core workflow through at least these personas:

- First-time user: does not know internal terms, hidden setup, or the domain model.
- Returning user: has prior state, abandoned work, saved drafts, expired sessions, or wants to continue.
- Mistake-prone user: enters wrong data, clicks the wrong control, goes back, refreshes, retries, or changes their mind.

Add role-specific personas when permissions, billing, creator/admin roles, or provider access affects the flow.

## Human Logic Questions

Ask these before treating expected behavior as valid:

1. Why would the user do this now?
2. Can the user identify the next action within about five seconds?
3. Does the flow ask for a decision before the user has enough context?
4. Are defaults aligned with the common or safest user intent?
5. Can the user recover after validation errors, network delays, refresh, back navigation, duplicate submit, or cancellation?
6. Does the copy use user language instead of system, code, provider, or database language?
7. Are irreversible actions, hidden costs, provider usage, data loss, or public visibility explained before commitment?
8. Does success leave the user with an obvious next step?

## Logic Findings Ledger

Create a ledger entry for every unreasonable or unclear workflow. This is separate from ordinary bugs because the implementation may match the document while the product logic is still wrong.

```yaml
id: HLR-AREA-001
workflow: replace-with-workflow
persona: first-time user
documented_expectation: ""
observed_behavior: ""
human_expectation: ""
why_unreasonable: ""
severity: S2
priority: P1
source:
  docs: []
  code: []
  observed: []
logic_risk: true
suggested_test:
  type: exploratory
  goal: ""
suggested_product_fix: ""
decision_needed: ""
```

## Conversion Rules

- Record impact as `severity: S1` through `S4` and fix order as `priority: P0` through `P3`; keep both fields separate.
- If the product logic is clearly wrong, create a `human-logic-risk` disposition and avoid durable regression automation until the behavior is accepted or fixed.
- If the logic is unclear but high-risk, create an exploratory or manual case with `source_status: mismatch`.
- If current behavior is temporarily intentional, document it as a characterization test and include the reason.
- If the issue is only copy, layout, or discoverability, still record the human expectation and route it to visual, accessibility, or exploratory coverage as appropriate.
- If the implementation is broken outright rather than a logic-design question, file it as a defect with [defect-reporting.md](defect-reporting.md) and link the ledger entry.

## Evidence Standard

Mark each ledger finding as documented, observed, inferred, or mismatch. Use screenshots, route/source references, PRD sections, planning docs, existing tests, console/network observations, or browser smoke notes when available. Redact secrets, customer data, provider payloads, one-time IDs, and PII.
