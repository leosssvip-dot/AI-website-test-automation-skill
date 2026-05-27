# Coverage Matrix

Use a coverage matrix to expose gaps instead of generating a flat list of generic checks.

## Columns

- Product area.
- Workflow.
- Persona or role.
- Risk.
- Source evidence.
- Source status: `documented`, `inferred`, `observed`, or `mismatch`.
- Test layer.
- Priority.
- Data need.
- Automation feasibility.
- Current coverage.
- Gap or next action.

## Rules

- Start from critical user workflows and high-risk boundaries.
- Include existing tests before proposing new tests.
- Mark unknown areas explicitly.
- Mark mismatches explicitly and put the needed product decision in the gap column.
- Do not claim coverage without evidence.
- Keep manual and exploratory coverage visible when automation is unsafe or low value.

Use `assets/coverage-matrix-template.md` as the output template.
