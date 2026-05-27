# Test Case Schema

Use this schema for generated test cases.

## Required Fields

```yaml
id: TC-AREA-001
title: Short behavior-focused title
source:
  docs: []
  code: []
  observed: []
source_status: documented
mismatch: ""
type: e2e
priority: P0
risk: auth/session
persona: registered_user
preconditions: []
steps: []
expected: []
negative_cases: []
automation:
  recommended: true
  target: durable-regression
  preferred_tools: []
evidence:
  required: []
assumptions: []
unknowns: []
```

## Valid Values

- `priority`: `P0`, `P1`, `P2`, `P3`
- `type`: `e2e`, `api`, `component`, `visual`, `accessibility`, `performance`, `security-smoke`, `manual`, `exploratory`
- `source_status`: `documented`, `inferred`, `observed`, `mismatch`
- `automation.target`: `durable-regression`, `browser-agent-smoke`, `exploratory`, `manual`, `api-or-component`, `not-automated-risk-note`

## Review Rules

- Every P0/P1 case needs at least one source evidence entry or an explicit `unknowns` entry.
- Every case needs `source_status`; broad reviews should preserve this field in tables and YAML.
- Use `documented` only when the expected behavior is explicit in a product, planning, roadmap, or requirements source.
- Use `inferred` when the expected behavior is derived from code, schemas, routes, tests, or naming.
- Use `observed` when the expected behavior comes from browser/runtime/report evidence.
- Use `mismatch` when sources disagree; fill `mismatch` with the conflicting evidence and do not recommend durable regression automation until the expected behavior is decided, unless the case explicitly documents current behavior as a temporary characterization test.
- Avoid cases whose expected result is only "works".
- Avoid automation recommendations when data, auth, or environment control is unknown.
