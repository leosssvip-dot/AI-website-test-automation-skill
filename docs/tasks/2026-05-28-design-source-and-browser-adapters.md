# Design Source And Browser Adapter Hardening

## Status
Done

## Goal

Strengthen `$website-test-automation` so it explicitly supports more product/design input modes and more clearly distinguishes browser adapter families such as Chrome DevTools MCP, Codex Browser, and Claude Code browser workflows.

## Scope

- Add explicit design-source adapter guidance for Figma, Lanhu, MasterGo, MockingBot, Sketch, Zeplin, Storybook, screenshots, videos, design specs, and tokens.
- Connect design sources to product modeling, coverage matrices, test cases, visual checks, a11y checks, and mismatch handling.
- Strengthen validator and tests so these contracts stay present.
- Keep the skill concise and preserve progressive disclosure.
- Sync the installed skill copy after validation.

## Risk Tier

Tier 3: skill behavior, validation checks, and product requirements scope.

## Business Context

Website testing often starts from design artifacts rather than only PRDs or source code. The skill should help agents convert designs, design-system evidence, and browser-tool evidence into source-backed test cases without claiming more than the available runtime tools can execute.

## Roadmap Impact

Extends the 80-90 readiness target by adding explicit product/design-source compatibility and browser adapter contract checks.

## Acceptance Criteria

- `design-source-adapters.md` exists and is linked from `SKILL.md`.
- Product understanding ranks design-platform sources explicitly.
- Tests and validator require Figma, Lanhu, MasterGo, MockingBot, Sketch, Zeplin, Storybook, design tokens, screenshots, videos, and design mismatch handling.
- Browser adapter tests and validator require Chrome DevTools MCP, Codex Browser, and Claude Code browser workflow guidance.
- Repository validation, source validation, installed validation, readiness score, and source/install diff checks pass.

## Verification Result

- RED check: `npm run test` failed before implementation because `design-source-adapters.md` was missing and `product-understanding.md` did not mention Figma/Lanhu/MasterGo/Storybook design sources.
- Repository validation passed: `npm run validate` completed 15 repository tests and `scripts/validate-agent-workflow.mjs`.
- Source skill structure validation passed: `quick_validate.py website-test-automation` returned `Skill is valid!`.
- Source skill package validation passed: `node website-test-automation/scripts/validate-skill.mjs website-test-automation` returned `Skill validation passed.`
- Source readiness score returned `dimensionCount: 8`, `overallScore: 100`, and `level: 80-90 mature readiness candidate`.
- Installed skill structure validation passed: `quick_validate.py /Users/chenyang/.codex/skills/website-test-automation` returned `Skill is valid!`.
- Installed skill package validation passed: `node /Users/chenyang/.codex/skills/website-test-automation/scripts/validate-skill.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `Skill validation passed.`
- Installed readiness score returned `dimensionCount: 8`, `overallScore: 100`, and `level: 80-90 mature readiness candidate`.
- Source and installed skill directories match: `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` produced no differences.

## Final Outcome

Added explicit design-source adapter support for Figma, Lanhu/蓝湖, MasterGo, MockingBot/摹客, Sketch, Zeplin, Storybook, screenshots, videos, specs, prototypes, and design tokens. Browser adapter contracts now keep Chrome DevTools MCP, Codex Browser, and Claude Code browser workflow guidance under test and validator coverage. The installed skill copy is synced.
