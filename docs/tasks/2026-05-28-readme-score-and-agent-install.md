# README Score Calibration And Agent Install Prompt

## Status

Done

## Goal

Make the public README score presentation more realistic and add a direct AI-agent installation prompt to both English and Chinese README files.

## Scope

- Update `README.md` and `README.zh-CN.md`.
- Replace all-100 public scores with calibrated public-readiness scores.
- Keep the internal validation score separate from public maturity messaging.
- Add concise direct AI-agent install prompts under quick install.
- Clarify that broad file-capable agent installation is different from native skill discovery.

## Risk Tier

Tier 1: documentation-only public positioning.

## Acceptance Criteria

- README score table no longer presents every dimension as 100.
- English and Chinese README files both include a concise AI-agent install prompt.
- README compatibility notes do not overclaim native support across every market agent.
- Existing validation still passes.
- Workflow progress is updated.

## Verification Result

- `README.md` and `README.zh-CN.md` now show calibrated public readiness score `83/100` instead of all-100 dimension scores.
- English and Chinese README files both include concise direct AI-agent install prompts under quick install.
- README compatibility notes state that any file-capable coding agent can install by copying files, while native discovery depends on Codex-style local skill support.
- `npm run validate` passed 21 repository tests and workflow validation.
- `git diff --check` passed.
- `node website-test-automation/scripts/score-test-readiness.mjs website-test-automation` still returns internal package completeness `overallScore: 100`, `level: 80-90 mature readiness candidate`.

## Final Outcome

Done. Public README scoring is now more realistic while preserving the internal helper score as package completeness evidence, both README files include copy-ready concise AI-agent installation prompts, and compatibility wording avoids claiming native support across every agent.
