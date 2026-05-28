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
  'scenario-workflows.md',
  'readiness-model.md',
  'design-source-adapters.md',
  'product-understanding.md',
  'human-reasonableness.md',
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
  'score-test-readiness.mjs',
  'validate-skill.mjs',
];

const exists = (rel) => fs.existsSync(path.join(root, rel));
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

for (const rel of [
  'SKILL.md',
  'agents/openai.yaml',
  'assets/testcase-template.yaml',
  'assets/coverage-matrix-template.md',
  'assets/readiness-score-template.md',
  'assets/checklists/browser-smoke-evidence.md',
  'assets/checklists/flaky-ci-triage.md',
  'assets/checklists/provider-live-test-plan.md',
  'assets/checklists/specialized-quality-checklist.md',
  'assets/automation-templates/playwright.spec.ts',
  'assets/automation-templates/cypress.cy.ts',
  'assets/automation-templates/vitest-route.test.ts',
  'assets/automation-templates/testing-library.test.tsx',
  'assets/automation-templates/selenium.test.js',
  'assets/automation-templates/webdriverio.e2e.js',
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
    const description = fm[1].match(/^description:\s*(.*)$/m)?.[1] || '';
    for (const phrase of ['design artifacts', 'Figma', 'Storybook', 'design tokens']) {
      if (!new RegExp(phrase, 'i').test(description)) errors.push(`SKILL.md description missing trigger phrase: ${phrase}`);
    }
  }
  for (const match of skill.matchAll(/\]\((references\/[^)]+)\)/g)) {
    if (!exists(match[1])) errors.push(`Broken SKILL.md reference link: ${match[1]}`);
  }
  for (const phrase of ['Test cases first', 'Playwright is one adapter family', 'Redact']) {
    if (!skill.includes(phrase)) errors.push(`SKILL.md missing contract phrase: ${phrase}`);
  }
  for (const phrase of ['MasterGo', 'MockingBot', 'Sketch', 'Zeplin', 'prototypes']) {
    if (!new RegExp(phrase, 'i').test(skill)) errors.push(`SKILL.md workflow missing design-source phrase: ${phrase}`);
  }
  const workflow = skill.split('## Workflow')[1]?.split('## Tooling Helpers')[0] || '';
  const workflowSteps = workflow.split('\n').filter((line) => /^\d+\./.test(line));
  const stepIndex = (phrase) => workflowSteps.findIndex((line) => line.includes(phrase));
  const productModelStep = stepIndex('Build a product model');
  const humanStep = stepIndex('Human Reasonableness Review Gate');
  const caseStep = stepIndex('Write source-backed test cases');
  const coverageStep = stepIndex('Build or update coverage');
  const dispositionStep = stepIndex('Post-Test-Case Disposition Gate');
  const automationStep = stepIndex('Choose an automation target');
  if (
    [productModelStep, humanStep, caseStep, coverageStep, dispositionStep, automationStep].some((index) => index < 0) ||
    !(
      productModelStep < humanStep &&
      humanStep < caseStep &&
      caseStep < coverageStep &&
      coverageStep < dispositionStep &&
      dispositionStep < automationStep
    )
  ) {
    errors.push('SKILL.md workflow must order product model before Human Reasonableness Review Gate, human review before cases, cases before coverage, coverage before disposition, and disposition before automation selection.');
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
  'Readiness Score',
  'Scenario Workflow',
  'Human Reasonableness Review Gate',
  'human expectation',
  'documented expectation',
  'observed behavior',
  'logic findings ledger',
  'Post-Test-Case Disposition Gate',
  'case disposition',
  'human-logic-risk',
  'Response-only review',
  'Automation landing',
  'Browser smoke',
  'Failure/flaky triage',
  'Provider/live testing',
  'Specialized quality',
  '80-90',
  'source_status',
  'data_needs',
  'mismatch',
  'human_expectation',
  'why_unreasonable',
  'logic_risk',
  'suggested_product_fix',
  'Codex Browser',
  'Chrome DevTools MCP',
  'Claude Code browser workflows',
  'Computer Use',
  'Provider And Paid Live Testing',
  'Automation Implementation',
  'deterministic assertions',
  'Implemented Automation Summary',
  'browser-agent smoke evidence',
  'scoped-skip reason',
  'specialized quality',
  'provider/live',
  'Figma',
  'Lanhu',
  'Storybook',
  'design tokens',
  'design mismatch',
]) {
  const re = new RegExp(phrase, 'i');
  if (!re.test(allText)) errors.push(`Missing core contract phrase: ${phrase}`);
}
if (/Playwright[^.\n]*(only|sole|center)/i.test(allText) && !/Playwright is one adapter family/i.test(allText)) {
  errors.push('Playwright appears to be positioned as the only path.');
}
if (exists('assets/testcase-template.yaml')) {
  const template = read('assets/testcase-template.yaml');
  if (!template.includes('source_status:')) errors.push('assets/testcase-template.yaml must include source_status.');
  if (!template.includes('data_needs:')) errors.push('assets/testcase-template.yaml must include data_needs.');
  for (const phrase of ['human_expectation:', 'why_unreasonable:', 'logic_risk:', 'suggested_product_fix:']) {
    if (!template.includes(phrase)) errors.push(`assets/testcase-template.yaml must include ${phrase}`);
  }
}
if (exists('assets/coverage-matrix-template.md') && !/Source status/i.test(read('assets/coverage-matrix-template.md'))) {
  errors.push('assets/coverage-matrix-template.md must include Source status.');
}
if (exists('references/output-templates.md') && !read('references/output-templates.md').includes('data_needs:')) {
  errors.push('references/output-templates.md must include data_needs in test case output.');
}
if (exists('references/output-templates.md')) {
  const outputTemplates = read('references/output-templates.md');
  for (const phrase of ['Claude Code browser workflows', 'Playwright MCP/CLI', 'Cypress', 'Selenium', 'WebdriverIO']) {
    if (!new RegExp(phrase, 'i').test(outputTemplates)) errors.push(`references/output-templates.md missing adapter choice: ${phrase}`);
  }
  for (const phrase of ['Logic Findings Ledger', 'human_expectation:', 'why_unreasonable:', 'logic_risk:', 'suggested_product_fix:', 'human-logic-risk']) {
    if (!new RegExp(phrase, 'i').test(outputTemplates)) errors.push(`references/output-templates.md missing human reasonableness output: ${phrase}`);
  }
}
if (
  exists('assets/automation-templates/cypress.cy.ts') &&
  read('assets/automation-templates/cypress.cy.ts').includes('findByRole') &&
  !/Testing Library Cypress|@testing-library\/cypress/i.test(read('assets/automation-templates/cypress.cy.ts'))
) {
  errors.push('assets/automation-templates/cypress.cy.ts must document Testing Library Cypress setup when using findByRole.');
}
if (exists('references/design-source-adapters.md')) {
  const designAdapters = read('references/design-source-adapters.md');
  for (const phrase of ['Figma', 'Lanhu', '蓝湖', 'MasterGo', 'MockingBot', '摹客', 'Sketch', 'Zeplin', 'Storybook', 'design tokens', 'screenshots', 'videos', 'design mismatch']) {
    if (!new RegExp(phrase, 'i').test(designAdapters)) errors.push(`references/design-source-adapters.md missing: ${phrase}`);
  }
}
if (exists('references/product-understanding.md') && !read('references/product-understanding.md').includes('design-source-adapters.md')) {
  errors.push('references/product-understanding.md must link design-source-adapters.md.');
}
for (const [rel, phrase] of [
  ['assets/automation-templates/playwright.spec.ts', 'TC-WORKFLOW-001'],
  ['assets/automation-templates/cypress.cy.ts', 'cy.visit'],
  ['assets/automation-templates/vitest-route.test.ts', 'describe'],
  ['assets/automation-templates/testing-library.test.tsx', 'render'],
  ['assets/automation-templates/selenium.test.js', 'selenium-webdriver'],
  ['assets/automation-templates/webdriverio.e2e.js', '@wdio/globals'],
]) {
  if (exists(rel) && !read(rel).includes(phrase)) errors.push(`${rel} missing expected phrase: ${phrase}`);
}

if (exists('scripts/score-test-readiness.mjs')) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'score-test-readiness.mjs'), root], { encoding: 'utf8' });
  if (result.status !== 0) errors.push('scripts/score-test-readiness.mjs failed on skill root.');
  else {
    try {
      const parsed = JSON.parse(result.stdout);
      if (parsed.dimensionCount !== 8) errors.push('Readiness scorer must report 8 dimensions.');
      if (parsed.overallScore < 80) errors.push('Readiness scorer must rate the skill package at 80+.');
    } catch {
      errors.push('scripts/score-test-readiness.mjs must output JSON.');
    }
  }
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
