# Skill Hardening Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task.

**Goal:** Remove the review's false-green, unsafe-output, misleading-example, and contract-drift failure modes without broadening product scope.

**Architecture:** Keep the zero-dependency Node CLI design. Move reusable case validation into one library, make risky operations opt-in or fail-closed, and keep the skill body as a scenario router while detailed contracts remain in references and assets.

**Tech Stack:** Node.js ESM, `node:assert`, repository fixture tests, Markdown/YAML skill assets.

---

### Task 1: Static Skill Validation And Safe Report Summaries

**Files:**
- Modify: `tests/run-skill-tests.mjs`
- Modify: `website-test-automation/scripts/validate-skill.mjs`
- Modify: `website-test-automation/scripts/summarize-test-report.mjs`
- Modify: `website-test-automation/references/ci-reporting.md`

1. Add failing tests proving default validation does not execute candidate scripts, trusted execution has a timeout, report discovery never silently drops a failure, and common token/cookie values are redacted.
2. Run `npm test` and confirm those tests fail for the reviewed reasons.
3. Make validation static by default; add explicit trusted execution with a bounded timeout. Add report file counts, deterministic ordering, explicit truncation behavior, and default redaction.
4. Run the focused repository test command and confirm green.

### Task 2: Fail-Closed Test-Case Validation And Export

**Files:**
- Create: `website-test-automation/scripts/lib/testcase-schema.mjs`
- Modify: `website-test-automation/scripts/lib/yaml-testcases.mjs`
- Modify: `website-test-automation/scripts/validate-testcases.mjs`
- Modify: `website-test-automation/scripts/export-testcases.mjs`
- Modify: `tests/run-skill-tests.mjs`
- Modify: `website-test-automation/references/testcase-schema.md`

1. Add failing cases for wrong field shapes, unterminated quotes, dangerous keys, inherited properties, empty source evidence, invalid-case export, partial export, input/output collision, and symlink escape.
2. Run `npm test` and verify RED.
3. Implement strict subset parsing, own-property/type validation, shared validation, fail-closed export, realpath containment, and atomic output.
4. Run targeted tests and verify GREEN.

### Task 3: Real-Code Templates And Honest Worked Example

**Files:**
- Modify: `website-test-automation/assets/automation-templates/vitest-route.test.ts`
- Modify: `website-test-automation/assets/automation-templates/testing-library.test.tsx`
- Modify: `website-test-automation/assets/automation-templates/selenium.test.js`
- Modify: `website-test-automation/references/worked-example.md`
- Modify: `tests/run-skill-tests.mjs`

1. Add failing static/behavioral checks that templates import a target symbol, do not define the unit under test, require an explicit base URL, and never claim unexecuted code landed.
2. Replace local fake implementations with target imports and correct the example to a proposed, unexecuted test unless a real fixture test is present.
3. Verify the example import path exists in the source repository or remove runnable claims from the installed bundle narrative.

### Task 4: One Durable Case And Workflow Contract

**Files:**
- Modify: `website-test-automation/SKILL.md`
- Modify: `website-test-automation/agents/openai.yaml`
- Modify: `website-test-automation/assets/testcase-template.yaml`
- Modify: `website-test-automation/references/{workflow,scenario-workflows,testcase-schema,output-templates,automation-implementation,human-reasonableness}.md`
- Modify: `website-test-automation/scripts/{validate-testcases,export-testcases,validate-skill}.mjs`
- Modify: `tests/run-skill-tests.mjs`

1. Add failing contract tests for `surface`, `layer`, and `disposition`, scenario-branch stopping, source-status vocabulary, logic-risk consistency, and browser-smoke applicability.
2. Update the single canonical schema and route templates to it; remove duplicate or conflicting fields.
3. Run repository validation and official skill validation.

### Task 5: Evidence-Calibrated Readiness And Discovery Helpers

**Files:**
- Modify: `website-test-automation/scripts/score-test-readiness.mjs`
- Modify: `website-test-automation/scripts/detect-web-test-stack.mjs`
- Modify: `website-test-automation/scripts/route-inventory.mjs`
- Modify: `website-test-automation/references/readiness-model.md`
- Modify: `tests/run-skill-tests.mjs`
- Add only if needed: a fresh fixture not described by the worked example.

1. Add failing tests for placeholder evidence, workspace/monorepo detection, synchronous and const Next.js methods, HEAD/OPTIONS, commented routes, parallel/intercepting segments, and symlink escape.
2. Require a structured evidence manifest before the 90+ band; otherwise preserve the 89 cap.
3. Improve helpers without adding framework dependencies.
4. Forward-test on a fresh raw artifact, compare against the preserved baseline, and record only observable improvement.

### Final Verification

Run:

```bash
npm run validate
node website-test-automation/scripts/validate-skill.mjs website-test-automation
python3 /Users/chenyang/.codex/skills/.system/skill-creator/scripts/quick_validate.py website-test-automation
git diff --check
```

Then review the diff, update the task record and `docs/PROGRESS.md`, sync the installed copy only after all checks pass, and verify directory parity.

