# Open Source Preflight

## Status

Done

## Goal

Resolve the remaining public-release preparation issues before making the GitHub repository public.

## Scope

- Generalize README install and compatibility wording beyond one agent runtime.
- Add public package metadata.
- Add public GitHub repository description.
- Add concise contribution and security guidance.
- Remove near-term GitHub Actions Node 20 deprecation warnings.
- Generalize skill trigger metadata beyond one agent runtime.
- Verify the repo and installed local skill copy remain valid after the public-surface updates.

## Risk Tier

Tier 1: documentation and package metadata.

## Acceptance Criteria

- README files explain direct file-based agent use and keep Codex-compatible installation only as an example.
- `package.json` no longer marks the project private and includes repository, issue, homepage, description, and keyword metadata.
- GitHub repository description is set.
- GitHub Actions validation workflow uses current `actions/checkout@v6`, `actions/setup-node@v6`, and Node 24.
- Root contribution and security docs exist with clear scope and redaction boundaries.
- Validation passes.

## Verification Result

- `README.md` and `README.zh-CN.md` now explain direct file-based agent use and keep Codex-compatible local skill installation only as an example.
- `package.json` no longer includes `"private": true` and now includes description, repository, bugs, homepage, and keywords metadata.
- `CONTRIBUTING.md` and `SECURITY.md` were added with contribution scope, validation expectations, responsible disclosure, authorization, cost-control, and redaction boundaries.
- `website-test-automation/SKILL.md` trigger metadata now says "AI coding agent" instead of making the skill sound Codex-only.
- GitHub repository description is `Agent-ready website QA automation skill for source-backed test planning, coverage, and implementation`.
- GitHub repository visibility remains `PRIVATE` until the owner explicitly makes it public.
- GitHub Actions validation workflow was upgraded from `actions/checkout@v4` and `actions/setup-node@v4` on Node 20 to `actions/checkout@v6`, `actions/setup-node@v6`, and Node 24 after GitHub reported the Node 20 action-runtime deprecation warning.
- The installed local copy was synced to `/Users/chenyang/.codex/skills/website-test-automation`.
- `npm run validate` passed 21 repository tests and workflow validation.
- `git diff --check` passed.
- `quick_validate.py website-test-automation` returned `Skill is valid!`.
- Installed copy validation passed: `node /Users/chenyang/.codex/skills/website-test-automation/scripts/validate-skill.mjs /Users/chenyang/.codex/skills/website-test-automation` returned `Skill validation passed.`
- Source and installed skill directories match: `diff -qr website-test-automation /Users/chenyang/.codex/skills/website-test-automation` produced no differences.
- Internal readiness score still returns `overallScore: 100`, `level: 80-90 mature readiness candidate`, and eight dimensions.

## Final Outcome

Done. The repository public surface is now more agent-neutral, package and GitHub metadata are ready for a public GitHub project, contribution/security guidance exists, CI is on current GitHub Actions/Node versions, and validation passes. The GitHub repository is still private until the owner explicitly makes it public.
