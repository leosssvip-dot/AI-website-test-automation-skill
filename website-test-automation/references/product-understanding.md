# Product Understanding

Build a product model before writing substantial test cases.

## Requirements Source Ranking

Use the strongest available source first:

1. Canonical PRD or requirements docs: `docs/PRD.md`, `docs/product/*`, `docs/requirements*`, or a project-named PRD path.
2. Product design docs, planning docs, roadmap docs, and task records.
3. README, architecture docs, domain glossary, and release notes.
4. Route files, UI components, API handlers, schemas, fixtures, and feature flags.
5. Existing tests, test reports, issue notes, screenshots, traces, and live browser observations.

When no canonical PRD exists, still build the product model, but mark each claim with a source status:

- `documented`: explicit in PRD, product docs, planning docs, roadmap, or task records.
- `inferred`: derived from source code, route shape, schemas, tests, or naming.
- `observed`: seen in browser behavior, reports, screenshots, logs, traces, or runtime output.
- `mismatch`: sources disagree or current behavior conflicts with a documented requirement.

Do not flatten mismatches into assumptions. Keep them visible in the product model, coverage matrix, and test cases until the user or product source resolves the decision.

## Product Model

Capture only what matters for testing:

- Personas and roles.
- Core workflows and alternate paths.
- Business entities and state transitions.
- Permissions and authorization boundaries.
- Data lifecycle: create, read, update, delete, archive, restore, import, export.
- Integrations, third-party services, mocks, and unavailable dependencies.
- Non-goals and product constraints.
- Acceptance criteria and known risks.

## Output

Summarize the product model before generating cases when the request is broad. Keep it short, cite source evidence, and separate documented, inferred, observed, and mismatch claims.
