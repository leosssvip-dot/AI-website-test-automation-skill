#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
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
  assert.equal(result.overallScore >= 80, true);
  assert.match(result.level, /80-90/);
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
  for (const phrase of ['type:', 'persona:', 'data_needs:', 'negative_cases:', 'evidence:', 'assumptions:', 'unknowns:']) {
    assert.match(outputTemplates, new RegExp(phrase));
    assert.match(schema, new RegExp(phrase));
  }
});

test('Cypress template is explicit about non-built-in commands', () => {
  const cypressTemplate = read('website-test-automation/assets/automation-templates/cypress.cy.ts');
  assert.equal(
    !cypressTemplate.includes('findByRole') || /@testing-library\/cypress|Testing Library Cypress/i.test(cypressTemplate),
    true,
  );
});

if (process.exitCode) process.exit(process.exitCode);
