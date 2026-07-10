# AI Website Test Automation Skill Development Plan

## Roadmap Status

- Overall status: 80-90 mature readiness candidate
- Current roadmap phase: Real-project validation
- Current milestone: 80-90 testing workflow coverage hardening complete
- Next milestone: Re-test the hardened skill on a second real project
- Blockers: None
- Last roadmap review: 2026-05-27

## Product Requirements Source

- PRD: [docs/PRD.md](PRD.md)
- Relevant requirements: `FR-1` through `FR-12`, including `FR-3.2`, `NFR-1` through `NFR-6`
- PRD alignment status: Aligned as of 2026-05-27
- Known product gaps: None recorded
- Roadmap impact: Development must keep test case authoring as the core workflow and keep browser automation behind a tool-adapter model.

## Implementation Plan Source

- Plan: [docs/plans/2026-05-27-website-test-automation-skill-implementation.md](plans/2026-05-27-website-test-automation-skill-implementation.md)
- Plan alignment status: Aligned as of 2026-05-27

## Goal

Build the `website-test-automation` skill described in the PRD: a product-grounded website QA automation skill that generates high-quality test cases from docs and code, then maps suitable cases onto the best available browser automation or regression-test tool.

## Strategic Scope

- Create a valid Codex skill bundle with `SKILL.md`, `agents/openai.yaml`, references, scripts, and assets.
- Implement the PRD workflow: understand product context, generate test cases, build coverage matrices, select automation targets, execute with compatible browser tools, and record evidence.
- Support optional knowledge-graph-assisted understanding through Graphify and CodeGraph.
- Keep Playwright as one supported runner/adapter, not the center of the product.
- Validate the skill through metadata checks, resource-link checks, and representative forward tests.

## Non-Goals

- Do not create a Playwright-only guide.
- Do not build a standalone SaaS product.
- Do not automate unauthorized third-party sites.
- Do not make LLM judgement the sole oracle for critical pass/fail checks.

## Roadmap

### M0: PRD And Roadmap Split

- Status: Done
- Output: `docs/PRD.md`, this roadmap, and current progress dashboard.

### M1: Skill Scaffold

- Create `website-test-automation/SKILL.md`.
- Create `website-test-automation/agents/openai.yaml`.
- Add initial `references/`, `scripts/`, and `assets/` folders.
- Validate required skill metadata.
- Follow implementation plan Task 1.

### M2: Test Case Authoring Core

- Add `references/product-understanding.md`.
- Add `references/test-case-authoring.md`.
- Add `references/testcase-schema.md`.
- Add `references/coverage-matrix.md`.
- Include examples for PRD-driven, source-driven, and plan-driven test generation.
- Follow implementation plan Tasks 2-4.

### M3: Knowledge Graph Integration

- Add `references/knowledge-graph-context.md`.
- Define when to use Graphify, CodeGraph, plain search, or repo-native tooling.
- Add graph-to-test-case workflows for feature maps, route maps, impact analysis, and coverage gaps.
- Follow implementation plan Task 5.

### M4: Browser Adapter Compatibility

- Add `references/browser-tool-adapters.md`.
- Cover Codex browser capabilities, Chrome/profile workflows, Chrome DevTools MCP, Playwright MCP/CLI/runner, Claude Code browser workflows, Cypress, Selenium, and WebdriverIO.
- Add decision rules for exploratory checks, evidence collection, and durable CI tests.
- Follow implementation plan Task 6.

### M5: Scripts And Templates

- Add `scripts/detect-web-test-stack.mjs`.
- Add `scripts/route-inventory.mjs`.
- Add `scripts/summarize-test-report.mjs`.
- Add `scripts/validate-skill.mjs`.
- Add testcase and coverage matrix templates under `assets/`.
- Follow implementation plan Tasks 7-9.

### M6: Forward Testing

- Test the skill on at least three representative projects:
  - Static or simple website.
  - Authenticated CRUD app.
  - Existing browser test suite with a failing or flaky test.
- Verify outputs include test cases, coverage matrix, automation selection, and evidence summary.
- Follow implementation plan Task 10.

### M7: Automation Completeness And CI

- Status: Done
- Add guidance for converting cases into automated test files.
- Add reusable templates for Playwright, Cypress, Vitest route/API tests, React Testing Library, and Selenium/WebDriver.
- Add repository-level automated tests for scripts, references, templates, and contract phrases.
- Add GitHub Actions validation.
- Sync and validate the installed skill copy.

### M8: 80-90 Readiness Hardening

- Status: Done
- Add measurable readiness scoring across the main website testing workstreams.
- Strengthen weak workstreams: flaky/CI, provider/live, visual/accessibility/performance/security, browser-smoke evidence, and automation handoff.
- Add templates and validation checks so output quality does not depend only on prose guidance.
- Sync and validate the installed skill copy.

### M9: Design Source And Browser Adapter Hardening

- Status: Done
- Add design-source adapters for Figma, Lanhu, MasterGo, MockingBot, Sketch, Zeplin, Storybook, screenshots, videos, specs, prototypes, and design tokens.
- Strengthen product understanding and readiness scoring so design sources contribute to testability.
- Keep browser adapter guidance explicit for Chrome DevTools MCP, Codex Browser, and Claude Code browser workflows.

## Project-Level Acceptance Criteria

- The skill package validates structurally with `quick_validate.py`.
- The local validator checks required references, metadata drift, and core workflow contract.
- Forward tests demonstrate PRD/source/plan-driven test case generation.
- Forward tests demonstrate at least two browser adapter families, one exploratory/browser-agent path and one durable test-runner path.
- Automation guidance can produce concrete test file skeletons, commands, fixtures, and evidence expectations for common website stacks.
- Browser evidence is required only when the user explicitly requests browser evidence, a selected case has `disposition: browser-smoke`, or browser behavior such as interaction, visual layout, responsive behavior, or a cross-page workflow is itself an acceptance signal. Pure API, component, unit, job, CLI, or library work does not start a browser and needs no scoped-skip reason.
- Mature handoffs include a readiness score or explicit gap list across product understanding, test design, coverage, automation, evidence, CI/flaky, provider/live, and specialized quality checks.
- Repository validation runs in CI without private credentials or paid services.
- Documentation clearly separates PRD requirements from roadmap and task records.

## Verification Gates

- Documentation changes: local review and `rg` checks for required PRD/roadmap/progress split.
- Skill scaffold: `quick_validate.py <skill-path>`.
- Scripts: targeted script smoke tests.
- Full skill handoff: local validator plus representative forward tests.
- Maturity hardening: readiness scorer smoke test plus validator contract checks.

## Documentation Rules

- `docs/PRD.md` owns product requirements.
- `docs/DEVELOPMENT_PLAN.md` owns roadmap status and implementation milestones.
- `docs/PROGRESS.md` owns only current execution status.
- `docs/tasks/*.md` owns per-session evidence and final outcomes.
