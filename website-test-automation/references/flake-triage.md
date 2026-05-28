# Flaky Test Triage

Classify before fixing.

## Taxonomy

| Category | Signals | Common fixes |
| --- | --- | --- |
| Timing/async | Intermittent waits, race with UI/API | Web-first assertions, wait for specific response/state |
| Isolation | Passes alone, fails in suite | Unique data, cleanup, fixture isolation |
| Environment | Fails only in CI or one browser | Align viewport, fonts, deps, browser version |
| Infrastructure | Browser crashes, OOM, DNS, runner errors | Reduce parallelism, inspect machine logs |
| Data dependency | Fails when records already exist or missing | Seed controlled data, cleanup, idempotency |
| Selector fragility | UI changed, locator points wrong element | Role/label locators, stable test IDs |
| Product regression | App behavior changed | Confirm against PRD and source evidence |

## Evidence First

Use traces, screenshots, videos, console logs, network logs, and report output before editing tests.

## Triage Flow

1. Reproduce or summarize the failure from reports before editing code.
2. Classify the likely category and record confidence.
3. Check whether the failure is a product regression, test bug, data issue, or environment issue.
4. Fix the narrowest cause and rerun the specific failing case.
5. Broaden to the containing suite only after the focused case passes.

Use `assets/checklists/flaky-ci-triage.md` for repeatable handoff.
