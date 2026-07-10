# Output Templates

## Contents

- Coverage Summary
- Readiness Score
- Response-Only QA Package
- Logic Findings Ledger
- Case Disposition
- Automation Handoff
- Implemented Automation Summary
- Failure Triage
- Defect Report
- Release Test Plan

## Coverage Summary

```markdown
## Coverage Summary
- Product areas covered:
- High-risk gaps:
- Mismatches:
- Automation candidates:
- Manual/exploratory checks:
- Evidence:
```

## Readiness Score

Use this when the user asks for broad completeness, maturity, 80-90% coverage, or release readiness.

```markdown
## Readiness Score
| Workstream | Score | Evidence | Gaps / next action |
| --- | ---: | --- | --- |
| Product understanding |  |  |  |
| Source-backed cases |  |  |  |
| Coverage matrix |  |  |  |
| Automation implementation |  |  |  |
| Browser-smoke evidence |  |  |  |
| CI/flaky reporting |  |  |  |
| Provider/live governance |  |  |  |
| Specialized quality |  |  |  |

- Overall score:
- Readiness band:
- Critical blockers:
- Scoped skips:
- Verification evidence:
```

## Response-Only QA Package

Use this when the user asked for review, planning, or agent-style output without implementing tests.

````markdown
## Product Model
- Requirements source status:
- Target users:
- Core workflows:
- State and permission risks:

## Mismatches
| Area | Conflict | Sources | Decision needed | Temporary test stance |
| --- | --- | --- | --- | --- |

## Logic Findings Ledger
| ID | Workflow | Persona | Documented expectation | Observed behavior | Human expectation | Why unreasonable | Severity | Suggested product fix |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Coverage Matrix
| Product area | Workflow | Risk | Source evidence | Source status | Test layer | Priority | Automation feasibility | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Source-Backed Test Cases
```yaml
- id: TC-AREA-001
  title:
  source:
    docs: []
    code: []
    observed: []
  source_status: documented
  surface: web
  layer: browser-runner
  disposition: automate-now
  mismatch: ""
  human_expectation: ""
  why_unreasonable: ""
  logic_risk: false
  suggested_product_fix: ""
  type:
  priority: P0
  risk:
  persona:
  preconditions: []
  steps: []
  expected: []
  negative_cases: []
  data_needs: []
  automation:
    recommended: true
    target: durable-regression
    preferred_tools: []
  evidence:
    required: []
  assumptions: []
  unknowns: []
  gap:
```

## Automation Selection
- Durable regression:
- Browser-agent smoke:
- API/component:
- Manual/provider-live:
- Exploratory:
- Not automated yet:

## Case Disposition

The root `disposition` field on each test case is canonical; this table is a derived review view.

| Case ID | Disposition | Layer | Why now / why not now | Next action |
| --- | --- | --- | --- | --- |
|  | automate-now / automate-later / browser-smoke / manual / provider-live / exploratory / human-logic-risk / risk-note / not-in-scope |  |  |  |

## Browser Adapter Choice
- Existing project stack first:
- Codex Browser:
- Chrome:
- Computer Use:
- Chrome DevTools MCP:
- Claude Code browser workflows:
- Playwright MCP/CLI:
- Playwright runner:
- Cypress:
- Selenium:
- WebdriverIO:

## Provider/Live Testing
- Disabled-path coverage:
- Cost cap:
- Representative completion policy:
- Callback/polling evidence:
- Redaction rules:

## Evidence Inspected
- Docs/plans:
- Routes/source:
- Existing tests:
- Tooling detected:
- Commands run:
````

## Skill Package Review Notes

Use this only when the user is reviewing or improving this skill package itself, not when applying the skill to a target project.

```markdown
## Skill Package Review Notes
- Useful:
- Vague:
- Recommended skill improvements:
```

## Automation Handoff

```markdown
## Automation Handoff
- Selected cases:
- Case disposition:
- Target runner or browser adapter:
- Fixtures/data needed:
- Files to create or update:
- Commands:
- Assertions:
- Browser-agent smoke evidence:
- Evidence expected:
- Cases left manual:
- Risks:
```

## Implemented Automation Summary

```markdown
## Implemented Automation Summary
- Cases covered:
- Case disposition:
- Files changed:
- Runner:
- Command result:
- Browser-agent smoke evidence:
- Failure artifacts:
- Remaining gaps:
- Manual/provider-live cases:
```

## Failure Triage

```markdown
## Failure Triage
- Failing case:
- Category:
- Evidence:
- Likely cause:
- Fix:
- Verification:
```

## Defect Report

Use this with [defect-reporting.md](defect-reporting.md) when a product bug is confirmed.

```markdown
## Defect Report
- ID / title:
- Severity / priority:
- Environment (URL/build, browser, viewport, account/role):
- Preconditions:
- Steps to reproduce:
- Expected result (source evidence):
- Actual result (evidence paths):
- Scope / regression notes:
- Related case or logic finding IDs:
- Redaction note:
```

## Release Test Plan

Use this when the request is release-scoped and needs entry/exit criteria, not only a coverage matrix.

```markdown
## Release Test Plan
- Release and scope:
- Out of scope:
- Entry criteria:
- Exit criteria:
- Environments and accounts:
- Test data needs:
- Schedule and owners:
- Risks and contingencies:
- Coverage source (matrix link):
- Readiness gate (score link):
```
