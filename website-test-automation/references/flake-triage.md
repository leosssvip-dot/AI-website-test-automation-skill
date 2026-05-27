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

