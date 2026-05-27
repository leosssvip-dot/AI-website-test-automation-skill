# Automation Completeness Hardening

## Status

Done

## Goal

Upgrade `website-test-automation` from a strong planning/review skill into a more complete automation skill that can guide agents through implementing, organizing, validating, and reporting automated website tests.

## Scope

- Add product requirements for automation implementation guidance, reusable code templates, and repository self-tests.
- Add skill guidance for converting source-backed cases into durable automated tests.
- Add framework templates for common website test layers.
- Add repository-level automated tests for skill structure, helper scripts, templates, and output contracts.
- Add CI workflow to run repository validation.
- Sync the improved skill into `/Users/chenyang/.codex/skills/website-test-automation`.

## Risk Tier

Tier 3: test automation logic, validation scripts, and CI checks.

## PRD Alignment

Relevant source: `docs/PRD.md` FR-2, FR-6, FR-7, FR-8, NFR-2, NFR-6. This task adds new product requirements for automation implementation and self-testing.

## Acceptance Criteria

- Skill references explain how to turn cases into test files across existing runners and browser adapters.
- Skill assets include starter templates for Playwright, Cypress, Vitest route/API tests, React Testing Library, and Selenium/WebDriver.
- Validator enforces the automation implementation reference and template presence.
- Repository has a dependency-free automated test runner that checks the skill package, helper scripts, fixtures, and automation templates.
- GitHub Actions workflow runs the repository validation on push and pull request.
- Source and installed skill copies pass validation and match exactly after sync.
- Current branch is committed and pushed to the private GitHub repository.

## Calibration

Assumption: A complete website test automation skill should prefer existing project test stacks and layered automation over generating only browser E2E tests. Falsifying evidence would be a real target project where the skill cannot produce concrete test files, commands, and evidence expectations for the existing runner.

Evidence plan: add executable template and fixture checks now; validate on the local fixtures in under 10 minutes. A second clean-room real-project run remains the next external confidence check.

## Verification Result

- Repository validation passed: `npm run validate` completed `tests/run-skill-tests.mjs` and `scripts/validate-agent-workflow.mjs`.
- Skill package validator passed for source: `node website-test-automation/scripts/validate-skill.mjs website-test-automation` returned `Skill validation passed.`
- Source skill structure validation passed: `quick_validate.py website-test-automation` returned `Skill is valid!`.
- Installed skill structure validation passed: `quick_validate.py /Users/chenyang/.codex/skills/website-test-automation` returned `Skill is valid!`.
- Installed skill package validation passed: `node /Users/chenyang/.codex/skills/website-test-automation/scripts/validate-skill.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `Skill validation passed.`
- Source and installed skill directories match: `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` produced no differences.

## Final Outcome

Added automation implementation guidance, reusable runner templates, repository self-tests, workflow validation, and GitHub Actions CI. Synced the improved skill into `/Users/chenyang/.codex/skills/website-test-automation`.
