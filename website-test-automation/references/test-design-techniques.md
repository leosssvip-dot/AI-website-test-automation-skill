# Test Design Techniques

Use these techniques while authoring cases ([test-case-authoring.md](test-case-authoring.md)) to derive inputs, combinations, and states systematically instead of listing only happy paths. Derived cases still need source evidence, risk, priority, and the schema in [testcase-schema.md](testcase-schema.md).

## Technique Selection

| Situation | Technique |
| --- | --- |
| Input field with a range, length, format, or enum constraint | Equivalence partitioning plus boundary value analysis |
| Outcome decided by multiple interacting conditions or rules | Decision table |
| Entity moves through statuses (draft, active, archived) | State transition |
| Many configuration dimensions (browser, role, locale, plan) | Pairwise combination |
| Legacy area, incident history, or known team blind spots | Error guessing from a risk catalog |
| Entity created, edited, and removed across screens | CRUD/data lifecycle pass |

## Equivalence Partitioning And Boundary Values

- Split each input into valid and invalid classes; test one representative per class instead of many duplicates of the same class.
- Add boundary cases at min, min-1, max, max+1, empty, and missing for every range or length rule.
- For free-text fields include format-level classes: leading/trailing spaces, unicode and emoji, very long input, and HTML/script characters (also a security-smoke seed).
- Cite the source of each constraint (PRD rule, schema, validation code). When no source defines a boundary, record it as an `unknowns` entry instead of inventing one.

Example: "project name, 1-50 chars, required, unique" yields classes for a valid mid-length name, empty, 1 char, 50 chars, 51 chars, whitespace-only, duplicate name, and a unicode name.

## Decision Tables

- Use when two or more conditions jointly decide the outcome (permission, plan, and feature flag together).
- List each condition as a column, enumerate combinations with distinct outcomes, and mark impossible combinations explicitly instead of skipping them silently.
- Each row with a distinct outcome becomes a case; rows whose documented outcome is unclear become `mismatch` or `unknowns` entries.

## State Transition

- Derive the entity's states and allowed transitions from the PRD or code (status enums, reducers, workflow handlers).
- Cover every allowed transition once, and probe key forbidden transitions: skip a step, repeat a step, act on a deleted or archived entity.
- Include interruption paths — refresh, back, cancel, timeout mid-transition — using the recovery questions in [human-reasonableness.md](human-reasonableness.md).

## Pairwise Combination

- When the full cross product is too large (browser, viewport, role, locale), cover every pair of values at least once instead of every combination.
- Anchor the pairwise set on the riskiest dimension (auth role or money-affecting plan) so each high-risk value still meets every other dimension.

## Error Guessing And Risk Catalog

Seed checks from recurring web failure modes: duplicate submit, double-click, race between tabs, expired session mid-form, paste into validated fields, network failure on submit, slow responses, empty lists, pagination edges, timezone and locale formats, and concurrent edits to one record.

Tie each guess to evidence when it lands — an issue link, incident, code path, or observed behavior — otherwise keep it `exploratory`.

## CRUD/Data Lifecycle Pass

- Walk the entity through create, read, update, delete, and any archive/restore/import/export states the product supports ([product-understanding.md](product-understanding.md)).
- At each step verify the change everywhere it surfaces — list views, detail views, counts, search, exports, and the API response — not only the screen that performed it.
- Probe lifecycle edges: delete an entity referenced elsewhere, edit after archive, re-create with a just-deleted unique name, and concurrent edits to the same record.

## Rules

- Techniques generate candidates; the schema and quality rubric decide what survives ([test-case-authoring.md](test-case-authoring.md)).
- Prefer fewer, stronger cases: one representative per equivalence class plus boundaries beats exhaustive duplicates ([test-quality.md](test-quality.md)).
- Record which technique produced a case when it is not obvious, so reviewers can check class coverage instead of re-deriving it.
