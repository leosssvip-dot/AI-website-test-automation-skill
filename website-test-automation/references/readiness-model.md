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

- `version` is exactly `1`, and `projects` contains at least two entries with at least two unique project IDs and at least two unique project targets. IDs and targets are normalized by trimming and case-folding before duplicate checks; duplicate normalized IDs or targets are invalid.
- Every project has nonblank, non-placeholder string values for `id`, `target`, `command`, and `outcome`, plus a nonempty string array in `evidence`. Values such as TODO, TBD, pending, not run, replace, placeholder, and example-only are invalid even when hidden behind a wrapper such as `Status:` or a Markdown heading. An outcome or evidence report that also records a concrete result such as `12 tests passed; TODO follow-up` is not placeholder-only; this exception does not apply to `id`, `target`, or `command`.
- Every item in `evidence` is a nonblank path relative to the scored root and resolves to an existing ordinary non-symlink file inside that root. The file contents must be nonempty and not placeholder-only. Placeholder words in a legitimate filename do not invalidate the path. Absolute paths, traversal, symbolic links in the final path or parent chain, directories, text files larger than 2 MiB, and paths outside the root are invalid.
- The manifest itself is root-contained, valid JSON, no larger than 2 MiB, and an ordinary non-symlink file whose parent chain contains no symbolic links. Ordinary text files larger than 2 MiB do not contribute file-path or content evidence to workstream scores.

This gate is intentionally fail-closed: malformed manifests and unreadable or unsafe evidence keep the overall score capped at 89 and appear in `evidenceCalibration.reasons`. A 90+ result is still a candidate assessment of documented process evidence, not a runtime quality guarantee; the scorer does not execute the recorded commands or independently verify the product outcome.

## Rules

- Run `scripts/score-test-readiness.mjs <repo-or-skill>` for broad completeness claims.
- Treat 80-90 as a readiness target, not a guarantee of product quality.
- Do not average away a critical gap: auth, payments, provider/live, CI, or data lifecycle blockers must stay visible.
- Do not treat an inapplicable browser workstream as a scoped skip. Apply the Browser Evidence Condition first; if none of its conditions applies, omit browser execution without manufacturing a reason.
- If another workstream is intentionally out of scope, mark it as scoped-skip and explain the risk.

Use `assets/readiness-score-template.md` for final reporting.
