# Workflow

Use this workflow for website QA planning, test case generation, automation, and triage.

## Decision Tree

1. If the user asks for test cases, start with product understanding and test case authoring.
2. If the user asks for automation, confirm whether test cases already exist. If not, create or infer them first.
3. If the user asks for a quick smoke, exploratory run, screenshot, console/network check, or visual inspection, browser-agent tools may run before durable test files exist.
4. If a repo has an existing test framework, prefer it for durable regression work.
5. If repo size or cross-doc architecture makes context unclear, use graph context before finalizing cases.

## Steps

1. Discover context: PRD, roadmap, tasks, README, routes, UI components, API handlers, schemas, existing tests, scripts, CI, auth, data dependencies, browser tools.
2. Build a product model: personas, workflows, entities, states, permissions, integrations, non-goals, acceptance criteria, risks.
3. Decide whether Graphify, CodeGraph, plain `rg`, or repo-native commands are appropriate.
4. Generate a coverage matrix by product area, workflow, risk, test layer, source evidence, and automation feasibility.
5. Write test cases using the schema and quality rubric.
6. Select automation targets: durable regression, browser-agent smoke, exploratory, manual, API/component, or risk note.
7. Execute through the best available adapter or project runner.
8. Report evidence, gaps, flaky risks, and next cases.

## Evidence Rules

- Record source files, docs, route paths, reports, screenshots, traces, or commands that justify the result.
- Mark claims as observed, documented, inferred, or blocked when evidence quality varies.
- Redact secrets and sensitive data before writing evidence.

