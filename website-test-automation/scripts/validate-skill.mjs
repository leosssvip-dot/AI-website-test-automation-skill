#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function usage() {
  console.log('Usage: validate-skill.mjs [skill-path]\nStatically validates website-test-automation skill structure and core contracts.');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const inputRoot = path.resolve(process.argv[2] || process.cwd());
let root;
try {
  const rootStats = fs.statSync(inputRoot);
  if (!rootStats.isDirectory()) throw new Error('not a directory');
  root = fs.realpathSync(inputRoot);
} catch {
  console.error(`Unreadable skill path: ${inputRoot}`);
  process.exit(2);
}
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
  'test-infrastructure.md',
  'ai-native-testing.md',
  'visual-a11y-performance-security.md',
  'provider-live-testing.md',
  'flake-triage.md',
  'ci-reporting.md',
  'output-templates.md',
  'worked-example.md',
  'api-contract-testing.md',
  'test-quality.md',
  'service-and-library-testing.md',
  'test-design-techniques.md',
  'exploratory-testing.md',
  'defect-reporting.md',
  'black-box-testing.md',
];
const requiredScripts = [
  'lib/cli-options.mjs',
  'lib/testcase-schema.mjs',
  'lib/yaml-testcases.mjs',
  'detect-web-test-stack.mjs',
  'route-inventory.mjs',
  'summarize-test-report.mjs',
  'score-test-readiness.mjs',
  'validate-testcases.mjs',
  'export-testcases.mjs',
  'validate-skill.mjs',
];
const requiredPackageFiles = [
  'SKILL.md',
  'agents/openai.yaml',
  'assets/testcase-template.yaml',
  'assets/coverage-matrix-template.md',
  'assets/readiness-score-template.md',
  'assets/checklists/exploratory-charter.md',
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
  ...requiredRefs.map((ref) => `references/${ref}`),
  ...requiredScripts.map((script) => `scripts/${script}`),
];
const MAX_REQUIRED_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_REQUIRED_BYTES = 32 * 1024 * 1024;
const safeFiles = new Set();
const safeContents = new Map();
const reportedUnsafeParents = new Set();
let totalRequiredBytes = 0;

function isContained(target) {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function hasSafeParents(rel) {
  let current = root;
  for (const component of rel.split('/').slice(0, -1)) {
    current = path.join(current, component);
    let stats;
    try {
      stats = fs.lstatSync(current);
    } catch {
      return true;
    }
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      const parentRel = path.relative(root, current).replaceAll(path.sep, '/');
      if (!reportedUnsafeParents.has(parentRel)) {
        errors.push(`Required file parent must be a regular in-root directory, not a symbolic link: ${parentRel}`);
        reportedUnsafeParents.add(parentRel);
      }
      return false;
    }
  }
  return true;
}

function readRequiredFile(full, rel, inspectedStats) {
  let fd;
  try {
    fd = fs.openSync(full, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const openedStats = fs.fstatSync(fd);
    const currentStats = fs.lstatSync(full);
    const sameFile = openedStats.isFile() && currentStats.isFile() && !currentStats.isSymbolicLink() &&
      inspectedStats.dev === openedStats.dev && inspectedStats.ino === openedStats.ino &&
      currentStats.dev === openedStats.dev && currentStats.ino === openedStats.ino;
    if (!sameFile || !isContained(fs.realpathSync(full))) {
      throw new Error('file changed during inspection');
    }
    const chunks = [];
    let total = 0;
    while (total <= MAX_REQUIRED_FILE_BYTES) {
      const remaining = MAX_REQUIRED_FILE_BYTES + 1 - total;
      const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, remaining));
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      chunks.push(buffer.subarray(0, bytesRead));
      total += bytesRead;
    }
    if (total > MAX_REQUIRED_FILE_BYTES) throw new Error('file grew beyond the 2 MiB size limit');
    return Buffer.concat(chunks, total).toString('utf8');
  } catch (error) {
    if (error.code === 'ELOOP') throw new Error(`symbolic link rejected: ${rel}`);
    throw error;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

for (const rel of requiredPackageFiles) {
  if (!hasSafeParents(rel)) continue;
  const full = path.join(root, rel);
  let stat;
  try {
    stat = fs.lstatSync(full);
  } catch (error) {
    if (error?.code === 'ENOENT') errors.push(`Missing required file: ${rel}`);
    else errors.push(`Cannot inspect required file: ${rel} (${error?.code || 'unknown error'})`);
    continue;
  }
  if (stat.isSymbolicLink()) {
    errors.push(`Required file must not be a symbolic link: ${rel}`);
    continue;
  }
  if (!stat.isFile()) {
    errors.push(`Required file must be a regular file: ${rel}`);
    continue;
  }
  if (stat.size > MAX_REQUIRED_FILE_BYTES) {
    errors.push(`Required file exceeds the 2 MiB size limit: ${rel}`);
    continue;
  }
  if (totalRequiredBytes + stat.size > MAX_TOTAL_REQUIRED_BYTES) {
    errors.push(`Required files exceed the 32 MiB aggregate size limit at: ${rel}`);
    continue;
  }
  let real;
  try {
    real = fs.realpathSync(full);
  } catch (error) {
    errors.push(`Cannot resolve required file: ${rel} (${error?.code || 'unknown error'})`);
    continue;
  }
  if (!isContained(real)) {
    errors.push(`Required file resolves outside the skill root: ${rel}`);
    continue;
  }
  try {
    const contents = readRequiredFile(full, rel, stat);
    const bytes = Buffer.byteLength(contents);
    if (totalRequiredBytes + bytes > MAX_TOTAL_REQUIRED_BYTES) {
      errors.push(`Required files exceed the 32 MiB aggregate size limit at: ${rel}`);
      continue;
    }
    totalRequiredBytes += bytes;
    safeContents.set(rel, contents);
  } catch (error) {
    errors.push(`Cannot read required file: ${rel} (${error?.code || 'unknown error'})`);
    continue;
  }
  safeFiles.add(rel);
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}

const exists = (rel) => safeFiles.has(rel);
const read = (rel) => safeContents.get(rel);

function parseFrontmatterScalar(rawValue) {
  const value = rawValue.trim();
  if (value === '' || ['|', '>'].includes(value)) return null;
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'") || value.length < 2) return null;
    return value.slice(1, -1).replaceAll("''", "'");
  }
  if (/^[\[{&*!]|^(?:null|~)$/i.test(value)) return null;
  return value;
}

function parseOpenAiInterfaceYaml(yaml) {
  const values = Object.create(null);
  const issues = [];
  let rootSeen = false;
  for (const line of yaml.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!rootSeen) {
      if (line !== 'interface:') {
        issues.push('agents/openai.yaml must start with an interface mapping.');
        break;
      }
      rootSeen = true;
      continue;
    }
    const entry = line.match(/^  ([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/);
    if (!entry) {
      issues.push(`Invalid agents/openai.yaml interface line: ${line.trim()}`);
      continue;
    }
    const [, key, rawValue] = entry;
    if (!['display_name', 'short_description', 'default_prompt'].includes(key)) {
      issues.push(`Unexpected agents/openai.yaml interface key: ${key}`);
      continue;
    }
    if (Object.hasOwn(values, key)) {
      issues.push(`Duplicate agents/openai.yaml interface key: ${key}`);
      continue;
    }
    const value = parseFrontmatterScalar(rawValue);
    if (value === null) {
      issues.push(`Invalid agents/openai.yaml interface scalar: ${key}`);
      continue;
    }
    values[key] = value;
  }
  if (!rootSeen) issues.push('agents/openai.yaml missing interface mapping.');
  return { values, issues };
}

if (exists('SKILL.md')) {
  const skill = read('SKILL.md');
  const fm = skill.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) errors.push('SKILL.md missing YAML frontmatter.');
  else {
    const frontmatter = Object.create(null);
    for (const line of fm[1].split('\n')) {
      if (line.trim() === '') continue;
      const entry = line.match(/^([A-Za-z][A-Za-z0-9_-]*):[ \t]*(.*)$/);
      if (!entry) {
        errors.push(`Invalid SKILL.md frontmatter line: ${line.trim() || '(blank)'}`);
        continue;
      }
      const [, key, rawValue] = entry;
      if (!['name', 'description'].includes(key)) {
        errors.push(`Unexpected SKILL.md frontmatter key: ${key}`);
        continue;
      }
      if (Object.hasOwn(frontmatter, key)) {
        errors.push(`Duplicate SKILL.md frontmatter key: ${key}`);
        continue;
      }
      const value = parseFrontmatterScalar(rawValue);
      if (value === null) {
        errors.push(`Invalid SKILL.md frontmatter scalar: ${key}`);
        continue;
      }
      frontmatter[key] = value;
    }
    if (frontmatter.name !== 'website-test-automation') errors.push('SKILL.md name must be website-test-automation.');
    if (typeof frontmatter.description !== 'string' || frontmatter.description.trim() === '') {
      errors.push('SKILL.md description missing.');
    }
    const description = frontmatter.description || '';
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
  if (!/selected scenario branch[^.]*terminal[^.]*later numbered steps do not override/i.test(skill)) {
    errors.push('SKILL.md must make the selected scenario branch terminal override later numbered steps.');
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

if (exists('references/workflow.md')) {
  const detailedWorkflow = read('references/workflow.md');
  const stepsSection = detailedWorkflow.split('## Steps')[1]?.split('## Evidence Rules')[0] || '';
  const numberedSteps = stepsSection.split('\n').filter((line) => /^\d+\./.test(line));
  const stepIndex = (phrase) => numberedSteps.findIndex((line) => line.includes(phrase));
  const productModelStep = stepIndex('Build a product model');
  const humanStep = stepIndex('Human Reasonableness Review Gate');
  const caseStep = stepIndex('Write source-backed test cases');
  const coverageStep = stepIndex('Build or update a coverage matrix');
  const dispositionStep = stepIndex('Post-Test-Case Disposition Gate');
  const automationStep = stepIndex('Select automation targets');
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
    errors.push('Detailed workflow must order product model before human review, human review before cases, cases before coverage, coverage before disposition, and disposition before automation.');
  }
}

if (exists('references/scenario-workflows.md')) {
  const scenarios = read('references/scenario-workflows.md');
  const rowFor = (name) => scenarios.split('\n').find((line) => line.startsWith(`| ${name} |`)) || '';
  const responseRow = rowFor('Response-only review');
  const authoringRow = rowFor('Test-case authoring');
  if (!/stop[^|]*do not edit files or run automation/i.test(responseRow)) {
    errors.push('Response-only scenario terminal must stop before file edits or automation.');
  }
  if (!/stop[^|]*do not edit files or run automation/i.test(authoringRow)) {
    errors.push('Test-case authoring scenario terminal must stop before file edits or automation.');
  }
}

if (exists('agents/openai.yaml')) {
  const yaml = read('agents/openai.yaml');
  const { values, issues } = parseOpenAiInterfaceYaml(yaml);
  errors.push(...issues);
  const short = values.short_description || '';
  if (short.length < 25 || short.length > 64) errors.push('agents/openai.yaml short_description must be 25-64 chars.');
  if (typeof values.display_name !== 'string' || values.display_name.trim() === '') {
    errors.push('agents/openai.yaml display_name missing.');
  }
  if (!values.default_prompt?.includes('$website-test-automation')) {
    errors.push('agents/openai.yaml default_prompt must mention $website-test-automation.');
  }
}

// Structural invariants are validated above (files, links, frontmatter, workflow order).
// Detailed prose/content assertions (contract phrases across references, schema fields,
// adapter coverage) live in tests/run-skill-tests.mjs so wording can evolve without
// every reword breaking validation. The checks below stay here because they guard the
// small set of contracts the test suite's negative cases depend on.
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

for (const script of requiredScripts) {
  if (!exists(`scripts/${script}`)) continue;
  const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    cwd: root,
    encoding: 'utf8',
    env: {},
    input: read(`scripts/${script}`),
    timeout: 5000,
  });
  if (result.error?.code === 'ETIMEDOUT') errors.push(`Script syntax check timed out: scripts/${script}`);
  else if (result.status !== 0) errors.push(`Script syntax check failed: scripts/${script}`);
}

if (errors.length) {
  console.error(errors.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}

console.log('Skill validation passed.');
