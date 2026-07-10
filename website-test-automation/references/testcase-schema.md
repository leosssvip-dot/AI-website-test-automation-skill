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

`scripts/validate-testcases.mjs` errors when an own `id`, `title`, `source`, `source_status`, `type`, `priority`, `steps`, `expected`, or `automation` field is missing; inherited properties never satisfy the schema. Every other schema field is still expected, and an absent field produces a warning rather than an error.

## Field Shapes

- `id`, `title`, `source_status`, `type`, and `priority` must be strings.
- `source` must be a plain mapping. Its `docs`, `code`, and `observed` fields are required arrays containing only strings.
- `steps` and `expected` must be string arrays. Empty arrays remain quality warnings because a case is not executable or deterministic until both are filled.
- `automation` must be a plain mapping. When present, `recommended` must be boolean, `target` must use the enum below, and `preferred_tools` must be a string array.
- `mismatch`, `human_expectation`, `why_unreasonable`, `suggested_product_fix`, `risk`, and `persona` must be strings when present. `logic_risk` must be boolean.
- `preconditions`, `negative_cases`, `data_needs`, `assumptions`, and `unknowns` must be string arrays when present.
- `evidence` must be a plain mapping when present, and its optional `required` field must be a string array.

## Valid Values

- `priority`: `P0`, `P1`, `P2`, `P3`
- `type`: `e2e`, `api`, `component`, `visual`, `accessibility`, `performance`, `security-smoke`, `manual`, `exploratory`
- `source_status`: `documented`, `inferred`, `observed`, `mismatch`
- `automation.target`: `durable-regression`, `browser-agent-smoke`, `exploratory`, `manual`, `api-or-component`, `not-automated-risk-note`

## Review Rules

- Every P0/P1 case needs at least one non-empty source evidence string or a non-empty string in `unknowns`; empty or whitespace-only entries do not count.
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

Run `scripts/validate-testcases.mjs <file-or-dir>` on generated cases to enforce this schema. It errors on missing core fields, wrong field shapes, invalid `priority`/`type`/`source_status`/`automation.target` values, and P0/P1 cases without non-empty source evidence or unknown text; it warns on vague expectations, empty steps, and unfilled schema fields. It accepts a single mapping, a sequence of cases, multi-document YAML, or JSON.

The bundled zero-dependency parser supports plain and quoted scalars, flow and block sequences, nested mappings, multi-document YAML, and JSON. File extensions are matched case-insensitively. It returns parse errors for unterminated or mismatched quoted scalars, malformed flow collections, unsafe mapping keys (`__proto__`, `prototype`, or `constructor`), block scalars (`|`, `>`), anchors/aliases/merge keys, and unexpected indentation. Parser-created mappings have no prototype. It does not support trailing `#` comments after values — keep each step and expectation on a single line. A value that both starts and ends with brackets parses as a flow collection; quote it (e.g. `"[Smoke]"`) when it is meant as text. Every JSON-array or YAML-sequence member is schema-validated; scalar members are errors rather than being discarded.

Direct inputs must be regular `.yaml`, `.yml`, or `.json` files or directories. Direct symbolic links and unsupported files are rejected; directory scans skip symbolic links and de-duplicate repeated inputs. A directory with no supported regular case files fails validation instead of reporting an empty success.

Run `scripts/export-testcases.mjs <file-or-dir> --format csv|md` to convert validated cases into a CSV for test-management import (TestRail/Xray/ZenTao-style columns) or a Markdown review table. Export uses the same schema validator and fails closed: any parse or schema error exits `1` without emitting a stdout artifact or writing `--out`. An output path that normalizes or resolves to an input file exits `2` without changing the input. Successful `--out` writes use a same-directory temporary file followed by atomic rename, and failed writes clean up the temporary file.
