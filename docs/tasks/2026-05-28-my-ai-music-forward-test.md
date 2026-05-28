# My AI Music Forward Test

## Status
Done

## Goal

Use the current `my-ai-music` checkout as a real-project forward test for `$website-test-automation`, identify missing skill test coverage, and patch the skill where real-project behavior exposes deterministic gaps.

## Scope

- Treat `/Users/chenyang/myfolder/cursor/6times/my-ai-music` as the target project.
- Re-check live target repo state instead of relying on prior summaries.
- Run skill helper scripts against the target.
- Prefer read-only analysis first; modify target project only for selected mapped automated tests if needed.
- Patch `$website-test-automation` when target behavior reveals a skill-side gap.

## Risk Tier

Tier 3: skill behavior, helper script scoring, real-project testing evidence, and possible target-repo test additions.

## Acceptance Criteria

- Identify which skill test surface is missing or under-calibrated using `my-ai-music`.
- Add a failing self-test in `AI-test-skill` before patching any skill behavior.
- Verify the patched skill locally.
- Keep target project changes scoped or avoid target project mutation if the gap is skill-side only.
- Record target-project evidence, verification, and final outcome.

## Verification Result

- Target stack detection: `/Users/chenyang/myfolder/cursor/6times/my-ai-music` is a `pnpm` Next.js + React app with Vitest and Playwright available.
- Target route inventory: 80 routes/API routes found, including Next.js app route groups and `POST /api/uploads/direct`.
- Target no-live readiness: `rtk pnpm readiness:diagnose -- --format=markdown` reported local readiness `Ready`, live evidence readiness `Not ready`, and 8/8 diagnostics local-ready.
- Target mapped regression: `rtk pnpm exec vitest run --exclude '.claude/**' tests/auth/session.test.ts tests/api/library-asset-download-route.test.ts tests/workspace/live-gate-page-env.test.tsx` passed 3 files / 14 tests.
- Skill gap found: readiness scoring had no self-test for real projects where product model, coverage matrix, generated cases, automated tests, and verification evidence live in `docs/tasks/*.md` task records instead of canonical PRD/schema/template files.
- RED: added `readiness scorer recognizes task-record based real-project QA packages`; before the scorer patch the fixture scored below the operational threshold.
- GREEN: `npm run test` passed 21 repository tests, including the new task-record QA package case.
- Target scorer after patch: `node website-test-automation/scripts/score-test-readiness.mjs /Users/chenyang/myfolder/cursor/6times/my-ai-music` returned `overallScore: 63`, `level: 50-69 planning coverage`. This is expected: the patched scorer now credits task-record evidence but still flags missing browser smoke adapter evidence, scoped-skip reason, CI/flaky taxonomy, and some detailed source-case fields.
- Target repo mutation: no target project files were intentionally edited; `my-ai-music` already had a broad dirty worktree before this forward test.
- Source skill validation: `npm run validate` passed 21 repository tests and workflow validation; source `quick_validate.py`, `validate-skill.mjs`, and readiness score passed with `overallScore: 100`.
- Installed skill validation: synced to `/Users/chenyang/.codex/skills/website-test-automation`; installed `quick_validate.py`, `validate-skill.mjs`, and readiness score passed with `overallScore: 100`; `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` reported no differences.

## Final Outcome

Done. The forward test on `my-ai-music` identified a real skill-side test gap and added deterministic self-test coverage for task-record-based QA packages. The patched scorer now recognizes that evidence shape while still preserving useful gaps for incomplete browser smoke, CI/flaky, live-governance, and detailed case-evidence coverage.

## Calibration

Assumption that could be wrong: `my-ai-music` task records are a representative real-project output shape for this skill, so the scorer should recognize task-record QA packages as valid evidence. Disproof evidence would be another mature real-project run where this relaxation over-credits shallow task records without source-backed cases, automation mapping, and verification results.
