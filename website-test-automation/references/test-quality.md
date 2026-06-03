# Test Quality

A passing test is not automatically a good test. Use this when authoring or reviewing automated tests to judge whether each one would actually catch the regression it exists to prevent. A suite full of weak tests gives false confidence — worse than no test, because it discourages the real one.

## A Test Is Only As Strong As Its Assertion

- Assert the specific expected value or state, not merely that "something happened" or "no error was thrown".
- Reject tautologies: a test that mocks the function under test, or asserts a constant it just set, proves nothing.
- Prefer one clear behavioral assertion per case over many shallow ones; name the test by the behavior it pins.
- Avoid asserting only on incidental output (a log line, an internal call count) when the user-visible effect is what matters.

## The Mutation-Test Mindset

You rarely need a mutation-testing tool to apply its core question: **if the implementation were subtly wrong, would this test fail?**

- Mentally flip a condition, off-by-one, or returned value and check the test would catch it. If it would still pass, the assertion is too weak.
- Watch for tests that pass against an empty or stubbed implementation — they assert nothing real.
- For critical logic (auth, money, permissions, data integrity), prefer at least one assertion that fails loudly on the most likely wrong behavior.

## Over-Mocking

- Mock third-party dependencies and slow boundaries; do not mock the unit under test or you are testing the mock.
- An over-mocked test passes even when the real integration is broken. Keep at least one test that exercises the real wiring (route + handler + state) for each critical path.
- When a mock encodes an assumption about an external contract, pair it with a contract test so the assumption is verified ([api-contract-testing.md](api-contract-testing.md)).

## Coverage Is A Map, Not A Score

- Line/branch coverage shows what code ran, not what behavior was verified. 100% coverage with weak assertions still misses bugs.
- Use coverage to find untested branches and error paths, then write behavior-driven cases for them — do not chase a percentage.
- Prioritize coverage of high-risk areas (auth, payments, data lifecycle, permissions) over uniform coverage everywhere.

## Determinism And Independence

- A test that is flaky by design (depends on timing, order, shared mutable data, or wall-clock) is a low-quality test even when green. Fix the determinism or keep it manual ([flake-triage.md](flake-triage.md), [test-infrastructure.md](test-infrastructure.md)).
- Each test must set up and tear down its own state and pass when run alone, in any order, and in parallel.
- No assertion logic hidden in shared helpers; the failure message should point straight at the intended behavior.

## Review Questions

Before landing a test, confirm:

- Does it map to a source-backed case ID and a real risk?
- Would it fail if the behavior regressed? (mutation mindset)
- Is the assertion specific and behavioral, not "truthy"/"no throw"?
- Is it deterministic and isolated?
- Does it avoid mocking the thing it claims to test?
- Does it add confidence a cheaper existing test does not already provide ([automation-implementation.md](automation-implementation.md))?
