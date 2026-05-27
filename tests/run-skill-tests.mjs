#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('skill references and templates cover automation implementation', () => {
  const requiredFiles = [
    'website-test-automation/references/automation-implementation.md',
    'website-test-automation/references/provider-live-testing.md',
    'website-test-automation/assets/automation-templates/playwright.spec.ts',
    'website-test-automation/assets/automation-templates/cypress.cy.ts',
    'website-test-automation/assets/automation-templates/vitest-route.test.ts',
    'website-test-automation/assets/automation-templates/testing-library.test.tsx',
    'website-test-automation/assets/automation-templates/selenium.test.js',
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

test('output templates include response-only and implemented automation summaries', () => {
  const outputTemplates = read('website-test-automation/references/output-templates.md');
  assert.match(outputTemplates, /Response-Only QA Package/);
  assert.match(outputTemplates, /Implemented Automation Summary/);
  assert.match(outputTemplates, /Browser-agent smoke evidence/);
  assert.match(outputTemplates, /Mismatches/);
  assert.match(outputTemplates, /Provider\/Live Testing/);
});

if (process.exitCode) process.exit(process.exitCode);
