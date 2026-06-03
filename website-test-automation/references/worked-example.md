# Worked Example: Authenticated CRUD App

This is a full end-to-end walkthrough of the skill on one small app, so the workflow is concrete rather than abstract. It uses the bundled fixture at `tests/fixtures/auth-crud` (a deliberately incomplete Next.js project) to show every stage: context discovery, product model, human-reasonableness review, mismatch detection, coverage matrix, source-backed cases, disposition, automation, and evidence. The point of this fixture is that its PRD and its code disagree — a realistic situation the skill must surface instead of hide.

Use this as a template for shape and rigor, not as cases to copy. Re-derive everything from the target repo's own sources.

## Inputs

- PRD: `tests/fixtures/auth-crud/docs/PRD.md`
- Routes/pages: `src/app/login/page.tsx`, `src/app/projects/page.tsx`, `src/app/projects/new/page.tsx`
- API: `src/app/api/projects/route.ts`
- Existing test: `tests/projects.spec.ts`
- Stack: `package.json`

## Step 1 — Discover Context

Run the helper scripts before reading every file by hand:

```bash
node website-test-automation/scripts/detect-web-test-stack.mjs tests/fixtures/auth-crud
# frameworks: nextjs, react | testFrameworks: playwright, vitest | scripts: test=vitest, test:e2e=playwright test

node website-test-automation/scripts/route-inventory.mjs tests/fixtures/auth-crud
# /login, /projects, /projects/new, GET|POST /api/projects
```

Conclusion: existing stack is Vitest (unit/route) + Playwright (e2e). Prefer both for durable regression; do not introduce a new runner.

## Step 2 — Product Model

Built from `docs/PRD.md` (documented) cross-checked against code (inferred/observed). Keep source status visible.

- Persona: registered user; plus a disabled user the PRD calls out explicitly.
- Core workflow: log in → list projects → create / edit / archive a project.
- Entity: `Project { id, name }`, scoped per account; name required and unique per account (`documented`).
- Permission boundary: `/projects` requires login; disabled users are blocked (`documented`).
- Observed code reality: `/projects` and `/api/projects` have no auth check; the login button is not wired; POST echoes the name with no uniqueness check; edit and archive do not exist (`inferred` from source).

## Step 3 — Human Reasonableness Review Gate

Before writing cases, compare documented expectation, observed behavior, and human expectation ([human-reasonableness.md](human-reasonableness.md)).

```yaml
id: HLR-AUTH-001
workflow: sign-in
persona: first-time user
documented_expectation: "Users log in before reaching /projects."
observed_behavior: "Login page renders a 'Sign in' button with no fields and no action; clicking does nothing."
human_expectation: "Entering credentials and clicking Sign in should authenticate, or show why it cannot."
why_unreasonable: "A control that looks actionable but does nothing leaves the user stuck with no feedback or next step."
severity: P1
source:
  docs: ["docs/PRD.md"]
  code: ["src/app/login/page.tsx"]
  observed: []
logic_risk: true
suggested_test:
  type: exploratory
  goal: "Confirm whether login is unimplemented or wired elsewhere before automating the auth flow."
suggested_product_fix: "Wire the form to an auth action, or disable the button with an explanatory state."
decision_needed: "Is login in scope for this milestone, or intentionally stubbed?"
```

## Step 4 — Mismatches

The PRD and the code disagree. Do not flatten these into assumptions; carry them into cases and the matrix.

| Area | Documented | Observed in code | Decision needed |
| --- | --- | --- | --- |
| Auth guard | Login required before `/projects` | `projects/page.tsx` and `api/projects/route.ts` have no auth check | Add guard, or confirm pages are pre-auth stubs |
| Unique name | Name unique per account | POST echoes any name, no uniqueness check | Enforce uniqueness, or mark requirement deferred |
| Edit / archive | User can edit and archive projects | No UI or API for edit/archive | Confirm scope; treat as coverage gap until built |

## Step 5 — Coverage Matrix (excerpt)

| Product area | Workflow | Risk | Source evidence | Source status | Layer | Priority | Current coverage | Gap / next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| auth/session | guard `/projects` | unauthorized access | PRD; `projects/page.tsx` | mismatch | route/middleware | P0 | none | Decide guard; add route test once behavior is set |
| projects | create project | data integrity | PRD; `api/projects/route.ts` | mismatch | api | P0 | `projects.spec.ts` (unwired, failing) | Add API contract + uniqueness test |
| projects | edit / archive | missing capability | PRD | documented | api/e2e | P1 | none | Build feature, then cover |

## Step 6 — Source-Backed Cases

Two representative cases (schema-complete; would pass `validate-testcases.mjs`). One is a clean contract test; one carries a mismatch and is not safe to make durable regression yet.

```yaml
- id: TC-PROJ-001
  title: Create-project API returns 201 with the submitted name
  source:
    docs: ["docs/PRD.md"]
    code: ["src/app/api/projects/route.ts"]
    observed: []
  source_status: inferred
  mismatch: ""
  human_expectation: "A created project is persisted and retrievable, not just echoed back."
  why_unreasonable: ""
  logic_risk: false
  suggested_product_fix: ""
  type: api
  priority: P0
  risk: data-integrity
  persona: registered_user
  preconditions:
    - Authenticated session (once auth exists)
  steps:
    - POST /api/projects with a JSON body containing a name
  expected:
    - Response status is 201
    - Response body echoes the submitted name
  negative_cases:
    - Missing name should be rejected once validation exists
  data_needs:
    - A unique project name per run
  automation:
    recommended: true
    target: api-or-component
    preferred_tools: ["vitest"]
  evidence:
    required:
      - Route handler source
      - Command output from the route test
  assumptions:
    - Current handler does not persist; test asserts contract shape only
  unknowns:
    - Whether persistence and uniqueness land in this milestone
- id: TC-AUTH-002
  title: Unauthenticated user is redirected away from /projects
  source:
    docs: ["docs/PRD.md"]
    code: ["src/app/projects/page.tsx"]
    observed: []
  source_status: mismatch
  mismatch: "PRD requires login before /projects, but the page renders with no auth guard."
  human_expectation: "Protected data should not render to a logged-out visitor."
  why_unreasonable: ""
  logic_risk: false
  suggested_product_fix: "Add a route guard/middleware that redirects unauthenticated users to /login."
  type: e2e
  priority: P0
  risk: auth/session
  persona: anonymous
  preconditions:
    - No active session
  steps:
    - Navigate to /projects without logging in
  expected:
    - User is redirected to /login and project data is not shown
  negative_cases: []
  data_needs: []
  automation:
    recommended: false
    target: not-automated-risk-note
  evidence:
    required:
      - Page source showing the missing guard
  assumptions: []
  unknowns:
    - Whether the guard is intended this milestone or pages are pre-auth stubs
```

Note: `TC-AUTH-002` is a `mismatch` with `automation.recommended: false`. Do not write a durable test that asserts the buggy current behavior; surface the decision first.

## Step 7 — Disposition Gate

| Case ID | Disposition | Layer | Why now / why not now | Next action |
| --- | --- | --- | --- | --- |
| TC-PROJ-001 | automate-now | api | Handler exists; contract is testable today | Add a Vitest route test |
| TC-AUTH-002 | human-logic-risk | route | Behavior contradicts the PRD; automating now would lock in a bug | Get a product decision, then cover |
| edit / archive | risk-note/not-in-scope | — | Feature does not exist yet | Track as gap until built |

## Step 8 — Automation + Implementation

`automate-now` → one Vitest route test on the real handler. Keep it deterministic and scoped:

```ts
import { describe, it, expect } from "vitest";
import { POST } from "../src/app/api/projects/route";

describe("POST /api/projects (TC-PROJ-001)", () => {
  it("returns 201 and echoes the submitted name", async () => {
    const req = new Request("http://test/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: `Roadmap-${Date.now()}` }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect((await res.json()).name).toMatch(/^Roadmap-/);
  });
});
```

Command: `npx vitest run tests/api/projects-route.test.ts`.

## Step 9 — Triage the Existing Test

`tests/projects.spec.ts` drives `/projects/new`, fills the name, clicks Create, and asserts the new name is visible. But `new/page.tsx` has a bare `<form>` with no submit handler — nothing renders the result. Per [flake-triage.md](flake-triage.md), this is **product regression / not-yet-implemented**, not a flake: do not "fix" it by loosening the assertion or adding a wait. Convert it to a pending case tied to the create-flow gap, and flag the unwired form.

## Output the Agent Should Produce

Product model with source status, the logic-findings ledger, the mismatch table with decisions needed, the coverage matrix, source-backed cases, the disposition table, the landed route test plus its command/result, and the existing-test triage — using [output-templates.md](output-templates.md). The headline is not "tests written"; it is "three PRD-vs-code mismatches surfaced, one contract test landed, three decisions needed."
