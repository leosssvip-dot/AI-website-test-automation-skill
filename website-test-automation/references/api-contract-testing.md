# API And Contract Testing

Use this when the behavior under test lives in an API, route handler, or service boundary rather than in the rendered UI. API/route tests are usually the cheapest layer that proves backend behavior — prefer them over E2E when no browser-specific concern is involved ([automation-selection.md](automation-selection.md)). For auth/session reuse and test-data lifecycle, see [test-infrastructure.md](test-infrastructure.md); this reference covers the contract and state assertions themselves.

## What To Assert

- Status code for each outcome: success, validation error, unauthorized, forbidden, not found, conflict, rate limit.
- Response body shape: required fields, types, enums, nullability, and that no secret or internal field leaks.
- Error contract: a consistent, documented error shape — not a raw stack trace or HTML error page.
- Headers that carry contract meaning: content type, caching, pagination, location on create, auth challenges.
- Idempotency and side effects: a retried or duplicate request must not double-charge, double-create, or corrupt state.
- Pagination, filtering, sorting, and limits behave at boundaries (empty, one page, last page, over-limit).

## State Verification

A 2xx response is not proof the work happened. Verify the persisted effect, not just the reply.

- After a create/update/delete, read the state back (API GET, DB query, or the next call) and assert it changed as expected.
- Assert negative state too: a rejected request must leave no partial row, orphaned record, or half-applied change.
- For async/eventual flows, wait on the real terminal state (status field, callback, queue drain) rather than a fixed sleep.
- Keep state assertions deterministic: own the data, use unique values, and reset or namespace per run ([test-infrastructure.md](test-infrastructure.md)).

## Contract Stability

- When a schema/OpenAPI/GraphQL spec exists, validate responses against it so drift is caught automatically; treat spec-vs-implementation conflicts as a `mismatch` ([product-understanding.md](product-understanding.md)).
- For consumer/provider boundaries (separately deployed services, public APIs, webhooks), consider consumer-driven contract tests (e.g. Pact-style) so a provider change that breaks a consumer fails before release.
- Guard backward compatibility: adding optional fields is safe; removing/renaming fields or tightening types is a breaking change and needs an explicit case.
- Pin the contract version under test and record it in evidence.

## Auth And Authorization At The API

- Test the endpoint, not just the UI guard: an unauthenticated or wrong-role request must be rejected at the API even if the UI hides the control.
- Cover IDOR-style access: user A must not read or mutate user B's resource by guessing an ID ([visual-a11y-performance-security.md](visual-a11y-performance-security.md)).
- Verify that disabled/expired/insufficient-scope tokens fail closed.

## Boundary With Live Providers

When a route dispatches to a paid provider, payment processor, or external webhook, keep contract/schema coverage durable with mocks and gate real completion behind authorization and cost controls ([provider-live-testing.md](provider-live-testing.md)).

## Evidence

Record the request method/route, a redacted payload summary, the asserted status and body shape, the state read-back, the contract version, and the command output. Redact tokens, customer data, and raw payloads.
