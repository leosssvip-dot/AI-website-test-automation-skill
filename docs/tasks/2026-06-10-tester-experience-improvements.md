# Tester Experience Improvements

## Status
Done

## Goal

Close the tester-facing gaps found in the 2026-06-10 skill review so the skill serves QA engineers, not only repo-resident AI coding agents: black-box/URL-only testing, defect reporting, classic test design techniques, chartered exploratory sessions, release test plans, test-case export for test-management tools, JUnit XML report support, and engineering fixes (Windows paths, parser-limit documentation, Nuxt route inventory, scorer measurement note, Claude Code install paths).

## Scope

- New references: `test-design-techniques.md`, `exploratory-testing.md`, `defect-reporting.md`, `black-box-testing.md`; new asset `assets/checklists/exploratory-charter.md`.
- New script `scripts/export-testcases.mjs` (CSV/Markdown export) with shared parser extracted to `scripts/lib/yaml-testcases.mjs`; `validate-testcases.mjs` refactored onto the shared lib.
- `summarize-test-report.mjs` gains JUnit XML parsing; `route-inventory.mjs` gains Nuxt-style `pages/*.vue` routes; `score-test-readiness.mjs` gains a measurement note.
- SKILL.md: tester-intent description triggers, technique/exploratory/defect workflow steps, No Source Access section, output-language rule, defect/release-plan outputs, export helper. Steps 7-8 and all validator-locked contract phrases unchanged.
- `scenario-workflows.md` black-box scenario row and stop condition; defect/exploratory/technique cross-links in workflow, authoring, schema, automation-selection, flake-triage, human-reasonableness; Defect Report and Release Test Plan templates in `output-templates.md`.
- Validator and tests: new refs/scripts/assets added to `validate-skill.mjs`; six new repository tests; Windows `fileURLToPath` fixes in `tests/run-skill-tests.mjs` and `scripts/validate-agent-workflow.mjs`; new fixture `tests/fixtures/reports/junit-sample.xml`.
- Bilingual READMEs: new capability rows, Claude Code install/update paths, black-box and export prompts, export helper line, tests badge 33 → 39.
- Out of scope: real-project case studies (the 89/83 score calibration is intentionally unchanged until those exist), renaming the skill, native mobile/desktop/load-testing scope.

## Risk Tier

Tier 3: skill content, helper scripts, validators, repository tests, and public README claims.

## Acceptance Criteria

- `npm run validate` passes with the expanded test suite, including negative/contract tests that existed before this task.
- `score-test-readiness.mjs` still reports `overallScore` 89 on the skill (cap intact, no unearned case-study bump) and the README keeps the calibrated 83 badge.
- New references are required by `validate-skill.mjs` so they cannot silently disappear.
- Export script round-trips the valid fixture into CSV and Markdown; JUnit fixture summarizes with correct pass/fail/skip counts.
- English and Chinese READMEs stay in sync for the new capabilities and install paths.

## Verification Result

- `npm run validate`: 39 repository tests passed plus agent-workflow validation.
- `node website-test-automation/scripts/validate-skill.mjs website-test-automation`: passed.
- `node website-test-automation/scripts/score-test-readiness.mjs website-test-automation`: `dimensionCount` 8, `contractScore` 100, `overallScore` 89, level `80-90 mature readiness candidate`, `hasProvenRealProjectEvidence` false.
- `export-testcases.mjs` on `tests/fixtures/testcases/valid.yaml` produced CSV with numbered steps and a Markdown table; `summarize-test-report.mjs` on `tests/fixtures/reports/junit-sample.xml` reported passed 2 / failed 1 / skipped 1 with the correct failing title (after fixing a greedy-regex bug that merged self-closing testcases into the next case).
- A 17-agent adversarial review (4 dimensions: contract compliance, script correctness, docs/link integrity, bilingual README sync; every finding independently re-verified) confirmed 9 issues, all fixed with regression assertions: unwritable `--out` now exits 2 cleanly; bracket-prefixed plain scalars (`[Smoke] Title`) no longer silently corrupted by the YAML-subset parser; JSON scalar arrays no longer crash the validator; parse errors now exit 1 with an accurate exported-file count; CSV cells get OWASP formula-injection guards; JUnit comment-wrapped testcases are not counted; the defect S1-S4 scale is explicitly mapped against the ledger's P-label severity field; the technique table's CRUD/data-lifecycle row gained its missing section; the EN README export claim was re-hedged to match the zh wording and the script itself.

## Final Outcome

The skill now covers the tester's daily loop end to end: derive cases with classic techniques, test black-box targets without source access, run chartered exploratory sessions, file reproducible defect reports with severity/priority rules, plan releases with entry/exit criteria, and export cases to CSV/Markdown for test-management tools. Reports in JUnit XML are summarized natively, the repo validates on Windows, and the anti-overclaim score calibration is preserved — raising past 89/83 still requires bundled real-project case studies.
