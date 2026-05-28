# Design Source Adapters

Use this when product evidence comes from design tools, design systems, visual artifacts, prototypes, or exported specs rather than only PRDs and source code.

## Source Types

| Source | Extract | Testing use |
| --- | --- | --- |
| Figma | frames, variants, prototypes, component states, annotations, tokens | workflows, visual states, responsive cases, interaction expectations |
| Lanhu / 蓝湖 | specs, measurements, assets, annotations, page flows | acceptance criteria, visual checks, spacing/color assertions, implementation mismatch |
| MasterGo | components, design-system tokens, variants, prototypes | component coverage, token checks, state matrix, responsive cases |
| MockingBot / 摹客 | prototypes, screen flows, interactions, comments | journey tests, navigation assertions, alternate-path cases |
| Sketch | artboards, symbols, exported specs, tokens | layout states, reusable component behavior, visual baselines |
| Zeplin | specs, assets, style guide, screen notes | visual acceptance, design tokens, implementation comparisons |
| Storybook | stories, controls, args, accessibility add-ons, visual snapshots | component tests, state matrix, regression candidates |
| Screenshots | current UI, competitor references, bug evidence | observed behavior, visual regression seed, mismatch evidence |
| Videos | walkthroughs, bug recordings, prototype interactions | user journey steps, timing/animation observations, flaky reproduction notes |
| Design tokens | colors, typography, spacing, radius, shadows, motion | style assertions, theme coverage, design-system drift checks |

## Conversion Flow

1. Identify source status: `documented` for explicit specs, `observed` for screenshots/videos, `inferred` for naming or visual structure, `mismatch` when design and implementation disagree.
2. Extract workflows, screens, component states, empty/loading/error/success/permission states, breakpoints, tokens, and interaction rules.
3. Map design evidence into the coverage matrix by product area, workflow, component, viewport, state, risk, and source link/path.
4. Generate test cases only where expected behavior is explicit enough. Otherwise create mismatch notes or exploratory checks.
5. Choose automation layer: component tests for variants, browser tests for journeys, visual checks for layout/token drift, accessibility checks for role/focus/label behavior.

## Evidence Rules

- Cite design source names, frame/story names, screenshot/video paths, exported spec files, or token files.
- Do not copy private design content into chat when it contains customer data, unreleased strategy, credentials, or PII.
- Treat design artifacts as requirements evidence, not runtime proof. Verify implementation against code or browser evidence before claiming current behavior.
- Keep design mismatch visible until product/design decides whether code or design is authoritative.

## Output Mapping

- Product model: personas, journeys, components, states, breakpoints, constraints.
- Test cases: source evidence, state, viewport, expected result, visual/a11y/performance/security notes.
- Coverage matrix: design coverage, implementation coverage, current tests, gap or decision needed.
- Readiness score: design-source coverage strengthens product understanding, source-backed cases, coverage matrix, browser-smoke evidence, and specialized quality.
