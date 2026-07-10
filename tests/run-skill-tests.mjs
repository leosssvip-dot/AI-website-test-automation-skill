#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const skillRoot = path.join(repoRoot, 'website-test-automation');

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result.stdout.trim();
}

function runRaw(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options,
  });
}

function runJson(command, args) {
  return JSON.parse(run(command, args));
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

test('skill package validator passes', () => {
  const output = run('node', ['website-test-automation/scripts/validate-skill.mjs', skillRoot]);
  assert.match(output, /Skill validation passed/);
});

test('skill package validator rejects trigger and adapter drift', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-drift-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  fs.writeFileSync(
    path.join(fixture, 'SKILL.md'),
    fs.readFileSync(path.join(fixture, 'SKILL.md'), 'utf8').replace(/design artifacts, Figma, Storybook, design tokens, /, ''),
  );
  fs.writeFileSync(
    path.join(fixture, 'references', 'output-templates.md'),
    fs.readFileSync(path.join(fixture, 'references', 'output-templates.md'), 'utf8').replace(/- Claude Code browser workflows:\n/, ''),
  );

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /design artifacts|Claude Code browser workflows/i);
});

test('skill package validator rejects workflow order drift', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-order-drift-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  const skill = fs.readFileSync(path.join(fixture, 'SKILL.md'), 'utf8');
  fs.writeFileSync(
    path.join(fixture, 'SKILL.md'),
    skill.replace(
      '7. Build or update coverage with [coverage-matrix.md](references/coverage-matrix.md).\n8. Run the Post-Test-Case Disposition Gate from [scenario-workflows.md](references/scenario-workflows.md).',
      '7. Run the Post-Test-Case Disposition Gate from [scenario-workflows.md](references/scenario-workflows.md).\n8. Build or update coverage with [coverage-matrix.md](references/coverage-matrix.md).',
    ),
  );

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /cases before coverage/i);
});

test('skill package validator rejects missing human reasonableness contract', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-human-drift-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  fs.rmSync(path.join(fixture, 'references', 'human-reasonableness.md'), { force: true });

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /human-reasonableness|Human Reasonableness/i);
});

test('skill package validator does not execute candidate scripts by default', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-static-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  const helperMarker = path.join(fixture, 'candidate-helper-executed');
  const scorerMarker = path.join(fixture, 'candidate-scorer-executed');
  fs.writeFileSync(
    path.join(fixture, 'scripts', 'detect-web-test-stack.mjs'),
    [
      "import fs from 'node:fs';",
      `fs.writeFileSync(${JSON.stringify(helperMarker)}, 'executed');`,
      "console.log('candidate helper ran');",
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(fixture, 'scripts', 'score-test-readiness.mjs'),
    [
      "import fs from 'node:fs';",
      `fs.writeFileSync(${JSON.stringify(scorerMarker)}, 'executed');`,
      "console.log(JSON.stringify({ dimensionCount: 8, overallScore: 100 }));",
    ].join('\n'),
  );

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.equal(result.status, 0, `expected static validation to pass\n${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(helperMarker), false, 'candidate helper script must not execute during validation');
  assert.equal(fs.existsSync(scorerMarker), false, 'candidate scorer must not execute during validation');
});

test('skill package validator rejects symlinked required files before reading them', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-symlink-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  fs.rmSync(path.join(fixture, 'SKILL.md'));
  fs.symlinkSync(path.join(skillRoot, 'SKILL.md'), path.join(fixture, 'SKILL.md'));

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /SKILL\.md.*symbolic link|symbolic link.*SKILL\.md/i);
});

test('skill package validator rejects oversized required files before reading them', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-oversized-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  fs.truncateSync(path.join(fixture, 'assets', 'readiness-score-template.md'), 3 * 1024 * 1024);

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /readiness-score-template\.md.*size limit|size limit.*readiness-score-template\.md/i);
});

test('skill package validator rejects candidate script syntax errors', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-syntax-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  fs.writeFileSync(path.join(fixture, 'scripts', 'detect-web-test-stack.mjs'), 'export const = broken;');

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /syntax check failed.*detect-web-test-stack\.mjs/i);
});

test('repository helper scripts expose their own help contracts', () => {
  for (const script of [
    'detect-web-test-stack.mjs',
    'route-inventory.mjs',
    'summarize-test-report.mjs',
    'score-test-readiness.mjs',
    'validate-testcases.mjs',
    'export-testcases.mjs',
    'validate-skill.mjs',
  ]) {
    const result = runRaw('node', [path.join(skillRoot, 'scripts', script), '--help']);
    assert.equal(result.status, 0, `${script} --help failed\n${result.stdout}\n${result.stderr}`);
  }
});

test('skill metadata and workflow expose design-source triggers', () => {
  const skill = read('website-test-automation/SKILL.md');
  const description = skill.match(/^---\n[\s\S]*?description:\s*(.+)\n---/)?.[1] || '';
  for (const phrase of ['design artifacts', 'Figma', 'Storybook', 'design tokens']) {
    assert.match(description, new RegExp(phrase, 'i'));
  }
  for (const phrase of ['MasterGo', 'MockingBot', 'Sketch', 'Zeplin', 'prototypes']) {
    assert.match(skill, new RegExp(phrase, 'i'));
  }
});

test('workflow constraints require post-case disposition and scenario paths', () => {
  const skill = read('website-test-automation/SKILL.md');
  assert.match(skill, /scenario-workflows\.md/i);

  const workflow = read('website-test-automation/references/workflow.md');
  const scenarios = read('website-test-automation/references/scenario-workflows.md');
  for (const phrase of [
    'Post-Test-Case Disposition Gate',
    'case disposition',
    'Response-only review',
    'Automation landing',
    'Browser smoke',
    'Failure/flaky triage',
    'Provider/live testing',
    'Specialized quality',
    'Readiness audit',
  ]) {
    assert.match(`${workflow}\n${scenarios}`, new RegExp(phrase, 'i'));
  }
});

test('main workflow orders coverage before post-case disposition', () => {
  const skill = read('website-test-automation/SKILL.md');
  const workflow = skill.split('## Workflow')[1].split('## Tooling Helpers')[0];
  const steps = workflow.split('\n').filter((line) => /^\d+\./.test(line));
  const indexOf = (phrase) => steps.findIndex((line) => line.includes(phrase));

  const productModel = indexOf('Build a product model');
  const humanReview = indexOf('Run the Human Reasonableness Review Gate');
  const cases = indexOf('Write source-backed test cases');
  const coverage = indexOf('Build or update coverage');
  const disposition = indexOf('Post-Test-Case Disposition Gate');
  const automation = indexOf('Choose an automation target');

  assert.equal(productModel >= 0, true);
  assert.equal(humanReview >= 0, true);
  assert.equal(cases >= 0, true);
  assert.equal(coverage >= 0, true);
  assert.equal(disposition >= 0, true);
  assert.equal(automation >= 0, true);
  assert.equal(productModel < humanReview, true);
  assert.equal(humanReview < cases, true);
  assert.equal(cases < coverage, true);
  assert.equal(coverage < disposition, true);
  assert.equal(disposition < automation, true);
});

test('human reasonableness gate is first-class and schema-backed', () => {
  const skill = read('website-test-automation/SKILL.md');
  const workflow = read('website-test-automation/references/workflow.md');
  const scenarios = read('website-test-automation/references/scenario-workflows.md');
  const authoring = read('website-test-automation/references/test-case-authoring.md');
  const schema = read('website-test-automation/references/testcase-schema.md');
  const template = read('website-test-automation/assets/testcase-template.yaml');
  const outputTemplates = read('website-test-automation/references/output-templates.md');
  const human = read('website-test-automation/references/human-reasonableness.md');

  for (const phrase of [
    'Human Reasonableness Review Gate',
    'human expectation',
    'documented expectation',
    'observed behavior',
    'logic findings ledger',
    'first-time user',
    'returning user',
    'mistake-prone user',
    'human-logic-risk',
  ]) {
    assert.match(`${skill}\n${workflow}\n${scenarios}\n${authoring}\n${human}`, new RegExp(phrase, 'i'));
  }

  for (const phrase of ['human_expectation:', 'why_unreasonable:', 'logic_risk:', 'suggested_product_fix:']) {
    assert.match(schema, new RegExp(phrase));
    assert.match(template, new RegExp(phrase));
    assert.match(outputTemplates, new RegExp(phrase));
  }
});

test('skill references and templates cover automation implementation', () => {
  const requiredFiles = [
    'website-test-automation/references/automation-implementation.md',
    'website-test-automation/references/readiness-model.md',
    'website-test-automation/references/design-source-adapters.md',
    'website-test-automation/references/provider-live-testing.md',
    'website-test-automation/assets/readiness-score-template.md',
    'website-test-automation/assets/checklists/browser-smoke-evidence.md',
    'website-test-automation/assets/checklists/flaky-ci-triage.md',
    'website-test-automation/assets/checklists/provider-live-test-plan.md',
    'website-test-automation/assets/checklists/specialized-quality-checklist.md',
    'website-test-automation/assets/automation-templates/playwright.spec.ts',
    'website-test-automation/assets/automation-templates/cypress.cy.ts',
    'website-test-automation/assets/automation-templates/vitest-route.test.ts',
    'website-test-automation/assets/automation-templates/testing-library.test.tsx',
    'website-test-automation/assets/automation-templates/selenium.test.js',
    'website-test-automation/assets/automation-templates/webdriverio.e2e.js',
  ];
  for (const rel of requiredFiles) assert.equal(exists(rel), true, `${rel} should exist`);

  const implementation = read('website-test-automation/references/automation-implementation.md');
  for (const phrase of [
    'file placement',
    'fixtures',
    'deterministic assertions',
    'browser-agent smoke evidence',
    'scoped-skip reason',
    'Runner',
    'Code Review Checklist',
  ]) {
    assert.match(implementation, new RegExp(phrase, 'i'));
  }

  const schema = read('website-test-automation/references/testcase-schema.md');
  assert.match(schema, /source_status/);
  assert.match(schema, /mismatch/);
});

test('design-source adapters cover common product and design artifact modes', () => {
  const adapters = read('website-test-automation/references/design-source-adapters.md');
  for (const phrase of [
    'Figma',
    'Lanhu',
    '蓝湖',
    'MasterGo',
    'MockingBot',
    '摹客',
    'Sketch',
    'Zeplin',
    'Storybook',
    'design tokens',
    'screenshots',
    'videos',
    'design mismatch',
  ]) {
    assert.match(adapters, new RegExp(phrase, 'i'));
  }
  assert.match(adapters, /test cases/i);
  assert.match(adapters, /coverage matrix/i);
});

test('product understanding ranks design platforms as requirements sources', () => {
  const productUnderstanding = read('website-test-automation/references/product-understanding.md');
  for (const phrase of ['Figma', 'Lanhu', 'MasterGo', 'Storybook', 'screenshots', 'design-source-adapters.md']) {
    assert.match(productUnderstanding, new RegExp(phrase, 'i'));
  }
});

test('browser adapter guidance names Codex, DevTools, and Claude Code capabilities', () => {
  const adapters = read('website-test-automation/references/browser-tool-adapters.md');
  for (const phrase of [
    'Codex Browser',
    'Chrome DevTools MCP',
    'Claude Code browser workflows',
    'console',
    'network',
    'accessibility snapshot',
    'profile/session',
    'tool capabilities vary by setup',
  ]) {
    assert.match(adapters, new RegExp(phrase, 'i'));
  }
});

test('readiness scorer rates the skill across major testing workstreams', () => {
  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', 'website-test-automation']);
  assert.equal(result.dimensionCount, 8);
  assert.equal(result.dimensions.every((dimension) => dimension.score >= 80), true);
  assert.equal(result.contractScore >= 80, true);
  assert.equal(result.overallScore, 89);
  assert.match(result.level, /80-90/);
  assert.equal(result.evidenceCalibration.hasProvenRealProjectEvidence, false);
  for (const key of [
    'product-understanding',
    'source-backed-cases',
    'coverage-matrix',
    'automation-implementation',
    'browser-smoke-evidence',
    'ci-flaky-reporting',
    'provider-live-governance',
    'specialized-quality',
  ]) {
    assert.equal(result.dimensions.some((dimension) => dimension.key === key), true);
  }
});

test('readiness scorer identifies weak empty targets', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-empty-'));
  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
  assert.equal(result.overallScore < 50, true);
  assert.equal(result.gaps.length > 0, true);
});

test('readiness scorer recognizes task-record based real-project QA packages', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-real-project-'));
  fs.mkdirSync(path.join(fixture, 'docs', 'tasks'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'tests', 'api'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'tests', 'workspace'), { recursive: true });
  fs.writeFileSync(
    path.join(fixture, 'AGENTS.md'),
    [
      '# Project Agent Rules',
      'Build from personas, workflows, entities, states, permissions, and route evidence.',
      'Mobile pages must not horizontally overflow.',
      'Provider features require live evidence approval, a cost cap, a test account, and a stop condition.',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(fixture, 'docs', 'DEVELOPMENT_PLAN.md'),
    [
      '# Development Plan',
      'The creator loop includes generate, edit, export, and reuse workflows.',
      'Manual/live provider checks require representative completion, callback or polling evidence, redaction, refund or credit checks, and storage evidence.',
      'Visual, accessibility, performance, and security smoke checks cover viewport behavior, keyboard focus, role labels, and design mismatch risks.',
    ].join('\n'),
  );
  fs.writeFileSync(
    path.join(fixture, 'docs', 'tasks', '2026-05-27-website-test-automation-landing.md'),
    [
      '# Website Test Automation Landing',
      '## Product Model Summary',
      '- documented: source-backed Product Model from roadmap and task records.',
      '- inferred: API handlers and UI components define current behavior.',
      '- observed: route inventory and browser screenshots provide runtime evidence.',
      '## Mismatches',
      '- source_status mismatch: workspace auth wording conflicts with current source.',
      '## Coverage Matrix Summary',
      '| Product area | Workflow | Source status | Layer | Priority | Current coverage and gap |',
      '| --- | --- | --- | --- | --- | --- |',
      '| auth/session | protected account routes | mismatch | Vitest unit | P0 | current coverage plus next action |',
      '| provider gates | paid generation disabled path | documented | RTL component | P0 | manual/live checks remain gated |',
      '## Generated Test Cases',
      '- id: TC-AUTH-001',
      '  source_evidence: AGENTS.md, middleware.ts, tests/auth/session.test.ts',
      '  priority: P0',
      '  risk: auth/session',
      '  preconditions: mocked session state',
      '  expected: protected routes redirect and public workspace remains public',
      '  negative_cases: unauthenticated access',
      '  data_needs: mocked user account',
      '  evidence: command output summary',
      '  assumptions: current workspace is public by design',
      '## Automated Tests Landed',
      '- TC-AUTH-001 mapped to tests/auth/session.test.ts with deterministic assertions and command evidence.',
      '## Browser Smoke Evidence',
      '- Browser screenshots captured for desktop and mobile.',
      '- Console errors: 0.',
      '- Mobile horizontal overflow: 0.',
      '- Scoped skip reason: no browser run for docs-only changes.',
      '## Verification Result',
      '- Vitest passed 3 files / 14 tests.',
      '- Failure artifacts expected: test output, screenshots, traces, and logs.',
    ].join('\n'),
  );
  fs.writeFileSync(path.join(fixture, 'tests', 'api', 'tasks-route.test.ts'), 'describe("tasks", () => {});');
  fs.writeFileSync(path.join(fixture, 'tests', 'api', 'downloads-route.test.ts'), 'describe("downloads", () => {});');
  fs.writeFileSync(path.join(fixture, 'tests', 'workspace', 'workspace-page.test.tsx'), 'describe("workspace", () => {});');

  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
  assert.equal(result.overallScore >= 70, true, `expected operational score, got ${result.overallScore}`);
  assert.equal(result.dimensions.find((dimension) => dimension.key === 'product-understanding')?.score >= 75, true);
  assert.equal(result.dimensions.find((dimension) => dimension.key === 'source-backed-cases')?.score >= 75, true);
  assert.equal(result.dimensions.find((dimension) => dimension.key === 'coverage-matrix')?.score >= 75, true);
  assert.equal(result.dimensions.find((dimension) => dimension.key === 'provider-live-governance')?.score >= 75, true);
});

test('detect-web-test-stack finds framework, runner, and scripts', () => {
  const result = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', 'tests/fixtures/auth-crud']);
  assert.equal(result.hasPackageJson, true);
  assert.equal(result.packageManager, 'unknown');
  assert.deepEqual(result.frameworks.sort(), ['nextjs', 'react']);
  assert.deepEqual(result.testFrameworks.sort(), ['playwright', 'vitest']);
  assert.equal(result.browserTools.includes('playwright-runner'), true);
  assert.equal(result.scripts.test, 'vitest');
  assert.equal(result.scripts['test:e2e'], 'playwright test');
});

test('detect-web-test-stack recognizes WebdriverIO packages and config', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'wdio-stack-'));
  fs.writeFileSync(
    path.join(fixture, 'package.json'),
    JSON.stringify({ devDependencies: { '@wdio/globals': '9.0.0' } }, null, 2),
  );
  fs.writeFileSync(path.join(fixture, 'wdio.conf.ts'), 'export const config = {};');

  const result = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', fixture]);
  assert.equal(result.testFrameworks.includes('webdriverio'), true);
  assert.equal(result.browserTools.includes('webdriverio'), true);
});

test('route-inventory discovers static and Next.js routes', () => {
  const simple = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', 'tests/fixtures/simple-site']);
  assert.equal(simple.routes.some((route) => route.route === '/'), true);
  assert.equal(simple.routes.some((route) => route.route === '/about'), true);

  const app = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', 'tests/fixtures/auth-crud']);
  const routes = app.routes.map((route) => route.route).sort();
  assert.equal(routes.includes('/login'), true);
  assert.equal(routes.includes('/projects'), true);
  assert.equal(routes.includes('/projects/new'), true);
  assert.equal(routes.includes('GET|POST /api/projects'), true);
});

test('route-inventory handles Next.js root pages and route groups', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'route-inventory-'));
  fs.mkdirSync(path.join(fixture, 'app'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'app', 'page.tsx'), 'export default function Home() { return null; }');
  fs.mkdirSync(path.join(fixture, 'app', '(marketing)', 'about'), { recursive: true });
  fs.writeFileSync(
    path.join(fixture, 'app', '(marketing)', 'about', 'page.tsx'),
    'export default function About() { return null; }',
  );

  const result = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', fixture]);
  const routes = result.routes.map((route) => route.route).sort();
  assert.equal(routes.includes('/'), true);
  assert.equal(routes.includes('/about'), true);
  assert.equal(routes.some((route) => route.includes('//')), false);
});

test('route-inventory handles Next.js app API root routes and route groups', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'api-route-inventory-'));
  fs.mkdirSync(path.join(fixture, 'app', 'api'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'app', 'api', 'route.ts'), 'export async function POST() { return Response.json({ ok: true }); }');
  fs.mkdirSync(path.join(fixture, 'app', 'api', '(internal)', 'projects'), { recursive: true });
  fs.writeFileSync(
    path.join(fixture, 'app', 'api', '(internal)', 'projects', 'route.ts'),
    'export async function GET() { return Response.json([]); }',
  );

  const result = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', fixture]);
  const routes = result.routes.map((route) => route.route).sort();
  assert.equal(routes.includes('POST /api'), true);
  assert.equal(routes.includes('GET /api/projects'), true);
  assert.equal(routes.some((route) => route.includes('(internal)')), false);
});

test('route-inventory maps Next.js pages index routes to route roots', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-route-inventory-'));
  fs.mkdirSync(path.join(fixture, 'pages', 'api'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'pages', 'index.tsx'), 'export default function Home() { return null; }');
  fs.writeFileSync(path.join(fixture, 'pages', 'about.tsx'), 'export default function About() { return null; }');
  fs.writeFileSync(path.join(fixture, 'pages', 'api', 'index.ts'), 'export default function handler() {}');

  const result = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', fixture]);
  const routes = result.routes.map((route) => route.route).sort();
  assert.equal(routes.includes('/'), true);
  assert.equal(routes.includes('/about'), true);
  assert.equal(routes.includes('/api'), true);
  assert.equal(routes.includes('/index'), false);
  assert.equal(routes.includes('/api/index'), false);
});

test('summarize-test-report detects failures, retry signal, and artifacts', () => {
  const result = runJson('node', [
    'website-test-automation/scripts/summarize-test-report.mjs',
    'tests/fixtures/reports/playwright-flaky.json',
  ]);
  assert.equal(result.counts.failed, 2);
  assert.equal(result.counts.passed, 1);
  assert.equal(result.counts.retried, 1);
  assert.equal(result.artifacts.some((artifact) => artifact.path.endsWith('trace.zip')), true);
});

test('summarize-test-report accepts space-separated markdown format flag', () => {
  const output = run('node', [
    'website-test-automation/scripts/summarize-test-report.mjs',
    'tests/fixtures/reports/playwright-flaky.json',
    '--format',
    'md',
  ]);
  assert.match(output, /^## Test Report Summary/);
});

test('summarize-test-report reads every discovered report without silent truncation', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'report-summary-complete-'));
  for (let index = 0; index < 20; index += 1) {
    fs.writeFileSync(
      path.join(fixture, `${String(index).padStart(2, '0')}-passed.json`),
      JSON.stringify({ title: `passing ${index}`, status: 'passed' }),
    );
  }
  fs.writeFileSync(
    path.join(fixture, '99-failed.json'),
    JSON.stringify({ title: 'late failure', status: 'failed', message: 'failed after the old limit' }),
  );

  const result = runJson('node', ['website-test-automation/scripts/summarize-test-report.mjs', fixture]);
  assert.equal(result.filesDiscovered, 21);
  assert.equal(result.filesRead, 21);
  assert.equal(result.filesSkipped, 0);
  assert.equal(result.filesTruncated, false);
  assert.equal(Object.hasOwn(result, 'truncated'), false);
  assert.equal(result.counts.failed, 1);
});

test('summarize-test-report redacts common secrets from failure output', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'report-summary-redaction-'));
  fs.writeFileSync(
    path.join(fixture, 'secrets.json'),
    JSON.stringify({
      title: 'secret-bearing failure',
      status: 'credential-status-secret',
      ok: false,
      message: [
        'Authorization: Bearer auth-secret-123',
        'Authorization: Basic basic-credential-234',
        'Authorization: Digest username="digest-user", response="digest-response-secret-345", nonce="digest-nonce-456"',
        'Authorization: AWS4-HMAC-SHA256 Credential=aws-credential-secret-567, SignedHeaders=host, Signature=aws-signature-secret-678',
        'headers={"Authorization":"Basic json-basic-secret-789"}',
        'Bearer standalone-secret-456',
        'Cookie: session=cookie-secret-789; theme=dark',
        'Set-Cookie: refresh=set-cookie-secret-012; HttpOnly',
        'API_TOKEN=token-secret-345',
        'CLIENT_SECRET: client-secret-678',
        'PASSWORD="password-secret-901"',
        'GET https://example.test/callback?access_token=query-secret-234&safe=yes&password=query-password-567',
      ].join('\n'),
    }),
  );

  const result = runJson('node', ['website-test-automation/scripts/summarize-test-report.mjs', fixture]);
  const serialized = JSON.stringify(result);
  for (const secret of [
    'auth-secret-123',
    'basic-credential-234',
    'digest-user',
    'digest-response-secret-345',
    'digest-nonce-456',
    'aws-credential-secret-567',
    'aws-signature-secret-678',
    'json-basic-secret-789',
    'credential-status-secret',
    'standalone-secret-456',
    'cookie-secret-789',
    'set-cookie-secret-012',
    'token-secret-345',
    'client-secret-678',
    'password-secret-901',
    'query-secret-234',
    'query-password-567',
  ]) {
    assert.equal(serialized.includes(secret), false, `expected ${secret} to be redacted`);
  }
  assert.equal(result.failures[0].title, 'secret-bearing failure');
  assert.equal(result.failures[0].status, 'failed');
  assert.match(result.failures[0].message, /\[REDACTED\]/);
});

test('summarize-test-report caps details without losing aggregate counts', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'report-summary-detail-cap-'));
  fs.writeFileSync(
    path.join(fixture, 'many-failures.json'),
    JSON.stringify({
      tests: Array.from({ length: 150 }, (_, index) => ({
        title: `failure ${index}`,
        status: 'failed',
        message: index === 0 ? 'x'.repeat(2100) : `message ${index}`,
        attachments: [{ name: `trace ${index}`, path: `/tmp/trace-${index}.zip` }],
      })),
    }),
  );

  const result = runJson('node', ['website-test-automation/scripts/summarize-test-report.mjs', fixture]);
  assert.equal(result.counts.failed, 150);
  assert.equal(result.failures.length, 100);
  assert.equal(result.failureDetailsOmitted, 50);
  assert.equal(result.artifacts.length, 100);
  assert.equal(result.artifactDetailsOmitted, 50);
  assert.equal(result.outputTextFieldsTruncated, 1);
});

test('summarize-test-report skips report symlinks outside the target root', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'report-summary-symlink-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'report-summary-outside-'));
  fs.writeFileSync(path.join(fixture, 'inside.json'), JSON.stringify({ title: 'inside', status: 'passed' }));
  fs.writeFileSync(path.join(outside, 'outside.json'), JSON.stringify({ title: 'outside', status: 'failed' }));
  fs.symlinkSync(path.join(outside, 'outside.json'), path.join(fixture, 'linked.json'));

  const result = runJson('node', ['website-test-automation/scripts/summarize-test-report.mjs', fixture]);
  assert.equal(result.filesDiscovered, 1);
  assert.equal(result.filesRead, 1);
  assert.equal(result.counts.passed, 1);
  assert.equal(result.counts.failed, 0);
});

test('summarize-test-report escapes untrusted markdown fields', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'report-summary-markdown-'));
  fs.writeFileSync(
    path.join(fixture, 'untrusted.json'),
    JSON.stringify({
      title: '<script>alert(1)</script>\n# title instruction [click](javascript:alert(1))',
      tests: [
        {
          status: 'failed',
          message: '<img src=x onerror=alert(1)>\n# message instruction',
          attachments: [{ name: 'trace', path: '<iframe src=x>/trace.zip\n# path instruction' }],
        },
      ],
    }),
  );

  const output = run('node', [
    'website-test-automation/scripts/summarize-test-report.mjs',
    fixture,
    '--format',
    'md',
  ]);
  assert.doesNotMatch(output, /<(?:script|img|iframe)\b/i);
  assert.doesNotMatch(output, /\n# (?:title|message|path) instruction/);
  assert.doesNotMatch(output, /\[click\]\(javascript:/);
  assert.match(output, /&lt;script&gt;/);
  assert.match(output, /&lt;img/);
  assert.match(output, /&lt;iframe/);
});

test('output templates include response-only and implemented automation summaries', () => {
  const outputTemplates = read('website-test-automation/references/output-templates.md');
  assert.match(outputTemplates, /Response-Only QA Package/);
  assert.match(outputTemplates, /Implemented Automation Summary/);
  assert.match(outputTemplates, /Browser-agent smoke evidence/);
  assert.match(outputTemplates, /Mismatches/);
  assert.match(outputTemplates, /Provider\/Live Testing/);
  assert.match(outputTemplates, /Readiness Score/);
});

test('output templates keep browser adapter choices tool-agnostic', () => {
  const outputTemplates = read('website-test-automation/references/output-templates.md');
  for (const phrase of [
    'Claude Code browser workflows',
    'Playwright MCP/CLI',
    'Cypress',
    'Selenium',
    'WebdriverIO',
  ]) {
    assert.match(outputTemplates, new RegExp(phrase, 'i'));
  }
});

test('response-only test case template matches required schema fields', () => {
  const outputTemplates = read('website-test-automation/references/output-templates.md');
  const schema = read('website-test-automation/references/testcase-schema.md');
  const authoring = read('website-test-automation/references/test-case-authoring.md');
  for (const phrase of ['source_status:', 'mismatch:', 'type:', 'persona:', 'data_needs:', 'negative_cases:', 'evidence:', 'assumptions:', 'unknowns:']) {
    assert.match(outputTemplates, new RegExp(phrase));
    assert.match(schema, new RegExp(phrase));
    assert.match(authoring, new RegExp(phrase));
  }
});

test('response-only output template stays focused on target-repo QA output', () => {
  const outputTemplates = read('website-test-automation/references/output-templates.md');
  const responseOnly = outputTemplates.split('## Response-Only QA Package')[1].split('## Automation Handoff')[0];
  assert.doesNotMatch(responseOnly, /Skill Quality Notes/i);
  assert.match(outputTemplates, /Skill Package Review Notes/i);
});

test('ai-native testing reference covers agent capabilities with guardrails', () => {
  const ai = read('website-test-automation/references/ai-native-testing.md');
  for (const phrase of [
    'Exploratory crawl',
    'Self-healing locators',
    'AI as oracle',
    'AI failure triage',
    'confidence',
    'untrusted input',
    'prompt-injection',
    'orientation evidence',
  ]) {
    assert.match(ai, new RegExp(phrase, 'i'));
  }
  // guardrail: subjective oracle results are not durable regression
  assert.match(ai, /not durable regression/i);
  // wired into the skill
  const skill = read('website-test-automation/SKILL.md');
  assert.match(skill, /ai-native-testing\.md/);
});

test('test-infrastructure reference covers durable-suite foundations', () => {
  const infra = read('website-test-automation/references/test-infrastructure.md');
  for (const phrase of [
    'Auth And Session Reuse',
    'storageState',
    'Test Data Lifecycle',
    'teardown',
    'Selector And Test-ID Strategy',
    'data-testid',
    'Environment Bootstrapping',
    'BASE_URL',
    'Suite Architecture',
    'page objects',
  ]) {
    assert.match(infra, new RegExp(phrase, 'i'));
  }
  // wired into the implementation path
  const skill = read('website-test-automation/SKILL.md');
  const implementation = read('website-test-automation/references/automation-implementation.md');
  assert.match(`${skill}\n${implementation}`, /test-infrastructure\.md/);
});

test('validate-testcases accepts a schema-complete case file', () => {
  const result = runRaw('node', [
    'website-test-automation/scripts/validate-testcases.mjs',
    'tests/fixtures/testcases/valid.yaml',
  ]);
  assert.equal(result.status, 0, `expected pass\n${result.stdout}\n${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.totalCases, 1);
  assert.equal(parsed.errorCount, 0);
  assert.equal(parsed.warningCount, 0);
});

test('validate-testcases rejects invalid enums, missing fields, and weak cases', () => {
  const result = runRaw('node', [
    'website-test-automation/scripts/validate-testcases.mjs',
    'tests/fixtures/testcases/invalid.yaml',
  ]);
  assert.equal(result.status, 1);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.totalCases, 2);
  const errors = parsed.errors.join('\n');
  assert.match(errors, /invalid priority: "P5"/);
  assert.match(errors, /invalid type: "smoke"/);
  assert.match(errors, /invalid source_status: "guessed"/);
  assert.match(errors, /invalid automation\.target: "someday"/);
  assert.match(errors, /missing required field: id/);
  assert.match(errors, /P0 case needs at least one source evidence/);
  assert.match(parsed.warnings.join('\n'), /too vague \("works"\)/);
});

test('validate-testcases parses sequence, multi-document, and JSON inputs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcases-'));
  fs.writeFileSync(
    path.join(dir, 'multi.yaml'),
    [
      'id: TC-A-001',
      'title: First',
      'source:',
      '  docs: ["docs/PRD.md"]',
      '  code: []',
      '  observed: []',
      'source_status: documented',
      'type: api',
      'priority: P0',
      'steps:',
      '  - call endpoint',
      'expected:',
      '  - returns 200',
      'automation:',
      '  recommended: false',
      '  target: api-or-component',
      '---',
      'id: TC-A-002',
      'title: Second',
      'source:',
      '  docs: []',
      '  code: ["src/x.ts"]',
      '  observed: []',
      'source_status: inferred',
      'type: component',
      'priority: P2',
      'steps:',
      '  - render',
      'expected:',
      '  - shows label',
      'automation:',
      '  recommended: false',
      '  target: manual',
    ].join('\n'),
  );
  const yamlResult = JSON.parse(run('node', ['website-test-automation/scripts/validate-testcases.mjs', path.join(dir, 'multi.yaml')]));
  assert.equal(yamlResult.totalCases, 2);
  assert.equal(yamlResult.ok, true);

  fs.writeFileSync(
    path.join(dir, 'cases.json'),
    JSON.stringify([
      {
        id: 'TC-J-001',
        title: 'Json case',
        source: { docs: ['docs/PRD.md'], code: [], observed: [] },
        source_status: 'documented',
        type: 'e2e',
        priority: 'P1',
        steps: ['open'],
        expected: ['ok'],
        automation: { recommended: false, target: 'manual' },
      },
    ]),
  );
  const jsonResult = JSON.parse(run('node', ['website-test-automation/scripts/validate-testcases.mjs', path.join(dir, 'cases.json')]));
  assert.equal(jsonResult.totalCases, 1);
  assert.equal(jsonResult.ok, true);

  // A JSON array of scalars must report "no test cases found", not crash.
  fs.writeFileSync(path.join(dir, 'scalars.json'), '[1, "two"]');
  const scalarResult = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', path.join(dir, 'scalars.json')]);
  assert.equal(scalarResult.status, 1);
  assert.match(scalarResult.stdout, /no test cases found/);
});

test('tester-facing references cover design techniques, exploratory, defects, and black-box', () => {
  const techniques = read('website-test-automation/references/test-design-techniques.md');
  for (const phrase of ['Equivalence Partitioning', 'Boundary Value', 'Decision Table', 'State Transition', 'Pairwise', 'Error Guessing']) {
    assert.match(techniques, new RegExp(phrase, 'i'));
  }
  const exploratory = read('website-test-automation/references/exploratory-testing.md');
  for (const phrase of ['Charter', 'timebox', 'Debrief', 'persona']) {
    assert.match(exploratory, new RegExp(phrase, 'i'));
  }
  const defects = read('website-test-automation/references/defect-reporting.md');
  for (const phrase of ['Severity', 'priority', 'reproduce', 'root cause', 'Redact']) {
    assert.match(defects, new RegExp(phrase, 'i'));
  }
  const blackBox = read('website-test-automation/references/black-box-testing.md');
  for (const phrase of ['URL-only', 'observed', 'escalation', 'Automation Boundary']) {
    assert.match(blackBox, new RegExp(phrase, 'i'));
  }
  assert.equal(exists('website-test-automation/assets/checklists/exploratory-charter.md'), true);
  // wired into the skill
  const skill = read('website-test-automation/SKILL.md');
  for (const ref of ['test-design-techniques.md', 'exploratory-testing.md', 'defect-reporting.md', 'black-box-testing.md']) {
    assert.match(skill, new RegExp(ref));
  }
});

test('scenario workflows include a black-box URL-only path', () => {
  const scenarios = read('website-test-automation/references/scenario-workflows.md');
  assert.match(scenarios, /Black-box \/ URL-only/i);
  assert.match(scenarios, /black-box-testing\.md/);
  assert.match(scenarios, /escalation list/i);
});

test('output templates include defect report and release test plan', () => {
  const outputTemplates = read('website-test-automation/references/output-templates.md');
  assert.match(outputTemplates, /## Defect Report/);
  assert.match(outputTemplates, /Steps to reproduce/);
  assert.match(outputTemplates, /## Release Test Plan/);
  assert.match(outputTemplates, /Entry criteria/);
  assert.match(outputTemplates, /Exit criteria/);
});

test('export-testcases converts schema cases to CSV and markdown', () => {
  const csv = run('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    'tests/fixtures/testcases/valid.yaml',
    '--format',
    'csv',
  ]);
  const lines = csv.split('\n');
  assert.match(lines[0], /^"ID","Title","Priority","Type"/);
  assert.match(csv, /TC-AUTH-001/);
  assert.match(csv, /"1\. Open login page\n2\. Enter valid credentials\n3\. Submit form"/);

  const md = run('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    'tests/fixtures/testcases/valid.yaml',
    '--format',
    'md',
  ]);
  assert.match(md, /^\| ID \| Title \| Priority \|/);
  assert.match(md, /TC-AUTH-001/);
  assert.match(md, /<br>/);

  // Edge cases: bracket-prefixed plain scalars survive intact, formula-leading
  // cells get a defensive prefix, bad --out exits 2, parse errors exit 1.
  const edgeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'export-edge-'));
  fs.writeFileSync(
    path.join(edgeDir, 'edge.yaml'),
    [
      'id: TC-EDGE-001',
      'title: [Smoke] Login works',
      'source:',
      '  docs: ["docs/PRD.md"]',
      '  code: []',
      '  observed: []',
      'source_status: documented',
      'type: e2e',
      'priority: P2',
      'steps:',
      '  - Open login page',
      'expected:',
      '  - =HYPERLINK("http://evil.example","x")',
      'automation:',
      '  recommended: false',
      '  target: manual',
    ].join('\n'),
  );
  const edgeCsv = run('node', ['website-test-automation/scripts/export-testcases.mjs', path.join(edgeDir, 'edge.yaml')]);
  assert.match(edgeCsv, /\[Smoke\] Login works/);
  assert.match(edgeCsv, /"'=HYPERLINK\(""http:\/\/evil\.example"",""x""\)"/);

  const badOut = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    'tests/fixtures/testcases/valid.yaml',
    '--out',
    path.join(edgeDir, 'no-such-dir', 'out.csv'),
  ]);
  assert.equal(badOut.status, 2);
  assert.match(badOut.stderr, /Cannot write output file/);

  fs.writeFileSync(path.join(edgeDir, 'broken.json'), '{not json');
  const partial = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    path.join(edgeDir, 'broken.json'),
    path.join(edgeDir, 'edge.yaml'),
  ]);
  assert.equal(partial.status, 1);
  assert.match(partial.stderr, /parse error/);
  assert.match(partial.stdout, /TC-EDGE-001/);
});

test('summarize-test-report parses JUnit XML reports', () => {
  const result = runJson('node', [
    'website-test-automation/scripts/summarize-test-report.mjs',
    'tests/fixtures/reports/junit-sample.xml',
  ]);
  assert.equal(result.counts.passed, 2);
  assert.equal(result.counts.failed, 1);
  assert.equal(result.counts.skipped, 1);
  assert.equal(result.xmlFilesRead, 1);
  assert.match(result.failures[0].title, /rejects a missing name/);
  assert.match(result.failures[0].message, /expected 400 to be 201/);
});

test('route-inventory discovers Nuxt-style vue pages', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'nuxt-route-inventory-'));
  fs.mkdirSync(path.join(fixture, 'pages', 'projects'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'pages', 'index.vue'), '<template><div /></template>');
  fs.writeFileSync(path.join(fixture, 'pages', 'about.vue'), '<template><div /></template>');
  fs.writeFileSync(path.join(fixture, 'pages', 'projects', '[id].vue'), '<template><div /></template>');

  const result = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', fixture]);
  const routes = result.routes.map((route) => route.route);
  assert.equal(routes.includes('/'), true);
  assert.equal(routes.includes('/about'), true);
  assert.equal(routes.includes('/projects/[id]'), true);
});

test('Cypress template is explicit about non-built-in commands', () => {
  const cypressTemplate = read('website-test-automation/assets/automation-templates/cypress.cy.ts');
  assert.equal(
    !cypressTemplate.includes('findByRole') || /@testing-library\/cypress|Testing Library Cypress/i.test(cypressTemplate),
    true,
  );
});

if (process.exitCode) process.exit(process.exitCode);
