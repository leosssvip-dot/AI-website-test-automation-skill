# Scenario Workflows

Use this reference after initial context discovery. Scenario Workflow choice controls what happens after test cases are written and prevents the agent from stopping at a case list when the user needs automation, evidence, or release readiness.

## Post-Test-Case Disposition Gate

Run this gate whenever new or revised test cases are produced.

1. Assign every case a case disposition: `automate-now`, `automate-later`, `browser-smoke`, `manual/live`, `exploratory`, or `risk-note/not-in-scope`.
2. Map each case to a layer: API, route handler, unit, component, browser runner, browser-agent smoke, visual, accessibility, performance smoke, security smoke, provider/live, or manual.
3. Prefer the existing project stack for durable regression. Introduce a new runner only when no local stack can cover the selected case responsibly.
4. Identify required fixtures, accounts, mocks, provider gates, cost caps, screenshots, traces, logs, or CI artifacts before execution.
5. Execute only the next action implied by the user request. For response-only review, stop at the handoff package. For automation landing, edit tests and verify them. For live/provider work, require explicit authorization before real external completion.
6. Report remaining gaps and why each unimplemented case was not automated now.

## Scenario Workflow Matrix

| Scenario Workflow | Trigger | Required workflow | Required output |
| --- | --- | --- | --- |
| Response-only review | User asks for review, plan, coverage, recommendations, or test cases without implementation. | Build product model, detect mismatches, generate cases, run the Post-Test-Case Disposition Gate, and stop before file edits unless the user asks to implement. | Product model, mismatches, coverage matrix, source-backed cases, case disposition, evidence inspected, and next automation candidates. |
| Test-case authoring | User emphasizes test cases, PRD/source/design understanding, or QA package generation. | Read requirements/code/design sources, write cases with source status, then classify every case through the disposition gate. | Prioritized P0/P1/P2 cases, source evidence, assumptions, unknowns, coverage gaps, and automation recommendation per case. |
| Automation landing | User asks to write, add, implement, or improve automated tests. | Create or select cases first, choose automate-now cases, detect existing runner, implement minimal focused tests, run targeted validation, and record evidence. | Files changed, cases covered, runner, commands, results, failure artifacts, remaining cases, and browser smoke evidence when UI behavior is involved. |
| Browser smoke | User asks for quick smoke, screenshot, interactive check, console/network review, visual inspection, or local route verification. | Pick critical workflows/routes, run the best available browser tool, capture evidence, convert findings into cases or gaps, and decide whether durable automation is needed. | Screenshots or screenshot paths, console/network summary, viewport/mobile notes, observed issues, scoped skips, and follow-up cases. |
| Failure/flaky triage | User provides failing tests, CI logs, retries, traces, or flaky reports. | Summarize report, categorize failure, inspect artifacts, reproduce narrowly when possible, distinguish product bug vs test bug vs environment flake, then recommend or implement the smallest fix. | Failure/flaky triage, likely cause, evidence, proposed fix, verification command, and stability follow-up. |
| Provider/live testing | User asks to test paid providers, external integrations, callbacks, media generation, checkout-like flows, or live completion. | Confirm authorization, cost cap, test account, stop condition, redaction rules, durable mocked/disabled-path coverage, and representative completion policy before real live execution. | Live test plan, gated manual/live cases, mock coverage, provider evidence requirements, cost controls, and explicit blockers when authorization is missing. |
| Specialized quality | User asks for visual, accessibility, performance, security, design mismatch, or release quality checks. | Select high-risk pages/states, use smoke-level checks first, avoid intrusive testing without authorization, and connect each finding to a source-backed case or coverage gap. | Specialized checklist, pages/states covered, findings, evidence, severity, and recommended durable checks. |
| Readiness audit | User asks whether coverage is complete, mature, ready, or enough for release/open source. | Score the eight readiness workstreams, inspect evidence quality, run the disposition gate on major gaps, and recommend the next bounded testing slice. | Readiness score, dimension evidence, blockers, scoped skips, highest-value next tests, and verification evidence. |

## Stop Conditions

- Do not implement tests during response-only review unless the user asks for implementation.
- Do not stop at test cases when the user asked for automation, completeness, release readiness, or evidence.
- Do not run paid/live/provider completions without explicit authorization and cost controls.
- Do not add a browser runner when API, route, component, or existing project tests cover the case more directly.
- Do not mark a workflow complete without case disposition and evidence.
