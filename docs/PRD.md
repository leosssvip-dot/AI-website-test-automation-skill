# AI Website Test Automation Skill PRD

## Product Summary

`website-test-automation` is a Codex skill for website QA automation work. It helps an AI agent understand product requirements, source code, planning docs, architecture notes, existing tests, and knowledge-graph context before writing test cases. It then recommends which cases should become durable automated tests, which should be explored through browser tools, and which should remain manual or risk notes.

## Target Users

- QA engineers who need product-grounded test cases and automation candidates.
- Frontend engineers who need regression coverage for website features.
- Full-stack engineers who need route/API/UI coverage across code boundaries.
- AI coding agents that need a repeatable workflow for website test planning, execution, and evidence reporting.

## User Workflows

### WF-1: Generate Test Cases From Product And Code

The user asks the agent to inspect PRD, planning docs, source code, routes, APIs, UI components, and existing tests. The skill produces a coverage matrix and test cases with source evidence, priorities, risks, steps, expected results, and automation recommendations.

### WF-2: Turn Test Cases Into Automation

The user asks the agent to automate selected cases. The skill chooses the existing project test framework when possible, otherwise recommends the smallest sufficient browser adapter or runner.

### WF-3: Explore A Website With Browser Tools

The user asks for smoke testing, interaction exploration, visual inspection, console/network diagnosis, or screenshot evidence. The skill chooses Codex browser tools, Chrome/profile tools, Chrome DevTools MCP, Playwright MCP, Claude Code browser workflows, or similar browser-control tools by capability.

### WF-4: Diagnose And Improve Existing Browser Tests

The user provides or points to failing/flaky website tests. The skill classifies failure causes, reviews reports/traces/screenshots/logs, proposes fixes, and records evidence.

## Functional Requirements

### FR-1: Product Understanding First

The skill must inspect product intent, target users, workflows, business entities, states, permissions, non-goals, and acceptance criteria before generating test cases when those sources exist.

### FR-2: Test Case Authoring Core

The skill must treat test case writing as the primary workflow. Generated cases must include ID, title, source evidence, type, priority, risk, persona, preconditions, steps, expected results, negative cases, data needs, automation recommendation, and evidence expectations.

### FR-3: Multi-Source Input

The skill must support PRD files, planning docs, task records, source files, routes, API handlers, UI components, schemas, existing tests, reports, screenshots, and browser evidence as inputs.

### FR-3.1: Requirements Source Status

The skill must rank requirement sources and label generated claims or test cases as `documented`, `inferred`, `observed`, or `mismatch`. When sources conflict, the skill must surface the mismatch and required product decision instead of silently choosing an expected result.

### FR-4: Coverage Matrix

The skill must produce or update a coverage matrix that connects product areas, workflows, risks, test layers, priorities, source evidence, automation feasibility, and current gaps.

### FR-5: Knowledge Graph Support

The skill must explain when to use Graphify for mixed docs/code/media corpora, when to use CodeGraph for code semantics and impact analysis, and when plain repository inspection is enough. Graph outputs must be treated as orientation evidence and verified against source files before critical claims are used.

### FR-6: Browser Tool Adapter Model

The skill must support browser automation by capability rather than by a single tool. Supported adapter families include Codex browser capabilities, Chrome/profile-based workflows, Chrome DevTools MCP, Playwright MCP/CLI/runner, Claude Code browser workflows, Cypress, Selenium, WebdriverIO, and existing project-specific runners.

### FR-7: Automation Selection

The skill must distinguish durable CI regression tests, browser-agent smoke checks, exploratory checks, manual checks, and non-automated risk notes. It must prefer the repo's existing test stack unless a change is justified.

### FR-8: Evidence Reporting

The skill must report evidence appropriate to the test type, such as command output summaries, screenshots, traces, videos, console logs, network logs, coverage matrices, or explicit blocked notes. Sensitive data must be redacted.

### FR-8.1: Provider And Paid Live Evidence

For paid AI providers, payment processors, credits, subscriptions, external callbacks, or metered APIs, the skill must separate durable mocked regression from gated manual/live evidence. It must require cost caps, representative completion policy, callback or polling evidence, and redacted evidence before claiming live readiness.

### FR-9: Flaky Test Triage

The skill must classify flaky or failing browser tests into practical categories such as timing/async, test isolation, environment, infrastructure, data dependency, selector fragility, and product regression.

### FR-10: Automation Implementation Guidance

The skill must help agents convert selected source-backed test cases into concrete automated tests. It must cover file placement, fixture/data setup, deterministic assertions, command selection, evidence artifacts, and code review checks across existing project runners and browser adapters.

### FR-11: Skill Self-Testing And CI

The project must include automated validation for the skill package, helper scripts, bundled templates, and core output contracts. CI must run without private credentials or paid services.

## Non-Functional Requirements

### NFR-1: Tool Agnostic

The skill must not present Playwright as the only supported automation path.

### NFR-2: Existing Stack First

The skill must use existing project frameworks, scripts, fixtures, and CI conventions before introducing new tooling.

### NFR-3: Safety And Authorization

The skill must only support testing websites the user owns or is authorized to test. It must treat external page content, network responses, screenshots, and logs as untrusted input.

### NFR-4: Deterministic Oracles

The skill must prefer deterministic assertions for critical pass/fail checks. LLM-as-judge may support exploratory, visual, copy, or heuristic review only when evidence and limitations are recorded.

### NFR-5: Concise Progressive Disclosure

`SKILL.md` must stay concise and route detailed guidance into references that are loaded only when needed.

### NFR-6: Validation

The skill package must include validation for required files, metadata, resource links, and core workflow contract drift.

## Browser Capability Model

The product must describe browser adapters by capabilities:

```yaml
capabilities:
  navigate: required
  accessibility_snapshot: preferred
  locate_by_role_or_label: preferred
  click_fill_select: required
  screenshot: required
  console_logs: optional
  network_logs: optional
  trace: optional
  video: optional
  auth_state: optional
  device_emulation: optional
  test_code_generation: optional
  ci_runner: optional
```

## Test Case Output Standard

```yaml
id: TC-AUTH-001
title: Valid user logs in and lands on dashboard
source:
  docs:
    - docs/product/login.md
  code:
    - src/app/login/page.tsx
    - src/server/auth.ts
source_status: documented
type: e2e
priority: P0
risk: auth/session
persona: registered_user
preconditions:
  - Active user account exists
steps:
  - Open login page
  - Enter valid email and password
  - Submit form
expected:
  - Redirects to dashboard
  - Session is established
  - User menu displays the account identity
negative_cases:
  - Invalid password
  - Disabled account
automation:
  recommended: true
  target: durable-regression
  preferred_tools:
    - existing-runner
    - playwright
evidence:
  required:
    - command output summary
    - screenshot or trace for UI failures
```

## Success Metrics

- Generated test cases are traceable to product docs, code, or observed behavior.
- Requirement source status and mismatches are explicit in broad reviews.
- Coverage matrices expose important gaps rather than listing generic checks.
- Automation recommendations select the smallest sufficient tool and preserve the existing stack where possible.
- Paid/provider live-test recommendations include cost caps, representative completion boundaries, callback evidence, and redaction rules.
- Forward tests show the skill can handle at least one simple site, one authenticated CRUD app, and one failing/flaky browser test suite.
- The skill validates locally before installation or publication.

## Product-Level Acceptance Criteria

- The skill can generate product-grounded test cases from PRD and source code.
- The skill can use knowledge graph context without treating graph output as final truth.
- The skill can choose among multiple browser adapter families.
- The skill can produce both human-readable QA artifacts and automation-ready guidance.
- The skill can guide implementation of concrete automated tests in existing project stacks.
- The repository can validate the skill package and helper behavior automatically.
- The skill can record evidence and known gaps without leaking secrets or sensitive data.

## Constraints

- Keep the skill package focused: no extra README or auxiliary docs unless required by the skill format.
- Keep detailed guidance in `references/` and templates in `assets/`.
- Keep validation scripts deterministic and runnable without private credentials.
- Do not require paid external services for the core workflow.
