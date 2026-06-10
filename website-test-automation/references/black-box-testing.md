# Black-Box And URL-Only Testing

Use this when the tester has a URL, PRD, prototype, or design artifacts but no source-code access — a common QA situation. The workflow and schema stay the same; only the evidence sources and the automation boundary change.

## Evidence Model Without Source

- `documented`: PRD, requirements docs, design specs, and prototypes ([design-source-adapters.md](design-source-adapters.md)).
- `observed`: live behavior captured through browser tools — screenshots, console/network notes, crawl findings ([ai-native-testing.md](ai-native-testing.md)).
- `inferred`: conclusions drawn from visible UI structure, URL patterns, or API responses seen in the network panel.
- `mismatch`: documented expectation conflicts with observed behavior.
- `source.code` stays empty; P0/P1 cases satisfy the evidence rule with `docs`/`observed` entries or explicit `unknowns` ([testcase-schema.md](testcase-schema.md)).

## Adapted Workflow

1. Skip the repo helper scripts; build the product model from the PRD and design sources plus an exploratory crawl of the live target.
2. Run the Human Reasonableness Review Gate unchanged ([human-reasonableness.md](human-reasonableness.md)) — it needs no source access.
3. Enumerate routes and states by crawling; record findings as `observed` with evidence paths.
4. Author cases and the coverage matrix normally; expect more `observed`/`inferred` statuses and more `unknowns`.
5. Run the Post-Test-Case Disposition Gate with the constrained automation boundary below.
6. File confirmed bugs as defect reports ([defect-reporting.md](defect-reporting.md)) and unreasonable flows as logic findings; deliver the access escalation list with the report.

## Automation Boundary

Without control of code, data, and environment, most cases cannot become durable regression yet:

- Allowed freely: browser-agent smoke, exploratory sessions, manual/live checks, and observed API contract notes from the network panel.
- Durable browser regression: only when the tester controls test accounts, test data, and a stable environment — otherwise mark the case `automate-later` and name the missing control.
- API or component layers: require an API contract doc or repository access; do not guess private contracts into tests.
- Never load-test, fuzz, or probe security intrusively on a target you only have a URL for ([visual-a11y-performance-security.md](visual-a11y-performance-security.md)).

## Production Caution

When the only reachable target is production: read-only paths first; no destructive writes, paid completions, or mass submissions; use dedicated test accounts; redact customer data from all evidence ([provider-live-testing.md](provider-live-testing.md)).

## Access Escalation List

Report what access would unlock the next readiness level: repository or API-doc access, test accounts per role, a staging environment, seeded test data, or CI artifacts. Mark readiness dimensions that need team-owned infrastructure (automation implementation, CI evidence) as scoped-skip with the blocking access named ([readiness-model.md](readiness-model.md)).
