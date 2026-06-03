# Backend, Service, And Library Testing

Use this when the target is not only a rendered web UI — it is the API service, backend job, CLI, SDK, or shared library that a web product depends on, or a standalone non-UI codebase. The skill's discipline is the same everywhere: build a product model, write source-backed cases, run the disposition gate, prefer the cheapest sufficient layer, and report evidence. Only the browser adapters are web-specific; the case, coverage, quality, and triage models are language- and surface-agnostic.

Prefer the repo's existing runner for the language (Vitest/Jest, pytest, go test, JUnit, RSpec, cargo test, etc.) exactly as the web workflow prefers the existing web runner ([automation-selection.md](automation-selection.md), [test-infrastructure.md](test-infrastructure.md)).

## Surface Guidance

| Surface | Test at the boundary | Key assertions |
| --- | --- | --- |
| HTTP/API service | Request/response and persisted state | status, body shape, error contract, auth, idempotency, state read-back ([api-contract-testing.md](api-contract-testing.md)) |
| Background job / queue / cron | Enqueue → process → terminal state | job reaches done/failed correctly, idempotent on retry, dead-letter on poison input, no duplicate side effects |
| Event / webhook consumer | Inbound event handling | signature/auth verification, idempotency on replay, ordering tolerance, malformed-payload rejection |
| CLI / script | Process invocation | exit code per outcome, stdout/stderr contract, flag/arg parsing, file/system effects, safe reruns |
| Library / SDK | Public API surface | documented inputs/outputs, type/contract correctness, error/exception behavior, backward compatibility and semver |
| Scheduled / batch pipeline | Input set → output set | completeness, idempotency, partial-failure handling, no silent data loss |

## Shared Rules

- Test the contract at the boundary, not the private internals: assert observable behavior so refactors do not break tests for no reason.
- Verify state and side effects, not just return values — a function can return success while persisting nothing ([api-contract-testing.md](api-contract-testing.md)).
- Cover failure and boundary paths: invalid input, missing dependency, timeout, partial failure, retry, and concurrency where it applies.
- Keep determinism and isolation: own your data, control time/randomness/clock where the code allows, and make reruns safe ([test-quality.md](test-quality.md)).
- Mock third-party and paid dependencies; gate any real external completion behind authorization and cost controls ([provider-live-testing.md](provider-live-testing.md)).
- Apply the human-reasonableness lens to non-UI surfaces too: confusing error messages, unsafe defaults, and irreversible operations are product-logic risks even without a screen ([human-reasonableness.md](human-reasonableness.md)).

## Scope Honesty

This guidance covers the server-side, job, CLI, and library layers of software products. It is still not a substitute for a native mobile/desktop UI automation platform, hardware-in-the-loop testing, or dedicated load/performance benchmarking. When a request needs one of those, say so and scope the part this skill can cover ([readiness-model.md](readiness-model.md)).
