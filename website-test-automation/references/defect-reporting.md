# Defect Reporting

Use this when testing finds a product bug — from scripted cases, exploratory sessions, browser smoke, failure triage, or the human-reasonableness gate. A defect report must let a developer reproduce the problem without asking follow-up questions.

## Required Fields

- Title: behavior-focused and specific ("Archived project still accepts edits via direct URL"), never "page broken".
- Environment: URL or build/commit, browser and viewport, account or role, and relevant data state.
- Preconditions and steps to reproduce: numbered, minimal, deterministic — strip steps that do not affect the outcome.
- Expected result with source evidence: the PRD section, design frame, schema, or documented behavior that defines "correct".
- Actual result with evidence: screenshot, console/network summary, redacted response payload, or trace path.
- Severity and priority (below).
- Scope notes: affected roles, browsers, or data ranges, and whether it regressed from a known-good build.
- Related IDs: test case ID, logic finding ID, or failing CI run.

## Severity And Priority

Severity measures impact; priority measures fix order. Set both; do not blend them.

| Severity | Meaning | Examples |
| --- | --- | --- |
| S1 | Blocks a core flow or damages data, money, or auth | login broken, double-charge, data loss, IDOR |
| S2 | Major function wrong but a workaround exists | create works but edit fails, wrong totals |
| S3 | Minor function or UX defect | misleading copy, broken state after refresh |
| S4 | Cosmetic | spacing, non-blocking visual drift |

- Default mapping: S1 to P0, S2 to P1, S3 to P2, S4 to P3; adjust for release context — an S3 in tomorrow's launch flow can be P1.
- The logic findings ledger records both S-severity and P-priority. When a finding becomes a defect, preserve its impact severity, reassess priority for the release context, and file it only after the product decision says current behavior is wrong ([human-reasonableness.md](human-reasonableness.md)).

## Quality Rules

- One defect per root cause; ten symptoms of one broken endpoint are one report with a symptom list.
- Reproduce before filing. If not reproducible, file it as intermittent with frequency, conditions, and evidence — do not silently drop it.
- Classify product bug vs test bug vs environment first ([flake-triage.md](flake-triage.md)); only product bugs become defect reports.
- Search known issues before filing; link duplicates instead of re-reporting.
- Redact secrets, tokens, PII, customer data, and raw payloads from every field and attachment.

## Lifecycle And Regression

- After a fix, verify with the original steps plus the nearest negative case, then close with verification evidence.
- Run each fixed defect through the disposition gate ([scenario-workflows.md](scenario-workflows.md)): recurring or high-risk defects earn a durable regression case; one-off cosmetic fixes may not.
- When the same root cause returns, reopen with new evidence rather than filing a fresh duplicate.

Use the Defect Report template in [output-templates.md](output-templates.md).
