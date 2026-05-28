#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('Usage: detect-web-test-stack.mjs [repo-path]\nOutputs JSON with package manager, frameworks, test tools, scripts, CI files, and notes.');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const root = path.resolve(process.argv[2] || '.');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Unreadable repo path: ${root}`);
  process.exit(2);
}

const exists = (p) => fs.existsSync(path.join(root, p));
const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  } catch {
    return null;
  }
};

const pkg = readJson('package.json');
const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
const hasDep = (name) => Object.prototype.hasOwnProperty.call(deps, name);

const packageManager =
  exists('pnpm-lock.yaml') ? 'pnpm' :
  exists('yarn.lock') ? 'yarn' :
  exists('package-lock.json') ? 'npm' :
  exists('bun.lock') ? 'bun' :
  exists('bun.lockb') ? 'bun' :
  pkg?.packageManager || 'unknown';

const frameworks = [];
for (const [dep, label] of [
  ['next', 'nextjs'],
  ['react', 'react'],
  ['vue', 'vue'],
  ['nuxt', 'nuxt'],
  ['@angular/core', 'angular'],
  ['svelte', 'svelte'],
  ['vite', 'vite'],
  ['express', 'express'],
  ['fastify', 'fastify'],
]) {
  if (hasDep(dep)) frameworks.push(label);
}

const testFrameworks = [];
for (const [dep, label] of [
  ['@playwright/test', 'playwright'],
  ['cypress', 'cypress'],
  ['selenium-webdriver', 'selenium'],
  ['webdriverio', 'webdriverio'],
  ['jest', 'jest'],
  ['vitest', 'vitest'],
]) {
  if (hasDep(dep)) testFrameworks.push(label);
}
const hasWdio =
  ['webdriverio', '@wdio/cli', '@wdio/globals'].some(hasDep) ||
  ['wdio.conf.ts', 'wdio.conf.js', 'wdio.conf.mjs', 'wdio.conf.cjs'].some(exists);
if (hasWdio && !testFrameworks.includes('webdriverio')) testFrameworks.push('webdriverio');

const ciFiles = [
  '.github/workflows',
  '.gitlab-ci.yml',
  'circle.yml',
  '.circleci/config.yml',
  'azure-pipelines.yml',
  'Jenkinsfile',
].filter(exists);

const browserTools = [];
if (hasDep('@playwright/test') || exists('playwright.config.ts') || exists('playwright.config.js')) browserTools.push('playwright-runner');
if (hasDep('cypress') || exists('cypress.config.ts') || exists('cypress.config.js')) browserTools.push('cypress');
if (hasDep('selenium-webdriver')) browserTools.push('selenium');
if (hasWdio) browserTools.push('webdriverio');

const result = {
  repo: root,
  packageManager,
  hasPackageJson: Boolean(pkg),
  scripts: pkg?.scripts || {},
  frameworks,
  testFrameworks,
  browserTools,
  ciFiles,
  confidenceNotes: [],
};

if (!pkg) result.confidenceNotes.push('No package.json found; detection is limited.');
if (frameworks.length === 0) result.confidenceNotes.push('No common web framework dependency detected.');
if (testFrameworks.length === 0) result.confidenceNotes.push('No common JS test framework dependency detected.');

console.log(JSON.stringify(result, null, 2));
