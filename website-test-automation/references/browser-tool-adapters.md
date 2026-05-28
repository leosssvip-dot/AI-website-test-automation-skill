# Browser Tool Adapters

Choose browser tooling by capability, not brand. Playwright is one adapter family, not the skill center.

## Capability Model

- Navigate.
- Accessibility snapshot.
- Role or label locator support.
- Click, fill, select, keyboard, upload.
- Screenshot.
- Console logs.
- Network logs.
- Trace.
- Video.
- Auth state or profile reuse.
- Device emulation.
- Test code generation.
- CI runner.

## Adapter Profiles

| Adapter family | Best for | Limits |
| --- | --- | --- |
| Codex Browser | Local dev URL smoke, screenshots, DOM checks, console/network summaries, quick route verification inside Codex | Not a durable CI runner by itself |
| Chrome | Real user profile/session, OAuth, magic links, cookies, browser extensions, authenticated remote/live flows | Profile data must be handled carefully and evidence must be redacted |
| Computer Use | Native dialogs, OS-level file pickers, desktop auth prompts, or browser situations unavailable to browser-specific tools | Slower and less deterministic than direct browser tooling |
| Chrome DevTools MCP | Console, network, performance, CDP diagnostics, request inspection, storage and runtime debugging | Not a full test framework by itself |
| Playwright MCP/CLI | Structured browser control, snapshots, test generation | Availability depends on environment |
| Playwright runner | Durable CI regression, traces, screenshots, cross-browser projects | Should not replace an existing runner without reason |
| Claude Code browser workflows | Agent-side exploration when available | Tool capabilities vary by setup |
| Cypress | Existing Cypress suites and app-driven tests | Browser and multi-tab constraints |
| Selenium/WebDriver | Legacy or cross-language suites | More selector and wait discipline needed |
| WebdriverIO | Existing WDIO suites and service ecosystem | Project-specific config can be complex |

## Selection Algorithm

1. Start with the user's request and available tools.
2. Prefer logged-in/profile tools for profile-dependent flows.
3. Prefer CDP/DevTools tools for console, network, performance, and CDP debugging.
4. Prefer the project runner for durable CI tests.
5. Prefer browser-agent tools for exploration, smoke checks, and screenshots.
6. Prefer existing stack before adding a new runner.
7. Record the adapter choice and why alternatives were not used.

## Anti-Pattern Guardrail

Do not choose Playwright by habit. If the repo already covers the behavior with Vitest, Testing Library, Cypress, Selenium, WebdriverIO, or route-handler tests, keep durable regression coverage in that stack and use Codex Browser, Chrome, Computer Use, or Chrome DevTools MCP only for the browser evidence those tools uniquely provide.

Example: for a review-only request on a Next.js app with Vitest route tests and React Testing Library coverage, recommend API/component regression for contracts, Codex Browser for local screenshot and network-negative smoke, Chrome for real authenticated/live profile checks, and Playwright runner only if the user selects cases for durable scripted browser regression.

For complete automation landing, include at least one browser-smoke evidence item or an explicit scoped-skip reason. Use `assets/checklists/browser-smoke-evidence.md` when the evidence has more than one browser observation.
