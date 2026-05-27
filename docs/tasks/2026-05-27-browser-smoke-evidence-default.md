# Browser Smoke Evidence Default

## Status

Done

## Goal

Harden `website-test-automation` so complete automation landing tasks require at least one browser-agent smoke evidence item unless the user explicitly limits scope to API, component, or unit tests.

## Scope

- Update product requirements and roadmap notes for browser-agent smoke evidence.
- Update automation implementation guidance and output templates.
- Update validator and repository tests so the contract cannot silently regress.
- Sync the installed skill copy.
- Validate, commit, and push the change.

## Risk Tier

Tier 3: skill behavior contract and validation logic.

## PRD Alignment

Relevant source: `docs/PRD.md` FR-6, FR-7, FR-8, FR-10, FR-11, NFR-2, NFR-6.

## Acceptance Criteria

- Complete automation landing guidance requires browser-agent smoke evidence by default.
- Output templates include a browser-agent smoke evidence field.
- Validator checks the browser-agent smoke default phrase.
- Repository tests check the guidance and template contract.
- Source and installed skill copies pass validation and match exactly.
- Change is committed and pushed to private GitHub repository.

## Verification Result

- Repository validation passed: `npm run validate` completed repository tests and `scripts/validate-agent-workflow.mjs`.
- Source skill structure validation passed: `quick_validate.py website-test-automation` returned `Skill is valid!`.
- Installed skill structure validation passed: `quick_validate.py /Users/chenyang/.codex/skills/website-test-automation` returned `Skill is valid!`.
- Installed skill package validation passed: `node /Users/chenyang/.codex/skills/website-test-automation/scripts/validate-skill.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `Skill validation passed.`
- Source and installed skill directories match: `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` produced no differences.

## Final Outcome

Added the default browser-agent smoke evidence requirement for complete automation landing tasks, with an explicit scoped-skip reason when the user limits the task to API, component, or unit tests.
