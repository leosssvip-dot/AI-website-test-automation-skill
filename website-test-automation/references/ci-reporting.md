# CI Reporting

CI evidence should make failures actionable.

## Capture

- Command and exit status.
- Report path.
- Screenshots, traces, videos, logs, and coverage matrix deltas.
- Failing test names and first failing step.
- Retry/flaky signals when available.
- Runner version, browser version, project shard, retries, parallelism, and environment notes when available.
- Artifact retention path and whether artifacts are attached to CI.

## Redaction

Redact tokens, cookies, passwords, customer data, one-time IDs, raw payloads, and PII from chat, docs, reports, and screenshots.

## Handoff Summary

Include what ran, what passed, what failed, where artifacts are, and what is blocked.

Use `assets/checklists/flaky-ci-triage.md` when failures repeat, retry, or differ across local and CI.
