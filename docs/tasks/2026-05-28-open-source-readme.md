# Open Source README Preparation

## Status

Done

## Goal

Rename the GitHub repository to `AI-website-test-automation-skill`, align local references, and draft a concise bilingual README for open-source preparation.

## Scope

- Rename the GitHub repository metadata.
- Update local `origin` to the renamed repository URL.
- Add a root `README.md` with English and Chinese usage guidance.
- Include the current eight-dimension readiness score.
- Keep the README honest about website/web-app scope and limits.

## Risk Tier

Tier 1: repository metadata and documentation.

## Acceptance Criteria

- GitHub repository resolves as `leosssvip-dot/AI-website-test-automation-skill`.
- Local `origin` uses `https://github.com/leosssvip-dot/AI-website-test-automation-skill.git`.
- Root README includes bilingual overview, concise usage, helper scripts, validation commands, scope, and safety notes.
- Old GitHub repository name is not used as the current project URL in docs.
- Repository validation passes after the documentation update.

## Verification Result

- GitHub repository resolves as `leosssvip-dot/AI-website-test-automation-skill` with URL `https://github.com/leosssvip-dot/AI-website-test-automation-skill` and visibility `PRIVATE`.
- Local `origin` is `https://github.com/leosssvip-dot/AI-website-test-automation-skill.git` for fetch and push.
- Project package name is `ai-website-test-automation-skill`.
- Root `README.md` includes bilingual overview, install, usage prompts, readiness score table, helper scripts, validation commands, scope, safety, and license note.
- Stale GitHub repository name search returned no current repo-doc matches.
- `npm run validate` passed 21 repository tests and workflow validation.
- `git diff --check` passed.
- `node website-test-automation/scripts/score-test-readiness.mjs website-test-automation` returned `overallScore: 100`, `level: 80-90 mature readiness candidate`, and eight dimensions at `100`.

## Final Outcome

Done. The GitHub repository name, local remote, package name, current docs references, and bilingual open-source README now use `AI-website-test-automation-skill`.
