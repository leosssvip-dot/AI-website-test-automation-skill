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
human_expectation: ""
why_unreasonable: ""
logic_risk: false
suggested_product_fix: ""
type: e2e
priority: P0
risk: auth/session
persona: registered_user
preconditions: []
steps: []
expected: []
negative_cases: []
data_needs: []
automation:
  recommended: true
  target: durable-regression
  preferred_tools: []
evidence:
  required: []
assumptions: []
unknowns: []
```

`scripts/validate-testcases.mjs` errors when `id`, `title`, `source`, `source_status`, `type`, `priority`, `steps`, `expected`, or `automation` is missing; every other schema field is still expected, and an absent field produces a warning rather than an error.

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
- Fill `human_expectation` when normal user intent differs from documented expectation or observed behavior.
- Fill `why_unreasonable` and set `logic_risk: true` when the issue is product logic, discoverability, recovery, hidden cost, irreversible action, confusing state, or user-language mismatch rather than a simple implementation bug.
- Use `suggested_product_fix` for the smallest product change that would resolve the human-logic risk; leave it empty when a product decision is needed first.
- Avoid cases whose expected result is only "works".
- Use `data_needs` for required accounts, records, fixtures, mocks, files, provider state, or reset rules.
- Avoid automation recommendations when data, auth, or environment control is unknown.

## Validation

Run `scripts/validate-testcases.mjs <file-or-dir>` on generated cases to enforce this schema. It errors on missing core fields, invalid `priority`/`type`/`source_status`/`automation.target` values, and P0/P1 cases without source evidence or an explicit `unknowns` entry; it warns on vague expectations, empty steps, and unfilled schema fields. Accepts a single mapping, a sequence of cases, multi-document YAML, or JSON.

The bundled zero-dependency parser supports plain and quoted scalars, flow and block sequences, nested mappings, multi-document YAML, and JSON. It does not support block scalars (`|`, `>`), anchors, or trailing `#` comments after values — keep each step and expectation on a single line. A value that both starts and ends with brackets parses as a flow collection; quote it (e.g. `"[Smoke]"`) when it is meant as text.

Run `scripts/export-testcases.mjs <file-or-dir> --format csv|md` to convert validated cases into a CSV for test-management import (TestRail/Xray/ZenTao-style columns) or a Markdown review table.
