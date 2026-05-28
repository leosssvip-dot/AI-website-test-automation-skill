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
    recommended:
    target:
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
- Manual/live:
- Exploratory:
- Not automated yet:

## Case Disposition
| Case ID | Disposition | Layer | Why now / why not now | Next action |
| --- | --- | --- | --- | --- |
|  | automate-now / automate-later / browser-smoke / manual/live / exploratory / human-logic-risk / risk-note/not-in-scope |  |  |  |

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
- Manual/live cases:
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
