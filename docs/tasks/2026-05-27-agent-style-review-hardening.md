# Agent-Style Review Hardening

## Status

Done

## Goal

Use the real `$website-test-automation` output review from `/Users/chenyang/myfolder/cursor/6times/my-ai-music` to harden the skill package and installed copy.

## Scope

- Add explicit requirements source ranking and `source_status` labels.
- Add mismatch reporting to test cases, coverage, and response-only QA outputs.
- Strengthen browser adapter guidance for Codex Browser, Chrome, Computer Use, Chrome DevTools MCP, and Playwright runner.
- Add provider/live-testing guidance for paid AI/provider flows.
- Update validation so these capabilities cannot silently regress.
- Sync the improved source skill to `/Users/chenyang/.codex/skills/website-test-automation`.

## Risk Tier

Tier 1: skill documentation, templates, and local validation script.

## PRD Alignment

Relevant source: `docs/PRD.md` FR-2, FR-3, FR-6, FR-7, FR-8, NFR-1, NFR-2, NFR-6.

## Acceptance Criteria

- Test case schema and template include `source_status`.
- Coverage matrix includes source status and mismatch handling.
- Output templates include a response-only QA package with mismatch section.
- Browser adapter guidance directly covers Codex Browser, Chrome, Computer Use, Chrome DevTools MCP, and Playwright runner.
- Provider/live-testing guidance covers cost caps, representative completion, callbacks, redaction, disabled-path checks, and manual/live boundaries.
- Source and installed skill copies pass `quick_validate.py` and `validate-skill.mjs`.

## Verification Result

- Source skill structure validation passed: `quick_validate.py website-test-automation` returned `Skill is valid!`.
- Source skill package validation passed: `node website-test-automation/scripts/validate-skill.mjs website-test-automation` returned `Skill validation passed.`
- Installed copy structure validation passed: `quick_validate.py /Users/chenyang/.codex/skills/website-test-automation` returned `Skill is valid!`.
- Installed copy package validation passed: `node /Users/chenyang/.codex/skills/website-test-automation/scripts/validate-skill.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `Skill validation passed.`
- Installed feature grep confirmed `source_status`, response-only QA package, provider/live testing, and Playwright anti-pattern guardrail under `/Users/chenyang/.codex/skills/website-test-automation`.
- Source and installed skill directories match: `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` produced no differences.
- Repo workflow validator is absent: `workflow-validator-absent`.

## Final Outcome

Hardened and reinstalled `$website-test-automation` with explicit requirements source ranking, mismatch handling, response-only QA output template, direct browser adapter guidance, provider/live testing guidance, and validator checks for these contracts.
