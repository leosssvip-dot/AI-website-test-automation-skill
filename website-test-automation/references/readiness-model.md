# Readiness Model

Use this when the user asks whether testing is complete, mature, production-ready, or in the 80-90% range.

## Eight Workstreams

1. Product understanding: requirements source, personas, workflows, entities, states, permissions, non-goals, assumptions.
2. Source-backed cases: schema-complete test cases with source evidence, risk, priority, data needs, expected results, and unknowns.
3. Coverage matrix: workflow/risk/layer coverage with current tests, gaps, and product mismatches.
4. Automation implementation: concrete files, runner choice, fixtures, deterministic assertions, failure artifacts, and commands.
5. Browser-smoke evidence: screenshots, console/network summaries, mobile overflow, upload/auth interactions, or scoped-skip reason.
6. CI/flaky reporting: reports, traces, retries, failure category, first failing step, artifact paths, and fix verification.
7. Provider/live governance: disabled path, cost cap, representative completion, callbacks/polling, storage, refund/credit handling, redaction.
8. Specialized quality: visual, accessibility, performance smoke, security smoke, responsive, cross-browser, and i18n where relevant.

## Scoring Bands

- 0-49: exploratory only; do not call it broad test coverage.
- 50-69: useful planning coverage; automation and evidence gaps remain.
- 70-79: operational candidate; good guidance but weak specialist or real-project proof.
- 80-90: mature candidate; every workstream has guidance, templates or scripts, evidence rules, and known gaps.
- 90+: proven maturity; multiple real projects validate the workflow and failure modes.

## Rules

- Run `scripts/score-test-readiness.mjs <repo-or-skill>` for broad completeness claims.
- Treat 80-90 as a readiness target, not a guarantee of product quality.
- Do not average away a critical gap: auth, payments, provider/live, CI, or data lifecycle blockers must stay visible.
- If a workstream is intentionally out of scope, mark it as scoped-skip and explain the risk.

Use `assets/readiness-score-template.md` for final reporting.
