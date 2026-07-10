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

Run `scripts/summarize-test-report.mjs` with its default safe output. It reads every discovered non-symlink JSON/XML report, reports discovered/read/skipped counts, retains at most 100 failure and artifact details while reporting omitted-detail totals, redacts common authorization headers, cookies, token/secret/password assignments, and secret-bearing URL query values, and escapes untrusted Markdown fields. Redaction is pattern-based and cannot identify every form of PII or sensitive business data, so review summaries before sharing them outside the authorized audience.

## Handoff Summary

Include what ran, what passed, what failed, where artifacts are, and what is blocked.

Use `assets/checklists/flaky-ci-triage.md` when failures repeat, retry, or differ across local and CI.
