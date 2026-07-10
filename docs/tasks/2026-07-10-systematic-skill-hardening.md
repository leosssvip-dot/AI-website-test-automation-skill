# Systematic Skill Hardening

## Status

Done

## Goal

Fix the high-confidence findings from the 2026-07-10 review so package validation, report summaries, test-case artifacts, automation templates, worked examples, and readiness claims fail closed and remain evidence-backed.

## Scope

- Implement the approved P1 fixes and the P2 fixes that directly affect safe real-project use.
- Preserve the zero-dependency Node design and existing public scope.
- Add regression evidence before each behavior change.
- Align `SKILL.md`, references, assets, scripts, tests, and installed-copy behavior.

## Risk Tier

Tier 3: public skill behavior, helper scripts, output contracts, safety/redaction, and CI validation. No production auth, billing, customer data, deployment, or secrets are touched.

## Acceptance Criteria

- Reviewed P1 reproducers fail before their fixes and pass afterward.
- Candidate skills are not executed during default structural validation.
- Report truncation and sensitive-value handling cannot produce silent false-green or raw-secret output.
- Invalid or malformed cases cannot validate or export successfully; exports cannot overwrite inputs or silently produce partial output.
- Starter templates exercise target-project code; examples do not claim unrun work landed.
- `surface`, `layer`, and `disposition` are consistent across schema, validator, export, and reporting.
- 90+ readiness requires structured, non-placeholder real-project evidence.
- Monorepo, route-method, route-segment, and symlink boundary regressions are covered.
- Full repository, skill, and installed-copy validation pass.

## Verification Result

- Source package: `npm run validate` passed 122 repository checks plus agent-workflow validation; the local skill validator and the official `quick_validate.py` both exited 0; `git diff --check` passed.
- Preserved-baseline forward test: the same fresh, temporary support-console artifact was run against `16f39e8` and the hardened branch. Observable changes were:
  - stack discovery moved from zero framework/test-runner signals to three workspace packages with Next.js, React, Express, Playwright, and Vitest signals;
  - route inventory moved from two incomplete routes, including a commented false-positive DELETE, to `GET|POST|HEAD /api/tickets`, `/inbox/compose`, and the real Express PATCH route;
  - report summarization moved from silently reading 20/21 files and reporting zero failures to reading 21/21, reporting the late failure, and rendering its Authorization value as `[REDACTED]`;
  - a case with string-valued `steps` and `expected` moved from false-green exit 0 to two schema errors and exit 1.
- Installed copy: `/Users/chenyang/.codex/skills/website-test-automation` is byte-for-byte aligned with the source skill (`diff -qr` empty), both validators passed, and installed-copy stack, route, report, invalid-case, and readiness smokes matched source behavior. Readiness reports `contractScore: 100`, evidence-calibrated `overallScore: 89`, and no bundled real-project evidence claim.
- Independent reviews closed all reported Critical/Important findings; the final whole-package audit returned `Critical: 0`, `Important: 0`, `Minor: 0`, and `Ready: yes` after re-running the adversarial readiness, route, report-safety, schema, and metadata reproducers.
- Residual assumption: static symlink, inode, containment, same-file-descriptor, and resource-bound tests cover the intended local threat model; the suite does not deterministically force an attacker-controlled parent-directory swap between every filesystem syscall.

## Final Outcome

The approved P1 and directly useful P2 hardening is implemented, regression-covered, forward-tested against the preserved baseline, independently reviewed, and synchronized to the installed Codex skill. No roadmap, dependency, authentication, billing, deployment, or customer-data behavior changed.
