# Scenario Workflow Constraints

## Status

Done

## Goal

Constrain `website-test-automation` with explicit post-test-case gates and scenario-specific testing workflows.

## Scope

- Add validator/test coverage for standardized scenario workflows.
- Add skill guidance for what happens after source-backed test cases are written.
- Define workflow paths for response-only review, automation landing, browser smoke, flaky triage, provider/live testing, specialized quality checks, and readiness audits.
- Sync and validate the installed local skill copy.

## Risk Tier

Tier 2: skill behavior and validation contract.

## Acceptance Criteria

- The skill explicitly requires a post-test-case disposition gate before automation work.
- Scenario-specific workflows map common user requests to required outputs and next actions.
- Validator and repository tests fail if scenario workflow guidance is removed.
- Source and installed skill copies match after the update.
- Validation passes.

## Verification Result

- Added failing repository/validator checks first. Before implementation, `node tests/run-skill-tests.mjs` failed because `references/scenario-workflows.md`, `Scenario Workflow`, `Post-Test-Case Disposition Gate`, `case disposition`, `Response-only review`, `Browser smoke`, and `Failure/flaky triage` were missing.
- Added `website-test-automation/references/scenario-workflows.md` with the Post-Test-Case Disposition Gate, scenario workflow matrix, and stop conditions.
- Updated `website-test-automation/SKILL.md` so the core workflow explicitly classifies the scenario and requires the post-test-case disposition gate after source-backed cases are written.
- Updated `website-test-automation/references/workflow.md` and `output-templates.md` so reports include case disposition and next actions rather than stopping at test cases.
- Added repository tests and validator contract checks for the new scenario workflow requirements.
- Synced the installed local skill copy to `/Users/chenyang/.codex/skills/website-test-automation`.
- Updated README test badges from 21 to 22 passing.
- `npm run validate` passed 22 repository tests and workflow validation.
- `quick_validate.py website-test-automation` returned `Skill is valid!`.
- Installed skill validation passed: `node /Users/chenyang/.codex/skills/website-test-automation/scripts/validate-skill.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `Skill validation passed.`
- Source and installed skill directories match: `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` produced no differences.
- `git diff --check` passed.

## Final Outcome

Done. The skill now constrains test-case authoring with a mandatory post-case disposition gate and maps common testing requests to standardized scenario workflows, with repository tests and validator coverage preventing drift.
