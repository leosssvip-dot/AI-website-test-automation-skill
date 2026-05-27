#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function usage() {
  console.log('Usage: validate-skill.mjs [skill-path]\nValidates website-test-automation skill structure and core contracts.');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const root = path.resolve(process.argv[2] || process.cwd());
const errors = [];
const requiredRefs = [
  'workflow.md',
  'product-understanding.md',
  'test-case-authoring.md',
  'testcase-schema.md',
  'coverage-matrix.md',
  'knowledge-graph-context.md',
  'browser-tool-adapters.md',
  'automation-selection.md',
  'automation-implementation.md',
  'visual-a11y-performance-security.md',
  'provider-live-testing.md',
  'flake-triage.md',
  'ci-reporting.md',
  'output-templates.md',
];
const requiredScripts = [
  'detect-web-test-stack.mjs',
  'route-inventory.mjs',
  'summarize-test-report.mjs',
  'validate-skill.mjs',
];

const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

for (const rel of [
  'SKILL.md',
  'agents/openai.yaml',
  'assets/testcase-template.yaml',
  'assets/coverage-matrix-template.md',
  'assets/automation-templates/playwright.spec.ts',
  'assets/automation-templates/cypress.cy.ts',
  'assets/automation-templates/vitest-route.test.ts',
  'assets/automation-templates/testing-library.test.tsx',
  'assets/automation-templates/selenium.test.js',
]) {
  if (!exists(rel)) errors.push(`Missing required file: ${rel}`);
}
for (const ref of requiredRefs) {
  if (!exists(`references/${ref}`)) errors.push(`Missing reference: references/${ref}`);
}
for (const script of requiredScripts) {
  if (!exists(`scripts/${script}`)) errors.push(`Missing script: scripts/${script}`);
}

if (exists('SKILL.md')) {
  const skill = read('SKILL.md');
  const fm = skill.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) errors.push('SKILL.md missing YAML frontmatter.');
  else {
    const keys = fm[1].split('\n').filter(Boolean).map((line) => line.split(':')[0].trim());
    for (const key of keys) {
      if (!['name', 'description'].includes(key)) errors.push(`Unexpected SKILL.md frontmatter key: ${key}`);
    }
    if (!fm[1].includes('name: website-test-automation')) errors.push('SKILL.md name must be website-test-automation.');
    if (!fm[1].includes('description:')) errors.push('SKILL.md description missing.');
  }
  for (const match of skill.matchAll(/\]\((references\/[^)]+)\)/g)) {
    if (!exists(match[1])) errors.push(`Broken SKILL.md reference link: ${match[1]}`);
  }
  for (const phrase of ['Test cases first', 'Playwright is one adapter family', 'Redact']) {
    if (!skill.includes(phrase)) errors.push(`SKILL.md missing contract phrase: ${phrase}`);
  }
}

if (exists('agents/openai.yaml')) {
  const yaml = read('agents/openai.yaml');
  const short = yaml.match(/short_description:\s*"([^"]+)"/)?.[1] || '';
  if (short.length < 25 || short.length > 64) errors.push('agents/openai.yaml short_description must be 25-64 chars.');
  if (!yaml.includes('$website-test-automation')) errors.push('agents/openai.yaml default_prompt must mention $website-test-automation.');
}

const allText = [
  exists('SKILL.md') ? read('SKILL.md') : '',
  ...requiredRefs.filter((ref) => exists(`references/${ref}`)).map((ref) => read(`references/${ref}`)),
].join('\n');
for (const phrase of [
  'Test cases first',
  'Tool Agnostic',
  'existing project',
  'knowledge graph',
  'Redact',
  'Forward-Test',
  'source_status',
  'mismatch',
  'Codex Browser',
  'Chrome DevTools MCP',
  'Computer Use',
  'Provider And Paid Live Testing',
  'Automation Implementation',
  'deterministic assertions',
  'Implemented Automation Summary',
  'browser-agent smoke evidence',
  'scoped-skip reason',
]) {
  const re = new RegExp(phrase, 'i');
  if (!re.test(allText)) errors.push(`Missing core contract phrase: ${phrase}`);
}
if (/Playwright[^.\n]*(only|sole|center)/i.test(allText) && !/Playwright is one adapter family/i.test(allText)) {
  errors.push('Playwright appears to be positioned as the only path.');
}
if (exists('assets/testcase-template.yaml') && !read('assets/testcase-template.yaml').includes('source_status:')) {
  errors.push('assets/testcase-template.yaml must include source_status.');
}
if (exists('assets/coverage-matrix-template.md') && !/Source status/i.test(read('assets/coverage-matrix-template.md'))) {
  errors.push('assets/coverage-matrix-template.md must include Source status.');
}
for (const [rel, phrase] of [
  ['assets/automation-templates/playwright.spec.ts', 'TC-WORKFLOW-001'],
  ['assets/automation-templates/cypress.cy.ts', 'cy.visit'],
  ['assets/automation-templates/vitest-route.test.ts', 'describe'],
  ['assets/automation-templates/testing-library.test.tsx', 'render'],
  ['assets/automation-templates/selenium.test.js', 'selenium-webdriver'],
]) {
  if (exists(rel) && !read(rel).includes(phrase)) errors.push(`${rel} missing expected phrase: ${phrase}`);
}

for (const script of requiredScripts) {
  if (!exists(`scripts/${script}`)) continue;
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', script), '--help'], { encoding: 'utf8' });
  if (result.status !== 0) errors.push(`Script --help failed: scripts/${script}`);
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}

console.log('Skill validation passed.');
