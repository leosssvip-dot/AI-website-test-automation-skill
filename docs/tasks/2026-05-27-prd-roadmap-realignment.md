# PRD And Roadmap Realignment

## Status

Done

## Goal

Realign the planning docs with the global `AGENTS.md` PRD model by separating product requirements from the development roadmap and keeping progress as a current-status dashboard.

## Scope

- Add `docs/PRD.md` as the product requirements source.
- Compact `docs/DEVELOPMENT_PLAN.md` so it derives from the PRD instead of duplicating product details.
- Update `docs/PROGRESS.md` with current PRD alignment status.

## Risk Tier

Tier 1: documentation-only planning.

## Acceptance Criteria

- `docs/PRD.md` owns target users, workflows, requirements, non-goals, success metrics, constraints, and product-level acceptance criteria.
- `docs/DEVELOPMENT_PLAN.md` includes a compact Product Requirements Source section and roadmap milestones.
- `docs/PROGRESS.md` remains a short current-state dashboard.
- Verification records that docs were checked for the new PRD split.

## Verification Result

- `find docs -maxdepth 3 -type f` confirmed `docs/PRD.md`, `docs/DEVELOPMENT_PLAN.md`, `docs/PROGRESS.md`, and task records exist.
- `rg` confirmed `docs/DEVELOPMENT_PLAN.md` has a compact `Product Requirements Source` section with `FR-1` through `FR-9` and `NFR-1` through `NFR-6`.
- `test -f scripts/validate-agent-workflow.mjs` returned validator absent, so no workflow validator was applicable.

## Final Outcome

Aligned planning docs to global `AGENTS.md` Version 2.7:

- Added `docs/PRD.md` as the product requirements source.
- Rewrote `docs/DEVELOPMENT_PLAN.md` as a compact PRD-derived roadmap.
- Updated `docs/PROGRESS.md` as the current execution dashboard with PRD alignment status.
