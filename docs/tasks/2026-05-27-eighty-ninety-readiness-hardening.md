# 80-90 Readiness Hardening

## Status
Done

## Goal

Raise `$website-test-automation` from operational v2 candidate toward an 80-90% website testing workflow coverage target across planning, case design, automation landing, flaky/CI, provider/live, and specialized quality checks.

## Scope

- Add measurable readiness scoring and validation coverage for the main testing workstreams.
- Strengthen references and templates for weak areas without turning the skill into a standalone test framework.
- Keep `SKILL.md` concise and route detailed guidance through references/assets.
- Sync the installed skill copy after validation.

## Risk Tier

Tier 3: skill behavior, helper scripts, validation checks, and roadmap scope.

## Business Context

The skill should act as a website testing automation lead skill: it should guide agents through high-quality test planning, prioritization, automation choices, evidence collection, and handoff across common website testing workflows.

## Roadmap Impact

Adds a new maturity-hardening milestone after automation completeness. The roadmap target changes from "second real-project retest" to "80-90 readiness hardening plus real-project validation."

## Acceptance Criteria

- A readiness helper scores the skill or target repo across at least eight testing workstreams.
- The skill package contains actionable guidance or templates for all major workstreams: product understanding, test cases, coverage matrix, automation implementation, browser smoke evidence, CI/flaky triage, provider/live testing, and visual/accessibility/performance/security checks.
- Repository tests cover the new readiness helper and contract phrases.
- The validator checks the new helper and maturity contract.
- Source and installed skill copies validate and match.

## Verification Result

- RED check: `npm run test` failed before implementation because `readiness-model.md`, readiness assets, WebdriverIO template, and `score-test-readiness.mjs` were missing.
- Repository validation passed: `npm run validate` completed 12 repository tests and `scripts/validate-agent-workflow.mjs`.
- Source skill structure validation passed: `quick_validate.py website-test-automation` returned `Skill is valid!`.
- Installed skill structure validation passed: `quick_validate.py /Users/chenyang/.codex/skills/website-test-automation` returned `Skill is valid!`.
- Installed skill package validation passed: `node /Users/chenyang/.codex/skills/website-test-automation/scripts/validate-skill.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `Skill validation passed.`
- Source and installed skill directories match: `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` produced no differences.
- Installed readiness score: `score-test-readiness.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `dimensionCount: 8`, `overallScore: 100`, and `level: 80-90 mature readiness candidate`.

## Final Outcome

Added measurable 80-90 readiness scoring and strengthened all major website testing workstreams with references, templates, checklists, a WebdriverIO template, validator checks, and installed-skill sync. The skill is now an 80-90 mature readiness candidate by its deterministic package-level scorer, with real-project validation still required before calling it 90+ proven maturity.
