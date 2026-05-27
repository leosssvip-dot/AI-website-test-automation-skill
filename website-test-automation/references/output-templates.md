# Output Templates

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

## Coverage Matrix
| Product area | Workflow | Risk | Source evidence | Source status | Test layer | Priority | Automation feasibility | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Source-Backed Test Cases
```yaml
- id: TC-AREA-001
  title:
  source_status: documented
  source_evidence: []
  priority: P0
  risk:
  preconditions: []
  steps: []
  expected: []
  automation:
  gap:
```

## Automation Selection
- Durable regression:
- Browser-agent smoke:
- API/component:
- Manual/live:
- Exploratory:
- Not automated yet:

## Browser Adapter Choice
- Existing project stack first:
- Codex Browser:
- Chrome:
- Computer Use:
- Chrome DevTools MCP:
- Playwright runner:

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

## Skill Quality Notes
- Useful:
- Vague:
- Recommended skill improvements:
````

## Automation Handoff

```markdown
## Automation Handoff
- Selected cases:
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
