# README Capabilities And Usage

## Status

Done

## Goal

Make the public README clearer about what the skill can do and provide broader copy-ready usage prompts.

## Scope

- Update English and Chinese README capability descriptions.
- Expand quick usage prompts by common testing scenarios.
- Keep the public wording agent-neutral and concise.

## Risk Tier

Tier 1: documentation-only public positioning.

## Acceptance Criteria

- Both README files list the skill's main capabilities in a more complete, scan-friendly way.
- Both README files include broader quick usage prompts for review, case generation, implementation, browser smoke, flaky triage, live/provider planning, and specialized checks.
- Validation passes.

## Verification Result

- `README.md` now lists 10 capability rows covering product/repo understanding, source-backed cases, coverage, automation strategy, implementation, browser evidence, CI/flaky triage, provider/live governance, specialized quality, and readiness scoring.
- `README.zh-CN.md` mirrors the expanded capability table in Chinese.
- Both README files now include broader copy-ready prompts for coverage review, test case generation, implementation, browser smoke, flaky triage, provider/live planning, and specialized checks.
- `npm run validate` passed 21 repository tests and workflow validation.
- `git diff --check` passed.

## Final Outcome

Done. The public README now explains what the skill can do in more complete, scan-friendly terms and provides broader quick usage prompts in both English and Chinese.
