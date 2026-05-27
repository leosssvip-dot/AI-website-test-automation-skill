# Automation Selection

Not every test case should become a durable browser test.

## Targets

- `durable-regression`: stable, repeatable CI check.
- `browser-agent-smoke`: quick exploratory or release confidence check.
- `exploratory`: human or agent exploration with evidence.
- `manual`: manual-only due cost, instability, or subjective judgement.
- `api-or-component`: cheaper layer gives the same confidence.
- `not-automated-risk-note`: keep the risk visible but do not automate yet.

## Rules

- Prefer existing project framework and fixtures.
- Use browser-agent tools for discovery, evidence, screenshots, and fast smoke checks.
- Use durable runners for repeated CI regression.
- Move logic-heavy checks to API or component tests when full E2E adds little value.
- Do not automate unstable flows until auth, data, and environment can be controlled.
- Do not mock the app under test for end-to-end confidence; mock third-party dependencies when needed.
- When implementation is requested, continue into `automation-implementation.md` and produce concrete files, commands, fixture needs, and evidence expectations.
