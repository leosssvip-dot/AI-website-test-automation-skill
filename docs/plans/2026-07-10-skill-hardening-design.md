# Skill Hardening Design

## Goal

Turn the latest review findings into enforceable behavior so the skill cannot claim safety, valid test cases, completed examples, or proven readiness when the underlying evidence is missing.

## Chosen Approach

Use a bounded two-phase hardening pass. Phase 1 fixes P1 failure modes: candidate-code execution during validation, report truncation and secret leakage, schema/parser bypasses, unsafe or partial exports, fake automation templates, misleading worked-example claims, and path-only readiness evidence. Phase 2 fixes the P2 issues that directly affect real use: monorepo stack detection, Next.js route methods and segments, symlink boundaries, branch-specific workflow guidance, browser-smoke scope, and durable `surface`/`layer`/`disposition` fields.

Do not add runtime dependencies. Keep the documented YAML subset, but make it fail closed: reject malformed quoting, dangerous keys, wrong types, empty evidence entries, and unsupported shapes. Share schema validation between validation and export so the two commands cannot drift.

## Contract Changes

- `validate-skill.mjs` is static by default. Executing candidate helper scripts requires an explicit trusted flag and a timeout.
- Report summarization reports discovery/truncation and redacts common secret-bearing values by default.
- Test-case validation owns field shapes and enums; export validates first, refuses input/output collisions, and writes atomically.
- Starter tests must import a target-project symbol rather than constructing the implementation under test locally.
- Test cases persist `surface`, `layer`, and `disposition`; output and export use the same enums.
- A readiness score above 89 requires a structured evidence manifest with non-placeholder verification records.
- Scenario classification controls which workflow branch runs; browser smoke is required only when browser behavior is an acceptance signal or explicitly requested.

## Verification Design

For every script defect, add a minimal regression test and observe the expected failure before changing implementation. For skill prose and templates, preserve the prior no-skill baseline from the review, then forward-test the revised skill on a fresh fixture that is not described by `worked-example.md`. Completion requires targeted tests for each slice, full `npm run validate`, official `quick_validate.py`, clean diff review, and source/install parity.
