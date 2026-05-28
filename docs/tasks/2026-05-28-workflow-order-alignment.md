# Workflow Order Alignment

## Status

Done

## Goal

Align the `SKILL.md` main workflow order with the detailed workflow so case disposition happens after coverage analysis.

## Scope

- Update `website-test-automation/SKILL.md` workflow ordering.
- Add a regression test for workflow order.
- Sync and validate the installed local skill copy.

## Risk Tier

Tier 2: skill behavior and validation contract.

## Acceptance Criteria

- Main workflow orders source-backed cases before coverage, coverage before disposition, and disposition before automation selection.
- Repository tests fail if the ordering regresses.
- Source and installed skill copies match after the update.
- Validation passes.

## Verification Result

- Updated `website-test-automation/SKILL.md` so the main workflow now orders source-backed test cases before coverage, coverage before the Post-Test-Case Disposition Gate, and disposition before automation selection.
- Added repository regression coverage for main workflow ordering.
- Added standalone `validate-skill.mjs` ordering enforcement so the package validator also rejects this drift.
- Updated README test badges to `24 passing`.
- Synced the installed local skill copy to `/Users/chenyang/.codex/skills/website-test-automation`.
- `npm run validate` passed 24 repository tests and workflow validation.
- `git diff --check` passed.
- `quick_validate.py website-test-automation` returned `Skill is valid!`.
- Installed skill validation passed: `node /Users/chenyang/.codex/skills/website-test-automation/scripts/validate-skill.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `Skill validation passed.`
- Source and installed skill directories match: `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` produced no differences.

## Final Outcome

Done. The review finding is fixed and guarded by both repository tests and the standalone skill validator.
