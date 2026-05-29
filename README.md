# AI Website Test Automation Skill

[English](README.md) | [中文](README.zh-CN.md)

[![Validate](https://github.com/leosssvip-dot/AI-website-test-automation-skill/actions/workflows/validate.yml/badge.svg)](https://github.com/leosssvip-dot/AI-website-test-automation-skill/actions/workflows/validate.yml)
![version](https://img.shields.io/badge/version-v0.1.0-blue)
![tests](https://img.shields.io/badge/tests-33%20passing-brightgreen)
![readiness](https://img.shields.io/badge/readiness-89%2F100-0ea5e9)
![scope](https://img.shields.io/badge/scope-website%20QA%20automation-7c3aed)
![license](https://img.shields.io/badge/license-MIT-green)

Agent-ready QA automation planning and implementation for websites and web apps.

Repository: `leosssvip-dot/AI-website-test-automation-skill`

## What It Does

| Capability | What the agent can produce |
| --- | --- |
| Product and repo understanding | Product model from PRDs, plans, source code, routes, APIs, existing tests, reports, screenshots, Storybook, Figma, design tokens, and other design artifacts. |
| Source-backed test cases | P0/P1/P2 cases with source evidence, risk, priority, preconditions, steps, expected results, data needs, negative cases, assumptions, and unknowns. |
| Coverage analysis | Coverage matrix by workflow, risk, source status, automation layer, current coverage, gaps, and next action. |
| Automation strategy | Recommendation for API, component, browser smoke, durable E2E, visual, accessibility, performance smoke, security smoke, manual/live, or exploratory coverage. |
| Test implementation | Targeted automated tests using the repo's existing runner when possible: Playwright, Cypress, Selenium, WebdriverIO, Vitest, Testing Library, route tests, or project-specific scripts. |
| Test infrastructure | Durable-suite foundations: auth/session reuse, test data lifecycle, selector/test-id strategy, environment bootstrapping, and suite architecture. |
| AI-native techniques | Agent-driven exploratory crawl into cases, self-healing locators, AI-as-oracle for subjective/visual/copy/a11y judgment, and AI failure triage, with confidence and untrusted-input guardrails. |
| Browser evidence | Browser-agent smoke checks with screenshots, console/network notes, viewport coverage, mobile overflow checks, and scoped skip reasons. |
| CI and flaky triage | Failure summaries, retry signals, artifact review, flaky cause hypotheses, and concrete stabilization actions. |
| Provider/live governance | Safe plans for paid providers and live integrations with cost caps, test accounts, stop conditions, representative completion, callbacks/polling, storage evidence, and redaction. |
| Specialized quality checks | Visual, accessibility, performance, security-smoke, and design-mismatch checklists. |
| Readiness scoring | Eight-dimension maturity score plus explicit gaps and recommended next tests. |
| Test-case validation | Schema check on generated cases: required fields, valid enums, source evidence on P0/P1, and weak-case warnings. |

## Quick Install

Ask an AI coding agent to install it:

```text
Install this skill: https://github.com/leosssvip-dot/AI-website-test-automation-skill
```

Manual clone:

```bash
git clone https://github.com/leosssvip-dot/AI-website-test-automation-skill.git
cd AI-website-test-automation-skill
```

For agents that read files directly, point the agent at `website-test-automation/SKILL.md`.

For agents that support `SKILL.md`-style local skill discovery, copy the bundle into that agent's skill directory. Example for Codex-compatible local skills:

```bash
mkdir -p ~/.codex/skills
rsync -a --delete website-test-automation/ ~/.codex/skills/website-test-automation/
```

## Update

Ask an AI coding agent: `Update this skill: https://github.com/leosssvip-dot/AI-website-test-automation-skill`

Manual update for a cloned repo and Codex-compatible local skill install:

```bash
cd AI-website-test-automation-skill
git pull --ff-only
rsync -a --delete website-test-automation/ ~/.codex/skills/website-test-automation/
```

## Agent Compatibility

This is a portable file-based agent package: `SKILL.md` defines the core workflow, while `references/`, `assets/`, and `scripts/` provide the supporting material. Any coding agent with repository or file access can read and use it directly. Native auto-discovery depends on whether that agent supports `SKILL.md`-style skill packs; otherwise, invoke it by pointing the agent at this repository or the `website-test-automation/` folder.

## Quick Usage

Ask your coding agent to use this package:

```text
Use the website-test-automation skill package to inspect this repo, build a source-backed coverage matrix, generate P0/P1 test cases, choose automation layers, and implement the highest-value tests with evidence.
```

Common prompts:

```text
Use the website-test-automation skill package to review current website test coverage and recommend the next automated tests.
```

```text
Use the website-test-automation skill package to generate source-backed P0/P1/P2 test cases from the PRD, routes, APIs, UI code, existing tests, and design artifacts. Return a coverage matrix and identify assumptions or mismatches.
```

```text
Use the website-test-automation skill package to implement the top recommended tests in this repo's existing test runner. Keep the diff scoped and report commands, results, and evidence.
```

```text
Use the website-test-automation skill package to run a browser smoke pass for the main user workflows. Capture screenshots, console/network findings, responsive viewport notes, and any scoped skips.
```

```text
Use the website-test-automation skill package to triage these failing browser tests and identify flaky causes with evidence.
```

```text
Use the website-test-automation skill package to plan safe provider/live testing with cost caps, test accounts, stop conditions, representative completion evidence, and redaction rules.
```

```text
Use the website-test-automation skill package to add visual, accessibility, performance-smoke, and security-smoke checks for the highest-risk pages.
```

## Readiness Assessment

Public README score for `website-test-automation`:

| Dimension | Score | Notes |
| --- | ---: | --- |
| Product understanding | 88 | Strong product-model workflow; more public project examples would improve confidence. |
| Source-backed cases | 90 | Strong schema and evidence rules; broader real-world case samples are still useful. |
| Coverage matrix | 86 | Clear coverage model; needs more non-Next.js public validation. |
| Automation implementation | 82 | Templates cover major runners; target-repo adaptation is still required. |
| Browser-smoke evidence | 78 | Good evidence contract; not a managed browser infrastructure layer. |
| CI/flaky reporting | 80 | Useful triage model and report summarizer; not a full observability product. |
| Provider/live governance | 84 | Strong safety gates; real paid/live completion remains manual and explicit. |
| Specialized quality | 76 | Covers visual, accessibility, performance, and security smoke; not a full specialist platform. |

Overall calibrated score: `83/100`

Readiness band: `80-90 mature readiness candidate`

The internal helper reports raw `contractScore` separately from evidence-calibrated `overallScore`. This README uses a calibrated public-readiness score to avoid overclaiming before multiple public real-project case studies exist.

## Helper Scripts

```bash
node website-test-automation/scripts/detect-web-test-stack.mjs <repo>
node website-test-automation/scripts/route-inventory.mjs <repo>
node website-test-automation/scripts/score-test-readiness.mjs <repo-or-skill>
node website-test-automation/scripts/summarize-test-report.mjs <report>
node website-test-automation/scripts/validate-testcases.mjs <file-or-dir>
node website-test-automation/scripts/validate-skill.mjs website-test-automation
```

## Validate

```bash
npm run validate
node website-test-automation/scripts/score-test-readiness.mjs website-test-automation
```

## Scope

This skill focuses on website and web app QA automation. It is not a complete platform for native mobile, desktop apps, hardware testing, load testing, intrusive security testing, device-cloud orchestration, or full visual baseline management.

## Safety

Only test systems you own or are authorized to test. Redact secrets, tokens, cookies, PII, customer data, one-time IDs, raw provider payloads, and sensitive network responses from prompts, reports, logs, screenshots, and PRs.

## Contributing And Security

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution scope and [SECURITY.md](SECURITY.md) for responsible disclosure and testing boundaries.

## License

MIT. See [LICENSE](LICENSE).
