# Workflow

Use this workflow for website QA planning, test case generation, automation, and triage.

## Decision Tree

1. Classify the request with [scenario-workflows.md](scenario-workflows.md) before choosing tools.
2. If the user asks for test cases, start with product understanding and test case authoring, then run the Post-Test-Case Disposition Gate.
3. If the user asks for automation, confirm whether test cases already exist. If not, create or infer them first, then choose which cases are automated now.
4. If the user asks for a quick smoke, exploratory run, screenshot, console/network check, or visual inspection, browser-agent tools may run before durable test files exist, but findings must be converted into cases, gaps, or risk notes.
5. If a repo has an existing test framework, prefer it for durable regression work.
6. If repo size or cross-doc architecture makes context unclear, use graph context before finalizing cases.

## Steps

1. Discover context: PRD, roadmap, tasks, README, routes, UI components, API handlers, schemas, existing tests, scripts, CI, auth, data dependencies, browser tools.
2. Build a product model: personas, workflows, entities, states, permissions, integrations, non-goals, acceptance criteria, risks.
3. Decide whether Graphify, CodeGraph, plain `rg`, or repo-native commands are appropriate.
4. Generate a coverage matrix by product area, workflow, risk, test layer, source evidence, and automation feasibility.
5. Write test cases using the schema and quality rubric.
6. Run the Post-Test-Case Disposition Gate from [scenario-workflows.md](scenario-workflows.md): assign every case to automate-now, automate-later, browser-smoke, manual/live, exploratory, or risk-note/not-in-scope.
7. Select automation targets: durable regression, browser-agent smoke, exploratory, manual, API/component, or risk note.
8. Execute through the best available adapter or project runner.
9. Report case disposition, evidence, gaps, flaky risks, and next cases.

## Evidence Rules

- Record source files, docs, route paths, reports, screenshots, traces, or commands that justify the result.
- Mark claims as observed, documented, inferred, or blocked when evidence quality varies.
- Redact secrets and sensitive data before writing evidence.
