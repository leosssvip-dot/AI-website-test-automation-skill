# Human Reasonableness Gate

## Status

Done

## Goal

Upgrade `website-test-automation` so agents test like humans: they must question product logic, user flow reasonableness, recovery paths, and mismatches between documented behavior, observed behavior, and human expectations before treating requirements as correct.

## Scope

- Add a human reasonableness review gate to the skill workflow.
- Add schema/template fields for human expectations and logic risks.
- Add validator and repository tests that prevent the gate from drifting out of the skill.
- Sync the installed skill after validation.

## Risk Tier

Tier 2: skill documentation, templates, repository tests, and validation rules only.

## Acceptance Criteria

- `SKILL.md` routes product modeling through a human reasonableness gate before source-backed test case authoring.
- A new reference defines personas, review questions, mismatch handling, and a logic findings ledger.
- Test case schema and output templates expose human expectation and logic-risk fields.
- Case disposition supports `human-logic-risk`.
- Repository tests and skill validator enforce the new contract.
- Relevant validation passes and changes are committed.

## Verification Result

- Red test: `npm test` failed before implementation because the main workflow lacked the Human Reasonableness Review Gate and `references/human-reasonableness.md` did not exist.
- Green test: `npm test` passed 27 repository tests after implementation.
- `node website-test-automation/scripts/validate-skill.mjs website-test-automation` passed.
- Installed skill synced to `/Users/chenyang/.codex/skills/website-test-automation`; installed skill validation passed and `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` reported no differences.
- `python3 /Users/chenyang/.codex/skills/.system/skill-creator/scripts/quick_validate.py website-test-automation` returned `Skill is valid!`.
- `git diff --check` passed.
- `npm run validate` passed 27 repository tests and `scripts/validate-agent-workflow.mjs`.

## Final Outcome

Done: the skill now requires a Human Reasonableness Review Gate before source-backed case authoring, exposes human-logic fields in schemas/templates, classifies unreasonable product logic as `human-logic-risk`, and validates the contract through repository tests plus the skill validator.
