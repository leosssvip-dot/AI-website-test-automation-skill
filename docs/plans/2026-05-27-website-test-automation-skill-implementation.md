# Website Test Automation Skill Implementation Plan

## Purpose

This plan turns `docs/PRD.md` and `docs/DEVELOPMENT_PLAN.md` into implementation-ready work. It is intentionally more detailed than the roadmap and should be used when building the `website-test-automation` skill bundle.

## Product Requirements

- Source: `docs/PRD.md`
- Requirements: `FR-1` through `FR-9`, `NFR-1` through `NFR-6`
- Roadmap: `docs/DEVELOPMENT_PLAN.md`

## Skill Package Target

```text
website-test-automation/
├── SKILL.md
├── agents/openai.yaml
├── references/
│   ├── workflow.md
│   ├── product-understanding.md
│   ├── test-case-authoring.md
│   ├── testcase-schema.md
│   ├── coverage-matrix.md
│   ├── knowledge-graph-context.md
│   ├── browser-tool-adapters.md
│   ├── automation-selection.md
│   ├── visual-a11y-performance-security.md
│   ├── flake-triage.md
│   ├── ci-reporting.md
│   └── output-templates.md
├── scripts/
│   ├── detect-web-test-stack.mjs
│   ├── route-inventory.mjs
│   ├── summarize-test-report.mjs
│   └── validate-skill.mjs
└── assets/
    ├── testcase-template.yaml
    ├── coverage-matrix-template.md
    └── ci-snippets/
```

## Implementation Tasks

### Task 1: Scaffold The Skill Bundle

Files:

- Create `website-test-automation/SKILL.md`
- Create `website-test-automation/agents/openai.yaml`
- Create `website-test-automation/references/`
- Create `website-test-automation/scripts/`
- Create `website-test-automation/assets/`

Requirements:

- `SKILL.md` frontmatter must include only `name` and `description`.
- `name` must be `website-test-automation`.
- `description` must trigger on website test case generation, browser automation planning, existing test diagnosis, coverage matrices, knowledge graph context, and multi-tool browser execution.
- `SKILL.md` body must stay concise and route detailed guidance to one-level reference files.
- `agents/openai.yaml` must match the skill purpose and include a default prompt mentioning `$website-test-automation`.

Verification:

- Run `quick_validate.py <skill-path>`.
- Run `node website-test-automation/scripts/validate-skill.mjs` after the validator exists.

### Task 2: Write The Core Workflow Reference

File:

- Create `website-test-automation/references/workflow.md`

Required content:

- Step 1: Discover repo and product context.
- Step 2: Build product model.
- Step 3: Decide whether graph analysis is needed.
- Step 4: Generate coverage matrix.
- Step 5: Generate test cases.
- Step 6: Choose automation targets.
- Step 7: Execute via adapter or runner.
- Step 8: Report evidence, gaps, and next cases.

Definition of done:

- The workflow explicitly says not to write browser automation before test cases exist unless the user asks only for a smoke/exploratory run.
- The workflow references `product-understanding.md`, `test-case-authoring.md`, `coverage-matrix.md`, `knowledge-graph-context.md`, and `browser-tool-adapters.md`.

### Task 3: Write Product Understanding And Test Case Authoring References

Files:

- Create `website-test-automation/references/product-understanding.md`
- Create `website-test-automation/references/test-case-authoring.md`
- Create `website-test-automation/references/testcase-schema.md`

Required content:

- Product model fields: personas, workflows, business entities, states, permissions, integrations, data lifecycle, non-goals, acceptance criteria, risk areas.
- Source inspection order: PRD, roadmap, task records, README, routes, UI components, API handlers, schemas, existing tests, reports.
- Test case types: happy path, negative path, boundary, permission, state transition, data lifecycle, i18n, responsive, accessibility, performance, security smoke, visual regression, API contract.
- Test case quality rubric:
  - Traceable to source evidence.
  - Has a clear risk and priority.
  - Has executable steps.
  - Has deterministic expected results where possible.
  - Names required data and preconditions.
  - Separates manual/exploratory checks from durable automation.
  - Records assumptions and unknowns.
- Test case schema must include required and optional fields, valid priority values, valid automation target values, and examples.

Definition of done:

- Includes at least one PRD-driven example, one source-code-driven example, and one bug/regression-driven example.
- Includes an anti-example showing a generic test case that should be rejected.

### Task 4: Write Coverage Matrix And Automation Selection References

Files:

- Create `website-test-automation/references/coverage-matrix.md`
- Create `website-test-automation/references/automation-selection.md`
- Create `website-test-automation/assets/coverage-matrix-template.md`
- Create `website-test-automation/assets/testcase-template.yaml`

Required content:

- Coverage dimensions: product area, workflow, persona, risk, source evidence, test layer, priority, data need, automation feasibility, current coverage, gaps.
- Automation targets:
  - `durable-regression`
  - `browser-agent-smoke`
  - `exploratory`
  - `manual`
  - `api-or-component`
  - `not-automated-risk-note`
- Selection rules:
  - Prefer existing project test framework.
  - Use browser-agent tools for exploration and evidence collection.
  - Use durable runners for repeatable CI regression.
  - Avoid automating unstable flows until data, auth, and environment can be controlled.

Definition of done:

- Matrix template can be filled from a real repo inspection.
- Automation selection rules explain when not to automate.

### Task 5: Write Knowledge Graph Context Reference

File:

- Create `website-test-automation/references/knowledge-graph-context.md`

Required content:

- Use Graphify for mixed product docs, architecture docs, code, SQL, images, diagrams, screenshots, or video/audio transcripts.
- Use CodeGraph for code semantics, symbol lookup, route maps, call graphs, dependency edges, and impact analysis.
- Use `rg` and repo-native commands for small repos.
- Required graph-to-test workflows:
  - Feature map to coverage matrix.
  - Route/API map to test cases.
  - Business entity map to data lifecycle cases.
  - Impact analysis to regression selection.
  - Cross-document mismatch to risk notes.
- State that graph output is orientation evidence and important claims must be verified against source files.

Definition of done:

- Includes a decision table for Graphify vs CodeGraph vs plain inspection.
- Includes the exact evidence that should be recorded from graph output without leaking sensitive content.

### Task 6: Write Browser Adapter Reference

File:

- Create `website-test-automation/references/browser-tool-adapters.md`

Required content:

- Common capability model:
  - navigate
  - accessibility snapshot
  - role/label locator support
  - click/fill/select
  - screenshot
  - console logs
  - network logs
  - trace
  - video
  - auth state
  - device emulation
  - test code generation
  - CI runner
- Adapter profiles:
  - Codex browser capabilities.
  - Chrome/profile-based tools.
  - Chrome DevTools MCP.
  - Playwright MCP/CLI.
  - Playwright runner.
  - Claude Code browser workflows.
  - Cypress.
  - Selenium/WebDriver.
  - WebdriverIO.
- Selection algorithm:
  - Start with user request and available tools.
  - Prefer logged-in/profile tools for profile-dependent flows.
  - Prefer CDP/DevTools tools for console, network, performance, and CDP debugging.
  - Prefer project runner for durable CI tests.
  - Prefer browser-agent tools for exploration, smoke checks, and screenshots.

Definition of done:

- Playwright appears as one adapter family, not as the skill's center.
- The reference can guide an agent that has only Codex browser tools and an agent that has only Playwright runner.

### Task 7: Write Specialized Testing References

Files:

- Create `website-test-automation/references/visual-a11y-performance-security.md`
- Create `website-test-automation/references/flake-triage.md`
- Create `website-test-automation/references/ci-reporting.md`
- Create `website-test-automation/references/output-templates.md`

Required content:

- Visual checks: screenshot evidence, dynamic-content masking, viewport selection, visual-diff caveats.
- Accessibility checks: roles, labels, keyboard path, axe-style automated scans, manual limits.
- Performance checks: Core Web Vitals, navigation timing, Lighthouse-like reports, network bottlenecks.
- Security smoke checks: auth redirects, headers, basic XSS form handling, CSRF-sensitive flows where applicable.
- Flake taxonomy: timing/async, isolation, environment, infrastructure, data dependency, selector fragility, product regression.
- CI reporting: command summaries, report paths, artifact paths, traces, screenshots, videos, redaction.
- Output templates: review findings, coverage matrix summary, test case set, automation handoff, failure triage.

Definition of done:

- Each specialized area states what can be automated and what should remain manual or exploratory.
- Failure triage requires evidence before fixes.

### Task 8: Implement Detection And Inventory Scripts

Files:

- Create `website-test-automation/scripts/detect-web-test-stack.mjs`
- Create `website-test-automation/scripts/route-inventory.mjs`

`detect-web-test-stack.mjs` contract:

- Input: repo path, default `.`.
- Output: JSON with package manager, framework hints, test frameworks, scripts, CI files, browser tools, existing report paths, and confidence notes.
- Must not require network access.
- Must tolerate missing `package.json`.

`route-inventory.mjs` contract:

- Input: repo path, default `.`.
- Output: JSON route inventory for common website structures where feasible, including Next.js app/pages routes, React Router hints, Vue/Nuxt hints, Angular route files, Express/Fastify handlers, and unknown route notes.
- Must report unsupported frameworks as `unknown` rather than failing.

Definition of done:

- Each script has `--help`.
- Each script exits non-zero only for invalid arguments or unreadable paths.
- Smoke tests run on an empty temp repo and on a small fixture repo.

### Task 9: Implement Report Summarizer And Validator

Files:

- Create `website-test-automation/scripts/summarize-test-report.mjs`
- Create `website-test-automation/scripts/validate-skill.mjs`

`summarize-test-report.mjs` contract:

- Input: report file or directory.
- Output: JSON or markdown summary of passed, failed, skipped, flaky/retried tests, likely evidence files, and next debugging action.
- Support Playwright JSON/blob/html report metadata where feasible.
- Support Cypress JSON/JUnit-style output where feasible.
- Report unsupported formats clearly.

`validate-skill.mjs` contract:

- Check required files exist.
- Check `SKILL.md` frontmatter has `name` and `description`.
- Check `SKILL.md` links only to existing one-level reference files.
- Check key PRD contracts are present: test cases first, tool agnostic, existing stack first, knowledge graph optional, evidence/redaction, forward testing.
- Check `agents/openai.yaml` exists and matches the skill name.
- Check scripts have `--help`.

Definition of done:

- Validator fails on missing references.
- Validator fails if Playwright is described as the only supported path.
- Validator fails if `test-case-authoring.md` or `browser-tool-adapters.md` is missing.

### Task 10: Forward-Test The Skill

Fixtures:

- Simple website fixture.
- Authenticated CRUD fixture.
- Existing browser-test fixture with one deterministic failure and one flaky-pattern example.

Scenarios:

- Generate test cases from PRD and source code.
- Build coverage matrix and identify gaps.
- Select automation targets.
- Run one browser-agent smoke path.
- Generate one durable runner test plan or test file.
- Triage one failing/flaky test.

Definition of done:

- Outputs include source-backed test cases.
- Outputs include a coverage matrix.
- Outputs include browser adapter choice rationale.
- Outputs include evidence summary and known gaps.
- At least one forward test uses non-Playwright browser capability wording.

## Review Gate Before Build

Before scaffolding the skill, confirm:

- PRD requirements still match the intended product.
- This implementation plan has no unresolved product decisions.
- The target skill install location is known.
- The first build slice is M1 plus the minimum references needed for M2.

