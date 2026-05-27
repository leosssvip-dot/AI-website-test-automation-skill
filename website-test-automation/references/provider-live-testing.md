# Provider And Paid Live Testing

Use this reference when a website flow touches paid AI providers, payments, credits, subscriptions, external webhooks, metered APIs, storage callbacks, or other live services that cost money or expose sensitive payloads.

## Policy

- Test disabled and unconfigured paths first; paid/provider features must fail closed with honest UI or API errors.
- Require an explicit live-test scope before spending money or calling real providers.
- Record a cost cap, test account, allowed routes, allowed provider operations, and stop condition.
- Prefer payload and contract coverage across all routes, with representative live completion only for each distinct backend contract family.
- Do not require full provider completion for every preset when presets share the same endpoint and payload contract.
- Keep mocked API/component tests as durable regression; keep real provider completion as gated manual/live evidence unless the project already has safe CI secrets and cost controls.
- Redact raw provider payloads, callbacks, cookies, headers, env values, customer identifiers, one-time IDs, and full external object keys from evidence.

## Evidence Checklist

- Disabled-path result: status code, user-visible state, or concise error.
- Cost control: cap, test user, provider operation, stop condition.
- Submit evidence: route, method, safe payload summary, status, safe task/id prefix if needed.
- Callback or polling evidence: provider status transition, callback receipt or polling reconciliation, persistence result, and refund/credit handling.
- Storage evidence: safe object prefix or asset state, never raw credentials or full private keys.
- Failure evidence: provider failure path, retry/idempotence behavior, compensation/refund behavior.
- Redaction note: confirm sensitive payloads and identifiers were omitted.

## Automation Boundary

Automate:

- Disabled/unconfigured provider behavior.
- Request schema validation.
- Credit reserve/refund logic with mocks.
- Webhook signature, idempotence, and state-transition handling with fixtures.
- UI states for gated tools.

Keep manual or gated-live:

- Real paid provider completion.
- Real payment processor webhook delivery.
- End-to-end callback URL validation in a public environment.
- Generated media quality, model quality, latency variance, and subjective output review.
