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

Run `scripts/summarize-test-report.mjs` with its default safe output. It reads every discovered non-symlink JSON/XML report within explicit limits of 10,000 files, 10,000 directories, 50,000 directory entries, 16 MiB per report, and 64 MiB aggregate input; files are opened without following the final symlink and read through the same bounded descriptor used for identity checks. JSON is preflighted at 200,000 structural tokens and 256 nesting levels before parsing. JUnit is parsed in one forward pass with limits of 200,000 elements, 256 nesting levels, and 50,000 testcases. Empty inputs, resource truncation, structural-limit breaches, malformed or zero-signal JSON, structurally invalid or truncated JUnit XML, non-JUnit hierarchy, aggregate-count mismatches, unknown/conflicting testcase statuses, and XML with no testcase records set `incomplete: true`, produce a nonzero exit and require inspection instead of a false-green next action. Explicit JUnit failed/error statuses count as failures; not-run, pending, disabled, and skipped statuses count as skipped instead of passed.

The summary reports discovered/read/skipped counts, retains at most 100 failure and artifact details while reporting omitted-detail totals, and uses root-relative or basename-only report labels instead of exposing external absolute paths. Safe output strips terminal and bidirectional control characters and redacts common authorization headers, cookies, token/secret/password/key/session assignments, private-key blocks, JWTs, common GitHub/OpenAI/Anthropic/npm/PyPI/Hugging Face/GitLab/cloud/payment/chat token prefixes, and secret-bearing or one-time URL query values including signatures, credentials, and codes. It also redacts email addresses, SSNs, common phone formats, and home-directory usernames. Markdown fields are escaped after sanitization. Redaction is pattern-based and cannot identify every form of PII or sensitive business data, so review summaries before sharing them outside the authorized audience.

## Handoff Summary

Include what ran, what passed, what failed, where artifacts are, and what is blocked.

Use `assets/checklists/flaky-ci-triage.md` when failures repeat, retry, or differ across local and CI.
