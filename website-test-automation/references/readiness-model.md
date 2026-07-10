# Readiness Model

Use this when the user asks whether testing is complete, mature, production-ready, or in the 80-90% range.

## Eight Workstreams

1. Product understanding: requirements source, personas, workflows, entities, states, permissions, non-goals, assumptions.
2. Source-backed cases: schema-complete test cases with source evidence, risk, priority, data needs, expected results, and unknowns.
3. Coverage matrix: workflow/risk/layer coverage with current tests, gaps, and product mismatches.
4. Automation implementation: concrete files, runner choice, fixtures, deterministic assertions, failure artifacts, and commands.
5. Browser-smoke evidence: conditional on the canonical [Browser Evidence Condition](scenario-workflows.md#browser-evidence-condition). When it applies, capture the smallest relevant screenshots, console/network summaries, mobile-overflow checks, or upload/auth interactions. When none of its conditions applies, browser evidence is not required and no scoped-skip reason is needed.
6. CI/flaky reporting: reports, traces, retries, failure category, first failing step, artifact paths, and fix verification.
7. Provider/live governance: disabled path, cost cap, representative completion, callbacks/polling, storage, refund/credit handling, redaction.
8. Specialized quality: visual, accessibility, performance smoke, security smoke, responsive, cross-browser, and i18n where relevant.

## Scoring Bands

- 0-49: exploratory only; do not call it broad test coverage.
- 50-69: useful planning coverage; automation and evidence gaps remain.
- 70-79: operational candidate; good guidance but weak specialist or real-project proof.
- 80-90: mature candidate; every workstream has guidance, templates or scripts, evidence rules, and known gaps.
- 90+: proven-maturity candidate; a valid structured manifest records evidence from multiple real projects and the raw contract score is at least 90.

## Structured Evidence Gate For 90+

The scorer only considers a file named `evidence-manifest.json` under `real-project-validation/`, `forward-test-results/`, or `case-studies/`. Merely creating one of those directories, or adding a README, TODO, case-study narrative, or other file, does not unlock 90+.

The manifest schema is:

```json
{
  "version": 1,
  "projects": [
    {
      "id": "stable-project-id",
      "target": "tested product or repository",
      "command": "targeted verification command",
      "outcome": "concrete observed result",
      "evidence": ["root-relative/path/to/evidence.md"]
    }
  ]
}
```

The gate requires all of the following:

- `version` is exactly `1`, and `projects` contains at least two entries with at least two unique project IDs and at least two unique project targets. URL targets normalize scheme and host case, default ports, credentials, query strings, trailing slashes, and fragments; local targets normalize case, separators, whitespace, and trailing slashes. Equivalent normalized targets are duplicates.
- Every project has nonblank, non-placeholder `id`, `target`, and `command` strings. Exact or wrapped placeholders are invalid, but legitimate compound names such as `todo-app`, `https://todo.test`, and `pending-orders` are allowed.
- Every outcome or evidence report must contain a concrete observed result signal such as passed, failed, verified, observed, completed, succeeded, a test/check/assertion count, an exit code, or an HTTP status. Result verbs require at least three substantive context tokens, so bare `passed`, `verified`, `worked`, and `looks good` are invalid; verbs negated in the same phrase, such as `not verified yet` or `never completed`, are also invalid, while a directly observed `failed` result remains valid evidence. Expectation language anywhere in the string makes count/status signals invalid unless an actual/observed marker appears after the expectation and before that numeric signal, or a later passed/failed/verified/observed/completed/succeeded result verb establishes the outcome: `expected 201; actual status 200` and `planned 12; 12 passed` are valid, while `HTTP status 200 expected; actual unknown` is not. When a placeholder is present, the concrete result must appear first, as in `12 tests passed; TODO follow-up`.
- Every item in `evidence` is a nonblank root-relative path that resolves to an existing ordinary non-symlink file inside the root. Each project needs at least one evidence path not reused by another project. Placeholder words in a legitimate filename do not invalidate the path. Absolute paths, traversal, symbolic links, directories, text files larger than 2 MiB, and outside-root paths are invalid.
- The manifest itself is root-contained, valid JSON, no larger than 2 MiB, and an ordinary non-symlink file. A final manifest symbolic link is reported as an unsafe manifest candidate without reading its target.

## Resource Budgets

- Global limits are 10,000 scanned files, 32 MiB of scored text, and 20 manifest candidates. Extra content is ignored, reported in `resourceBudget.warnings`, and prevents 90+.
- Per-manifest limits are 100 projects, 20 evidence refs per project, 200 total refs, and 16 MiB of unique evidence bytes. Exceeding a limit is an auditable failure reason.
- Evidence is cached by resolved root-contained path for each manifest. Repeated references increment `evidenceCacheHits` but do not reread the file or multiply `uniqueEvidenceBytes`.

This gate is intentionally fail-closed: malformed manifests and unreadable or unsafe evidence keep the overall score capped at 89 and appear in `evidenceCalibration.reasons`. A 90+ result is still a candidate assessment of documented process evidence, not a runtime quality guarantee; the scorer does not execute the recorded commands or independently verify the product outcome.

## Rules

- Run `scripts/score-test-readiness.mjs <repo-or-skill>` for broad completeness claims.
- Treat 80-90 as a readiness target, not a guarantee of product quality.
- Do not average away a critical gap: auth, payments, provider/live, CI, or data lifecycle blockers must stay visible.
- Do not treat an inapplicable browser workstream as a scoped skip. Apply the Browser Evidence Condition first; if none of its conditions applies, omit browser execution without manufacturing a reason.
- If another workstream is intentionally out of scope, mark it as scoped-skip and explain the risk.

Use `assets/readiness-score-template.md` for final reporting.
