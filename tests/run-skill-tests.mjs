#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ENUMS } from '../website-test-automation/scripts/lib/testcase-schema.mjs';

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

function copiedReadinessFixture(prefix) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  return fixture;
}

function readinessProject(id, evidence) {
  return {
    id,
    target: `https://${id}.test/critical-flow`,
    command: `npm test -- ${id}`,
    outcome: `${id} critical flow passed with recorded assertions`,
    evidence: [evidence],
  };
}

function validTestCase(overrides = {}) {
  return {
    id: 'TC-SCHEMA-001',
    title: 'Schema validation case',
    source: { docs: ['docs/PRD.md'], code: [], observed: [] },
    source_status: 'documented',
    surface: 'api',
    layer: 'api',
    disposition: 'manual',
    mismatch: '',
    human_expectation: '',
    why_unreasonable: '',
    logic_risk: false,
    suggested_product_fix: '',
    type: 'api',
    priority: 'P2',
    risk: 'contract',
    persona: 'registered_user',
    preconditions: [],
    steps: ['Call endpoint'],
    expected: ['Returns 200'],
    negative_cases: [],
    data_needs: [],
    automation: { recommended: false, target: 'manual', preferred_tools: [] },
    evidence: { required: [] },
    assumptions: [],
    unknowns: [],
    ...overrides,
  };
}

function validYamlLines() {
  return [
    'id: TC-YAML-001',
    'title: Valid title',
    'source:',
    '  docs: ["docs/PRD.md"]',
    '  code: []',
    '  observed: []',
    'source_status: documented',
    'surface: api',
    'layer: api',
    'disposition: manual',
    'type: api',
    'priority: P2',
    'steps: [Call endpoint]',
    'expected: [Returns 200]',
    'automation: {recommended: false, target: manual}',
  ];
}

function validateCaseFiles(prefix, casesByName) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  for (const [name, testCase] of Object.entries(casesByName)) {
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(testCase));
  }
  const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', dir]);
  const summary = JSON.parse(result.stdout);
  const errorsFor = (name) => {
    const report = summary.files.find((file) => file.file.endsWith(`${name}.json`));
    assert.notEqual(report, undefined, `missing validation report for ${name}`);
    return report.errors.join('\n');
  };
  return { result, summary, errorsFor };
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

test('skill package validator rejects detailed workflow order drift', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-detailed-order-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  const rel = path.join(fixture, 'references', 'workflow.md');
  const workflow = fs.readFileSync(rel, 'utf8');
  const reversed = workflow.replace(
    '5. Write source-backed test cases using the schema and quality rubric.\n6. Build or update a coverage matrix by product area, workflow, risk, test layer, source evidence, and automation feasibility.',
    '5. Build or update a coverage matrix by product area, workflow, risk, test layer, source evidence, and automation feasibility.\n6. Write source-backed test cases using the schema and quality rubric.',
  );
  fs.writeFileSync(
    rel,
    reversed.replace(
      '## Steps\n',
      '## Steps\n\nDecoy prose mentions Build a product model, Human Reasonableness Review Gate, Write source-backed test cases, Build or update a coverage matrix, Post-Test-Case Disposition Gate, and Select automation targets in the desired order.\n',
    ),
  );

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /detailed workflow.*cases before coverage/i);
});

test('skill package validator rejects missing scenario branch terminals', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-validator-branch-terminal-'));
  fs.cpSync(skillRoot, fixture, { recursive: true });
  const rel = path.join(fixture, 'references', 'scenario-workflows.md');
  const scenarios = fs.readFileSync(rel, 'utf8');
  const authoringRow = scenarios.split('\n').find((line) => line.startsWith('| Test-case authoring |')) || '';
  fs.writeFileSync(
    rel,
    scenarios.replace(
      authoringRow,
      authoringRow.replace(
        'and stop; do not edit files or run automation unless implementation is explicitly requested.',
        'and continue into automation.',
      ),
    ),
  );

  const result = runRaw('node', ['website-test-automation/scripts/validate-skill.mjs', fixture]);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /test-case authoring.*terminal/i);
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

test('detailed workflow and worked example order cases before coverage and disposition', () => {
  const workflow = read('website-test-automation/references/workflow.md');
  const steps = workflow.split('## Steps')[1].split('## Evidence Rules')[0];
  const indexOf = (phrase) => steps.indexOf(phrase);
  const productModel = indexOf('Build a product model');
  const humanReview = indexOf('Human Reasonableness Review Gate');
  const cases = indexOf('Write source-backed test cases');
  const coverage = indexOf('Build or update a coverage matrix');
  const disposition = indexOf('Post-Test-Case Disposition Gate');
  const automation = indexOf('Select automation targets');
  for (const index of [productModel, humanReview, cases, coverage, disposition, automation]) {
    assert.notEqual(index, -1);
  }
  assert.equal(productModel < humanReview, true);
  assert.equal(humanReview < cases, true);
  assert.equal(cases < coverage, true);
  assert.equal(coverage < disposition, true);
  assert.equal(disposition < automation, true);

  const workedExample = read('website-test-automation/references/worked-example.md');
  const casesHeading = workedExample.indexOf('## Step 5 — Source-Backed Cases');
  const coverageHeading = workedExample.indexOf('## Step 6 — Coverage Matrix');
  const dispositionHeading = workedExample.indexOf('## Step 7 — Disposition Gate');
  assert.equal(casesHeading >= 0, true);
  assert.equal(casesHeading < coverageHeading, true);
  assert.equal(coverageHeading < dispositionHeading, true);
  assert.match(workedExample.slice(casesHeading, coverageHeading), /- id: TC-PROJ-001/);
  const coverageSection = workedExample.slice(coverageHeading, dispositionHeading);
  assert.match(coverageSection, /\| Product area \| Workflow \|/);
  for (const row of coverageSection.split('\n').filter((line) => /^\| (?:auth\/session|projects) \|/.test(line))) {
    const layer = row.split('|').map((cell) => cell.trim())[6];
    assert.equal(ENUMS.layer.includes(layer), true, `worked-example coverage layer must be canonical: ${layer}`);
  }
});

test('selected scenario branches have binding terminal behavior', () => {
  const skill = read('website-test-automation/SKILL.md');
  const scenarios = read('website-test-automation/references/scenario-workflows.md');
  assert.match(skill, /selected scenario branch[^.]*terminal[^.]*later numbered steps do not override/i);

  const rowFor = (name) => scenarios.split('\n').find((line) => line.startsWith(`| ${name} |`)) || '';
  for (const name of ['Response-only review', 'Test-case authoring']) {
    const row = rowFor(name);
    assert.match(row, /cases/i);
    assert.match(row, /coverage/i);
    assert.match(row, /disposition/i);
    assert.match(row, /report/i);
    assert.match(row, /stop/i);
    assert.match(row, /do not edit files or run automation/i);
  }
  assert.match(rowFor('Automation landing'), /implement[^|]*run targeted validation/i);
});

test('browser evidence condition has explicit precedence and referenced consumers', () => {
  const scenarios = read('website-test-automation/references/scenario-workflows.md');
  const condition = scenarios.split('## Browser Evidence Condition')[1]?.split('\n## ')[0] || '';
  assert.notEqual(condition, '', 'scenario-workflows.md must own the canonical browser evidence condition');
  assert.match(condition, /user explicitly requests[^.]*browser/i);
  assert.match(condition, /disposition:\s*`?browser-smoke`?/i);
  assert.match(condition, /browser behavior[^.]*acceptance signal/i);
  assert.match(condition, /conditions take precedence over[^.]*surface[^.]*layer/i);
  assert.match(condition, /Network panel[^.]*API[^.]*requires browser evidence/i);
  assert.match(condition, /browser-rendered component[^.]*requires browser evidence/i);
  assert.match(condition, /When none of those conditions applies/i);
  assert.match(condition, /API[^.]*component[^.]*unit[^.]*job[^.]*CLI[^.]*library[^.]*do(?:es)? not (?:start|require) a browser/i);
  assert.match(condition, /no scoped-skip reason/i);

  for (const rel of [
    'website-test-automation/references/automation-implementation.md',
    'website-test-automation/references/browser-tool-adapters.md',
    'website-test-automation/references/output-templates.md',
  ]) {
    assert.match(read(rel), /scenario-workflows\.md#browser-evidence-condition/);
  }

  const productContracts = [read('docs/PRD.md'), read('docs/DEVELOPMENT_PLAN.md')];
  for (const contract of productContracts) {
    assert.match(contract, /user explicitly requests[^.]*browser/i);
    assert.match(contract, /disposition:\s*`?browser-smoke`?/i);
    assert.match(contract, /browser behavior[^.]*acceptance signal/i);
    assert.match(contract, /When none of those conditions applies/i);
    assert.match(contract, /API[^.]*component[^.]*unit[^.]*job[^.]*CLI[^.]*library[^.]*do(?:es)? not (?:start|require) a browser/i);
    assert.match(contract, /no scoped-skip reason/i);
  }

  const combined = [scenarios, ...productContracts].join('\n').replace(/\s+/g, ' ');
  assert.doesNotMatch(combined, /complete automation landing[^.]*browser[^.]*smoke/i);
  assert.doesNotMatch(combined, /browser smoke evidence when UI behavior is involved/i);
  assert.doesNotMatch(combined, /unless the user explicitly limit(?:s|ed) scope to API/i);

  const outputTemplates = read('website-test-automation/references/output-templates.md');
  assert.doesNotMatch(outputTemplates, /^- Browser-agent smoke evidence:$/m);
  assert.match(outputTemplates, /Browser-agent smoke evidence \(when the \[Browser Evidence Condition\]\(scenario-workflows\.md#browser-evidence-condition\) applies; otherwise omit without a scoped-skip reason\):/);
});

test('source status and execution blockers remain separate concepts', () => {
  const workflow = read('website-test-automation/references/workflow.md');
  const evidenceRules = workflow.split('## Evidence Rules')[1] || '';
  for (const status of ['documented', 'inferred', 'observed', 'mismatch']) {
    assert.match(evidenceRules, new RegExp(`\\b${status}\\b`, 'i'));
  }
  assert.match(evidenceRules, /blocked[^.]*evidence, execution, or gap status/i);
  assert.doesNotMatch(evidenceRules, /Mark claims as[^.]*blocked/i);
});

test('logic findings ledger separates severity from priority', () => {
  const human = read('website-test-automation/references/human-reasonableness.md');
  const workedExample = read('website-test-automation/references/worked-example.md');
  const outputTemplates = read('website-test-automation/references/output-templates.md');
  const defects = read('website-test-automation/references/defect-reporting.md');
  for (const ledger of [human, workedExample]) {
    assert.match(ledger, /^severity:\s*S[1-4]$/m);
    assert.match(ledger, /^priority:\s*P[0-3]$/m);
    assert.doesNotMatch(ledger, /^severity:\s*P[0-3]$/m);
  }
  assert.match(outputTemplates, /\| ID \| Workflow \| Severity \| Priority \|/);
  assert.doesNotMatch(defects, /P-label in its `severity` field/i);
  assert.match(defects, /logic findings ledger[^.]*severity[^.]*priority/i);
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
    'scenario-workflows.md#browser-evidence-condition',
    'Runner',
    'Code Review Checklist',
  ]) {
    assert.match(implementation, new RegExp(phrase, 'i'));
  }

  const schema = read('website-test-automation/references/testcase-schema.md');
  assert.match(schema, /source_status/);
  assert.match(schema, /mismatch/);
});

test('starter automation templates exercise imported target code', () => {
  const routeTemplate = read('website-test-automation/assets/automation-templates/vitest-route.test.ts');
  assert.match(routeTemplate, /^import\s*\{\s*POST\s*\}\s*from\s*['"][^'"]+['"]/m);
  assert.match(routeTemplate, /await\s+POST\s*\(\s*request\s*\)/);
  assert.doesNotMatch(routeTemplate, /\bvi\.fn\s*\(/);

  const componentTemplate = read(
    'website-test-automation/assets/automation-templates/testing-library.test.tsx',
  );
  assert.match(componentTemplate, /^import\s*\{\s*ReplaceWithComponent\s*\}\s*from\s*['"][^'"]+['"]/m);
  assert.match(componentTemplate, /render\s*\(\s*<ReplaceWithComponent\b/);
  assert.doesNotMatch(
    componentTemplate,
    /(?:function|class)\s+ReplaceWithComponent\b|(?:const|let|var)\s+ReplaceWithComponent\s*=/,
  );
});

test('Selenium starter requires an explicit test environment URL', () => {
  const relativePath = 'website-test-automation/assets/automation-templates/selenium.test.js';
  const seleniumTemplate = read(relativePath);
  assert.match(seleniumTemplate, /process\.env\.TEST_BASE_URL/);
  assert.match(seleniumTemplate, /throw\s+new\s+Error\s*\(\s*['"]TEST_BASE_URL\b/);
  assert.doesNotMatch(seleniumTemplate, /process\.env\.TEST_BASE_URL\s*(?:\|\||\?\?)/);
  assert.doesNotMatch(seleniumTemplate, /localhost|127\.0\.0\.1/i);

  const result = runRaw(process.execPath, [path.join(repoRoot, relativePath)], { env: {} });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /TEST_BASE_URL is required for Selenium tests/);
  assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /require is not defined|ERR_MODULE_NOT_FOUND/);
});

test('worked example is an honest source-repository planning walkthrough', () => {
  const skill = read('website-test-automation/SKILL.md');
  const workedExample = read('website-test-automation/references/worked-example.md');

  assert.doesNotMatch(skill, /implemented test and evidence/i);
  assert.match(workedExample, /fixture exists only in this skill's source repository/i);
  assert.match(workedExample, /not included in the installed skill package/i);
  assert.match(workedExample, /no (?:test|command)[^.\n]*(?:landed|run)/i);
  for (const unsupportedClaim of [
    /bundled fixture/i,
    /clean contract test/i,
    /landed route test/i,
    /one contract test landed/i,
    /its command\/result/i,
  ]) {
    assert.doesNotMatch(workedExample, unsupportedClaim);
  }
  assert.match(workedExample, /projects\.spec\.ts` \(unwired; runtime status not verified\)/i);
  assert.doesNotMatch(workedExample, /\b(?:test|command) (?:passed|failed|ran) as evidence\b/i);
  assert.doesNotMatch(workedExample, /\bactual (?:command )?(?:result|output):/i);

  const projectCase = workedExample.split('- id: TC-PROJ-001')[1]?.split('- id: TC-AUTH-002')[0] || '';
  assert.match(projectCase, /source_status:\s*mismatch/);
  assert.match(projectCase, /mismatch:\s*"[^"]*(?:persist|unique)[^"]*"/i);
  assert.match(projectCase, /automation:\s*\n\s+recommended:\s*false/);
  assert.match(projectCase, /target:\s*not-automated-risk-note/);
  assert.doesNotMatch(projectCase, /Response body echoes the submitted name/i);
  assert.match(workedExample, /\|\s*TC-PROJ-001\s*\|\s*automate-later\s*\|/);

  const authCase = workedExample.split('- id: TC-AUTH-002')[1]?.split('```')[0] || '';
  const authDisposition = workedExample.match(/\|\s*TC-AUTH-002\s*\|\s*([^|]+)\|/)?.[1]?.trim() || '';
  assert.equal(authDisposition, 'human-logic-risk');
  assert.match(authCase, /logic_risk:\s*true/);

  const stepEightStart = workedExample.indexOf('## Step 8');
  const codeFenceStart = workedExample.indexOf('```ts\n', stepEightStart);
  const proposedTestStart = codeFenceStart + '```ts\n'.length;
  const proposedTestEnd = workedExample.indexOf('\n```', proposedTestStart);
  assert.notEqual(stepEightStart, -1);
  assert.equal(codeFenceStart > stepEightStart, true);
  assert.equal(proposedTestEnd > proposedTestStart, true);
  const proposedTest = workedExample.slice(proposedTestStart, proposedTestEnd);
  assert.doesNotMatch(proposedTest, /Date\.now\s*\(/);
  assert.match(proposedTest, /const\s+name\s*=\s*["']tc-proj-001-roadmap["']/);
  assert.match(workedExample.slice(stepEightStart, proposedTestEnd), /isolated[^.]*reset fixture/i);
  assert.match(
    proposedTest,
    /^import\s*\{\s*GET\s*,\s*POST\s*\}\s*from\s*["']\.\.\/\.\.\/src\/app\/api\/projects\/route["']/m,
  );
  assert.match(proposedTest, /const\s+list\s*=\s*await\s+GET\s*\(\s*\)/);
  assert.match(
    proposedTest,
    /expect\(\s*await\s+list\.json\(\)\s*\)\.toEqual\([\s\S]*expect\.arrayContaining\(\[[\s\S]*expect\.objectContaining\(\{\s*name\s*\}\)/,
  );
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
  assert.equal(result.evidenceCalibration.manifestPath, null);
  assert.equal(result.evidenceCalibration.validProjectCount, 0);
  assert.equal(Array.isArray(result.evidenceCalibration.reasons), true);
  assert.equal(result.evidenceCalibration.reasons.length > 0, true);
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

test('readiness scorer does not unlock 90+ for a TODO README evidence directory', () => {
  const fixture = copiedReadinessFixture('readiness-todo-directory-');
  const evidenceDir = path.join(fixture, 'real-project-validation');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'README.md'), '# TODO\n\nReplace this example-only evidence later.\n');

  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
  assert.equal(result.contractScore >= 90, true);
  assert.equal(result.evidenceCalibration.hasProvenRealProjectEvidence, false);
  assert.equal(result.evidenceCalibration.manifestPath, null);
  assert.equal(result.evidenceCalibration.validProjectCount, 0);
  assert.equal(result.evidenceCalibration.reasons.length > 0, true);
  assert.equal(result.overallScore <= 89, true);
});

test('readiness scorer unlocks 90+ for a valid two-project evidence manifest', () => {
  const fixture = copiedReadinessFixture('readiness-valid-manifest-');
  const evidenceDir = path.join(fixture, 'real-project-validation');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceDir, 'pending-orders-evidence.md'),
    'planned 12; 12 passed; TODO follow-up\n',
  );
  fs.writeFileSync(path.join(evidenceDir, 'project-beta.md'), 'Project beta critical flow failed 1 assertion with captured diagnostics.\n');
  fs.writeFileSync(
    path.join(evidenceDir, 'evidence-manifest.json'),
    JSON.stringify({
      version: 1,
      projects: [
        {
          ...readinessProject('todo-app', 'real-project-validation/pending-orders-evidence.md'),
          target: 'https://todo.test/pending-orders',
          command: 'npm test -- pending-orders',
          outcome: 'expected 201; actual status 200; TODO follow-up',
        },
        {
          ...readinessProject('project-beta', 'real-project-validation/project-beta.md'),
          outcome: 'project-beta critical flow failed with captured diagnostics',
        },
      ],
    }),
  );

  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
  assert.equal(result.contractScore >= 90, true);
  assert.equal(result.evidenceCalibration.hasProvenRealProjectEvidence, true);
  assert.equal(result.evidenceCalibration.manifestPath, 'real-project-validation/evidence-manifest.json');
  assert.equal(result.evidenceCalibration.validProjectCount, 2);
  assert.deepEqual(result.evidenceCalibration.reasons, []);
  assert.equal(result.overallScore, result.contractScore);
  assert.match(result.level, /90\+/);
});

test('readiness scorer rejects invalid evidence manifests and unsafe evidence files', () => {
  const invalidCases = [
    {
      name: 'empty projects',
      setup: ({ writeManifest }) => writeManifest({ version: 1, projects: [] }),
    },
    {
      name: 'placeholder fields',
      setup: ({ writeManifest }) => writeManifest({
        version: 1,
        projects: [
          { id: 'TODO', target: 'TBD', command: 'not run', outcome: 'pending', evidence: ['replace-me'] },
          { id: 'example-only', target: 'placeholder', command: 'TODO', outcome: 'TBD', evidence: ['pending'] },
        ],
      }),
    },
    {
      name: 'wrapped placeholder outcome',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], outcome: 'Status: pending' }, projects[1]],
      }),
    },
    {
      name: 'weak outcome without concrete proof',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], outcome: 'worked' }, projects[1]],
      }),
    },
    ...['passed', 'verified'].map((outcome) => ({
      name: `bare ${outcome} outcome without concrete context`,
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], outcome }, projects[1]],
      }),
    })),
    {
      name: 'quoted placeholder identity',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], id: '"TODO"' }, projects[1]],
      }),
    },
    {
      name: 'equals-wrapped placeholder before concrete outcome',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], outcome: 'Status=pending; 12 tests passed' }, projects[1]],
      }),
    },
    {
      name: 'multiline expectation-only evidence',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), 'Expected:\nHTTP status 200\n');
        writeManifest({ version: 1, projects });
      },
    },
    ...[
      ['postfixed expected status', 'HTTP status 200 expected'],
      ['postfixed planned count', '12 tests planned'],
      ['postfixed should status', 'Status 200 should be returned'],
      ['bare actual does not rescue expected status', 'HTTP status 200 expected; actual unknown'],
      ['negated verified outcome', 'not verified yet'],
      ['negated completed outcome', 'never completed successfully'],
      ['future verified outcome', 'yet to be verified'],
      ['long-clause negated outcome', `not ${'remotely '.repeat(8)}verified`],
    ].map(([name, outcome]) => ({
      name,
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], outcome }, projects[1]],
      }),
    })),
    {
      name: 'weak evidence without concrete proof',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), 'looks good\n');
        writeManifest({ version: 1, projects });
      },
    },
    {
      name: 'negated evidence result',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), 'critical flow was not verified yet\n');
        writeManifest({ version: 1, projects });
      },
    },
    {
      name: 'future evidence result',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), 'critical flow is yet to be verified\n');
        writeManifest({ version: 1, projects });
      },
    },
    {
      name: 'expectation-only evidence after placeholder',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), 'TODO: expected status 200\n');
        writeManifest({ version: 1, projects });
      },
    },
    ...['id', 'target', 'command'].map((field) => ({
      name: `placeholder ${field} with concrete-result bait`,
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [
          { ...projects[0], [field]: `TODO ${field} value 12 tests passed` },
          projects[1],
        ],
      }),
    })),
    {
      name: 'wrapped placeholder evidence',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), '# Evidence\n\nTODO: replace later\n');
        writeManifest({ version: 1, projects });
      },
    },
    {
      name: 'single project',
      setup: ({ projects, writeManifest }) => writeManifest({ version: 1, projects: [projects[0]] }),
    },
    {
      name: 'duplicate project IDs',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [projects[0], { ...projects[1], id: projects[0].id }],
      }),
    },
    {
      name: 'duplicate normalized project targets',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [
          projects[0],
          { ...projects[1], target: 'HTTPS://user:pass@PROJECT-ALPHA.TEST:443/critical-flow/?run=2#fragment' },
        ],
      }),
    },
    {
      name: 'projects reuse the same evidence path',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [projects[0], { ...projects[1], evidence: projects[0].evidence }],
      }),
    },
    {
      name: 'projects reuse hard-linked evidence aliases',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.rmSync(path.join(evidenceDir, 'project-beta.md'));
        fs.linkSync(path.join(evidenceDir, 'project-alpha.md'), path.join(evidenceDir, 'project-beta.md'));
        writeManifest({ version: 1, projects });
      },
    },
    {
      name: 'duplicate normalized local project targets',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [
          { ...projects[0], target: 'Local\\Pending-Orders\\' },
          { ...projects[1], target: ' local/pending-orders/ ' },
        ],
      }),
    },
    {
      name: 'missing evidence reference',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], evidence: ['real-project-validation/missing.md'] }, projects[1]],
      }),
    },
    {
      name: 'empty evidence array',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], evidence: [] }, projects[1]],
      }),
    },
    {
      name: 'absolute evidence reference',
      setup: ({ projects, evidenceDir, writeManifest }) => writeManifest({
        version: 1,
        projects: [{ ...projects[0], evidence: [path.join(evidenceDir, 'project-alpha.md')] }, projects[1]],
      }),
    },
    {
      name: 'traversal evidence reference',
      setup: ({ projects, fixture, writeManifest }) => {
        const outside = path.join(path.dirname(fixture), `${path.basename(fixture)}-outside.md`);
        fs.writeFileSync(outside, 'External evidence must not count.\n');
        writeManifest({
          version: 1,
          projects: [{ ...projects[0], evidence: [`../${path.basename(outside)}`] }, projects[1]],
        });
      },
    },
    {
      name: 'root-internal traversal evidence reference',
      setup: ({ projects, writeManifest }) => writeManifest({
        version: 1,
        projects: [
          { ...projects[0], evidence: ['real-project-validation/nested/../project-alpha.md'] },
          projects[1],
        ],
      }),
    },
    {
      name: 'external evidence symlink',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-outside-evidence-'));
        const outside = path.join(outsideDir, 'proof.md');
        fs.writeFileSync(outside, 'External evidence must not count.\n');
        fs.rmSync(path.join(evidenceDir, 'project-alpha.md'));
        fs.symlinkSync(outside, path.join(evidenceDir, 'project-alpha.md'));
        writeManifest({ version: 1, projects });
      },
    },
    {
      name: 'empty evidence file',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), '');
        writeManifest({ version: 1, projects });
      },
    },
    {
      name: 'placeholder evidence file',
      setup: ({ projects, evidenceDir, writeManifest }) => {
        fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), 'TODO: replace this example-only evidence.\n');
        writeManifest({ version: 1, projects });
      },
    },
    {
      name: 'malformed manifest',
      setup: ({ manifestPath }) => fs.writeFileSync(manifestPath, '{'),
    },
    {
      name: 'unsupported manifest version',
      setup: ({ projects, writeManifest }) => writeManifest({ version: 2, projects }),
    },
    {
      name: 'manifest symlink',
      setup: ({ projects, manifestPath }) => {
        const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-outside-manifest-'));
        const outside = path.join(outsideDir, 'evidence-manifest.json');
        fs.writeFileSync(outside, JSON.stringify({ version: 1, projects }));
        fs.symlinkSync(outside, manifestPath);
      },
    },
  ];

  const wronglyUnlocked = [];
  const missingAuditReasons = [];
  for (const invalidCase of invalidCases) {
    const fixture = copiedReadinessFixture(`readiness-invalid-${invalidCase.name.replaceAll(' ', '-')}-`);
    const evidenceDir = path.join(fixture, 'real-project-validation');
    const manifestPath = path.join(evidenceDir, 'evidence-manifest.json');
    fs.mkdirSync(evidenceDir, { recursive: true });
    fs.writeFileSync(path.join(evidenceDir, 'project-alpha.md'), 'Project alpha passed 12 deterministic assertions.\n');
    fs.writeFileSync(path.join(evidenceDir, 'project-beta.md'), 'Project beta passed 9 deterministic assertions.\n');
    const projects = [
      readinessProject('project-alpha', 'real-project-validation/project-alpha.md'),
      readinessProject('project-beta', 'real-project-validation/project-beta.md'),
    ];
    invalidCase.setup({
      fixture,
      evidenceDir,
      manifestPath,
      projects,
      writeManifest: (manifest) => fs.writeFileSync(manifestPath, JSON.stringify(manifest)),
    });

    const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
    if (result.evidenceCalibration.hasProvenRealProjectEvidence || result.overallScore > 89) {
      wronglyUnlocked.push(invalidCase.name);
    }
    if (!Array.isArray(result.evidenceCalibration.reasons) || result.evidenceCalibration.reasons.length === 0) {
      missingAuditReasons.push(invalidCase.name);
    }
  }

  assert.deepEqual(wronglyUnlocked, []);
  assert.deepEqual(missingAuditReasons, []);
});

test('readiness scorer audits a final manifest symlink without reading its target', () => {
  const fixture = copiedReadinessFixture('readiness-manifest-symlink-audit-');
  const evidenceDir = path.join(fixture, 'case-studies');
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-manifest-symlink-target-'));
  const outsideManifest = path.join(outsideDir, 'evidence-manifest.json');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(outsideManifest, JSON.stringify({ version: 1, projects: [] }));
  fs.symlinkSync(outsideManifest, path.join(evidenceDir, 'evidence-manifest.json'));

  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
  assert.equal(result.evidenceCalibration.hasProvenRealProjectEvidence, false);
  assert.equal(result.evidenceCalibration.manifestPath, 'case-studies/evidence-manifest.json');
  const evaluation = result.evidenceCalibration.manifestEvaluations.find(
    (candidate) => candidate.manifestPath === 'case-studies/evidence-manifest.json',
  );
  assert.equal(evaluation.reasons.some((reason) => /symbolic link/i.test(reason)), true);
});

test('readiness scorer keeps multi-manifest audit fields attributable', () => {
  const fixture = copiedReadinessFixture('readiness-multi-manifest-audit-');
  const caseStudies = path.join(fixture, 'case-studies');
  const forwardResults = path.join(fixture, 'forward-test-results');
  fs.mkdirSync(caseStudies, { recursive: true });
  fs.mkdirSync(forwardResults, { recursive: true });
  fs.writeFileSync(path.join(caseStudies, 'evidence-manifest.json'), JSON.stringify({ version: 1, projects: [] }));
  fs.writeFileSync(path.join(forwardResults, 'project-alpha.md'), 'Project alpha passed 12 assertions.\n');
  fs.writeFileSync(
    path.join(forwardResults, 'evidence-manifest.json'),
    JSON.stringify({
      version: 1,
      projects: [readinessProject('project-alpha', 'forward-test-results/project-alpha.md')],
    }),
  );

  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
  assert.equal(result.evidenceCalibration.hasProvenRealProjectEvidence, false);
  assert.equal(result.evidenceCalibration.manifestPath, 'forward-test-results/evidence-manifest.json');
  assert.equal(result.evidenceCalibration.validProjectCount, 1);
  assert.equal(result.evidenceCalibration.reasons.every((reason) => reason.startsWith('forward-test-results/evidence-manifest.json:')), true);
  assert.deepEqual(
    result.evidenceCalibration.manifestEvaluations.map((evaluation) => evaluation.manifestPath),
    ['case-studies/evidence-manifest.json', 'forward-test-results/evidence-manifest.json'],
  );
});

test('readiness scorer enforces the 2 MiB text boundary', () => {
  const maxTextFileBytes = 2 * 1024 * 1024;
  const oversizedPayload = 'x'.repeat(maxTextFileBytes + 1);

  const oversizedManifestFixture = copiedReadinessFixture('readiness-oversized-manifest-');
  const oversizedManifestDir = path.join(oversizedManifestFixture, 'real-project-validation');
  fs.mkdirSync(oversizedManifestDir, { recursive: true });
  fs.writeFileSync(
    path.join(oversizedManifestDir, 'evidence-manifest.json'),
    JSON.stringify({ version: 1, projects: [], padding: oversizedPayload }),
  );
  const oversizedManifestResult = runJson(
    'node',
    ['website-test-automation/scripts/score-test-readiness.mjs', oversizedManifestFixture],
  );
  assert.equal(oversizedManifestResult.evidenceCalibration.hasProvenRealProjectEvidence, false);
  assert.equal(oversizedManifestResult.overallScore <= 89, true);
  assert.equal(oversizedManifestResult.evidenceCalibration.reasons.some((reason) => /exceeds.*2097152/i.test(reason)), true);

  const oversizedEvidenceFixture = copiedReadinessFixture('readiness-oversized-evidence-');
  const oversizedEvidenceDir = path.join(oversizedEvidenceFixture, 'real-project-validation');
  fs.mkdirSync(oversizedEvidenceDir, { recursive: true });
  fs.writeFileSync(path.join(oversizedEvidenceDir, 'project-alpha.md'), oversizedPayload);
  fs.writeFileSync(path.join(oversizedEvidenceDir, 'project-beta.md'), 'Project beta passed 9 assertions.\n');
  fs.writeFileSync(
    path.join(oversizedEvidenceDir, 'evidence-manifest.json'),
    JSON.stringify({
      version: 1,
      projects: [
        readinessProject('project-alpha', 'real-project-validation/project-alpha.md'),
        readinessProject('project-beta', 'real-project-validation/project-beta.md'),
      ],
    }),
  );
  const oversizedEvidenceResult = runJson(
    'node',
    ['website-test-automation/scripts/score-test-readiness.mjs', oversizedEvidenceFixture],
  );
  assert.equal(oversizedEvidenceResult.evidenceCalibration.hasProvenRealProjectEvidence, false);
  assert.equal(oversizedEvidenceResult.overallScore <= 89, true);
  assert.equal(oversizedEvidenceResult.evidenceCalibration.reasons.some((reason) => /exceeds.*2097152/i.test(reason)), true);

  const oversizedTextFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-oversized-text-'));
  fs.writeFileSync(
    path.join(oversizedTextFixture, 'product-understanding.md'),
    `${oversizedPayload}\nPersonas and workflows cover entities, states, and permissions.\n`,
  );
  const oversizedTextResult = runJson(
    'node',
    ['website-test-automation/scripts/score-test-readiness.mjs', oversizedTextFixture],
  );
  const productUnderstanding = oversizedTextResult.dimensions.find(
    (dimension) => dimension.key === 'product-understanding',
  );
  assert.equal(productUnderstanding.score, 0);
});

test('readiness scorer fails closed at aggregate resource budgets', () => {
  const failures = [];

  const projectFixture = copiedReadinessFixture('readiness-project-budget-');
  const projectDir = path.join(projectFixture, 'real-project-validation');
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'shared.md'), '100 checks passed with recorded assertions.\n');
  fs.writeFileSync(
    path.join(projectDir, 'evidence-manifest.json'),
    JSON.stringify({
      version: 1,
      projects: Array.from({ length: 101 }, (_, index) =>
        readinessProject(`project-${index}`, 'real-project-validation/shared.md')),
    }),
  );
  const projectResult = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', projectFixture]);
  if (projectResult.evidenceCalibration.hasProvenRealProjectEvidence ||
      !projectResult.evidenceCalibration.reasons.some((reason) => /projects?.*100/i.test(reason))) {
    failures.push('projects per manifest');
  }

  const refFixture = copiedReadinessFixture('readiness-ref-budget-');
  const refDir = path.join(refFixture, 'real-project-validation');
  fs.mkdirSync(refDir, { recursive: true });
  fs.writeFileSync(path.join(refDir, 'project-alpha.md'), '21 checks passed with recorded assertions.\n');
  fs.writeFileSync(path.join(refDir, 'project-beta.md'), '9 checks passed with recorded assertions.\n');
  const refProjects = [
    {
      ...readinessProject('project-alpha', 'real-project-validation/project-alpha.md'),
      evidence: Array.from({ length: 21 }, () => 'real-project-validation/project-alpha.md'),
    },
    readinessProject('project-beta', 'real-project-validation/project-beta.md'),
  ];
  fs.writeFileSync(
    path.join(refDir, 'evidence-manifest.json'),
    JSON.stringify({ version: 1, projects: refProjects }),
  );
  const refResult = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', refFixture]);
  if (refResult.evidenceCalibration.hasProvenRealProjectEvidence ||
      !refResult.evidenceCalibration.reasons.some((reason) => /evidence refs?.*20|evidence.*20/i.test(reason))) {
    failures.push('evidence refs per project');
  }

  const cacheFixture = copiedReadinessFixture('readiness-evidence-cache-');
  const cacheDir = path.join(cacheFixture, 'real-project-validation');
  fs.mkdirSync(cacheDir, { recursive: true });
  const alphaPrefix = '20 checks passed for alpha with recorded assertions.\n';
  const betaPrefix = '20 checks passed for beta with recorded assertions.\n';
  fs.writeFileSync(
    path.join(cacheDir, 'alpha-2mib.md'),
    alphaPrefix + 'x'.repeat(2 * 1024 * 1024 - Buffer.byteLength(alphaPrefix)),
  );
  fs.writeFileSync(
    path.join(cacheDir, 'beta-2mib.md'),
    betaPrefix + 'x'.repeat(2 * 1024 * 1024 - Buffer.byteLength(betaPrefix)),
  );
  fs.writeFileSync(
    path.join(cacheDir, 'evidence-manifest.json'),
    JSON.stringify({
      version: 1,
      projects: [
        {
          ...readinessProject('project-alpha', 'real-project-validation/alpha-2mib.md'),
          evidence: Array.from({ length: 20 }, () => 'real-project-validation/alpha-2mib.md'),
        },
        {
          ...readinessProject('project-beta', 'real-project-validation/beta-2mib.md'),
          evidence: Array.from({ length: 20 }, () => 'real-project-validation/beta-2mib.md'),
        },
      ],
    }),
  );
  const cacheResult = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', cacheFixture]);
  const cacheUsage = cacheResult.evidenceCalibration.manifestEvaluations[0]?.resourceUsage;
  if (!cacheResult.evidenceCalibration.hasProvenRealProjectEvidence || !cacheUsage ||
      cacheUsage.evidenceRefCount !== 40 || cacheUsage.uniqueEvidenceFileCount !== 2 ||
      cacheUsage.evidenceCacheHits !== 38 || cacheUsage.uniqueEvidenceBytes !== 4 * 1024 * 1024) {
    failures.push('evidence cache and unique byte budget');
  }

  const textFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-text-budget-'));
  const oneMiB = 'x'.repeat(1024 * 1024);
  for (let index = 0; index < 33; index += 1) {
    fs.writeFileSync(path.join(textFixture, `evidence-${String(index).padStart(2, '0')}.md`), oneMiB);
  }
  const textResult = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', textFixture]);
  if (!textResult.resourceBudget || textResult.resourceBudget.usage.scoredTextBytes > 32 * 1024 * 1024 ||
      !textResult.resourceBudget.warnings.some((warning) => /32 MiB|33554432/.test(warning))) {
    failures.push('aggregate scored text');
  }

  const candidateFixture = copiedReadinessFixture('readiness-manifest-candidate-budget-');
  const outsideManifest = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'manifest-candidate-target-')), 'manifest.json');
  fs.writeFileSync(outsideManifest, JSON.stringify({ version: 1, projects: [] }));
  for (let index = 0; index < 21; index += 1) {
    const candidateDir = path.join(candidateFixture, 'case-studies', `candidate-${index}`);
    fs.mkdirSync(candidateDir, { recursive: true });
    fs.symlinkSync(outsideManifest, path.join(candidateDir, 'evidence-manifest.json'));
  }
  const candidateResult = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', candidateFixture]);
  if (!candidateResult.resourceBudget.warnings.some((warning) => /manifest candidate.*20/i.test(warning)) ||
      candidateResult.evidenceCalibration.manifestEvaluations.length > 20) {
    failures.push('manifest candidate budget');
  }

  assert.deepEqual(failures, []);
});

test('readiness scorer ignores external keyword text reached through a normal text symlink', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-external-text-symlink-'));
  const caseStudies = path.join(fixture, 'case-studies');
  const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-external-keywords-'));
  const outside = path.join(outsideDir, 'product-understanding.md');
  fs.mkdirSync(caseStudies, { recursive: true });
  fs.writeFileSync(
    outside,
    [
      '# Product Understanding',
      'Personas and workflows cover entities, states, and permissions.',
      'Requirements Source Ranking records source_status mismatch handling.',
      'Figma evidence includes assumptions and unknowns.',
    ].join('\n'),
  );
  fs.symlinkSync(outside, path.join(caseStudies, 'product-understanding.md'));

  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
  const productUnderstanding = result.dimensions.find((dimension) => dimension.key === 'product-understanding');
  assert.equal(productUnderstanding.score, 0);
  assert.equal(result.evidenceCalibration.hasProvenRealProjectEvidence, false);
  assert.equal(result.overallScore <= 89, true);
});

test('readiness scorer does not treat a negated scoped-skip phrase as browser applicability evidence', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'readiness-browser-negation-'));
  fs.writeFileSync(
    path.join(fixture, 'browser-tool-adapters.md'),
    [
      '# Browser Adapter',
      'Browser-agent smoke evidence is required.',
      'Capture screenshots, console/network results, and mobile horizontal overflow.',
      'There is no scoped-skip reason.',
    ].join('\n'),
  );

  const result = runJson('node', ['website-test-automation/scripts/score-test-readiness.mjs', fixture]);
  const browser = result.dimensions.find((dimension) => dimension.key === 'browser-smoke-evidence');
  assert.equal(browser.score, 75);
  assert.equal(browser.missing.includes('browser evidence applicability condition'), true);
});

test('readiness model documents the structured 90+ evidence gate and conditional browser workstream', () => {
  const model = read('website-test-automation/references/readiness-model.md');
  assert.match(model, /evidence-manifest\.json/);
  assert.match(model, /at least two|minimum of two/i);
  assert.match(model, /unique project IDs[^\n]*unique project targets/i);
  assert.match(model, /Status:[^\n]*12 tests passed|12 tests passed[^\n]*TODO follow-up/i);
  assert.match(model, /outcome or evidence report/i);
  assert.match(model, /concrete observed result/i);
  assert.match(model, /evidence path[^\n]*not reused/i);
  assert.match(model, /Resource Budgets/);
  assert.match(model, /10,000[^\n]*32 MiB[^\n]*20 manifest candidates/i);
  assert.match(model, /100 projects[^\n]*20 evidence refs[^\n]*200 total refs[^\n]*16 MiB/i);
  assert.match(model, /2 MiB/);
  assert.match(model, /ordinary non-symlink/i);
  assert.match(model, /Browser Evidence Condition/);
  assert.match(model, /candidate[^\n]*not[^\n]*runtime quality guarantee/i);
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

test('detect-web-test-stack aggregates safe workspace packages without overwriting scripts', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-stack-'));
  fs.mkdirSync(path.join(fixture, 'apps', 'web'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'apps', 'api'), { recursive: true });
  fs.writeFileSync(
    path.join(fixture, 'package.json'),
    JSON.stringify({
      name: 'workspace-root',
      packageManager: 'pnpm@9.7.0',
      workspaces: ['apps/*'],
      scripts: { test: 'vitest run --root' },
      devDependencies: { vitest: '2.0.0' },
    }),
  );
  fs.writeFileSync(
    path.join(fixture, 'apps', 'web', 'package.json'),
    JSON.stringify({
      name: 'web-app',
      scripts: { test: 'vitest run', 'test:e2e': 'playwright test' },
      dependencies: { next: '15.0.0', react: '19.0.0' },
      devDependencies: { '@playwright/test': '1.50.0', vitest: '2.0.0' },
    }),
  );
  fs.writeFileSync(
    path.join(fixture, 'apps', 'api', 'package.json'),
    JSON.stringify({
      name: 'api-service',
      scripts: { test: 'jest --runInBand' },
      dependencies: { express: '5.0.0' },
      devDependencies: { jest: '30.0.0' },
    }),
  );

  const result = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', fixture]);
  assert.equal(result.packageManager, 'pnpm');
  assert.equal(result.packageJsonStatus, 'parsed');
  assert.equal(result.hasPackageJson, true);
  assert.deepEqual(result.frameworks.sort(), ['express', 'nextjs', 'react']);
  assert.deepEqual(result.testFrameworks.sort(), ['jest', 'playwright', 'vitest']);
  assert.deepEqual(result.browserTools, ['playwright-runner']);
  assert.equal(result.scripts.test, 'vitest run --root');
  assert.equal(result.scriptsByPackage['.'].test, 'vitest run --root');
  assert.equal(result.scriptsByPackage['apps/api'].test, 'jest --runInBand');
  assert.equal(result.scriptsByPackage['apps/web'].test, 'vitest run');
  assert.deepEqual(result.packages.map((entry) => entry.path), ['.', 'apps/api', 'apps/web']);
  assert.deepEqual(result.packages.map((entry) => entry.packageJsonStatus), ['parsed', 'parsed', 'parsed']);
  assert.equal(result.workspace.detected, true);
  assert.deepEqual(result.workspace.patterns, ['apps/*']);
  assert.equal(result.workspace.packageCount, 2);
});

test('detect-web-test-stack supports object and pnpm workspace declarations', () => {
  const objectFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-object-stack-'));
  fs.mkdirSync(path.join(objectFixture, 'packages', 'ui'), { recursive: true });
  fs.writeFileSync(
    path.join(objectFixture, 'package.json'),
    JSON.stringify({ workspaces: { packages: ['packages/*'] } }),
  );
  fs.writeFileSync(
    path.join(objectFixture, 'packages', 'ui', 'package.json'),
    JSON.stringify({ name: 'ui', dependencies: { vue: '3.0.0' }, devDependencies: { cypress: '14.0.0' } }),
  );
  const objectResult = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', objectFixture]);
  assert.equal(objectResult.workspace.detected, true);
  assert.deepEqual(objectResult.workspace.patterns, ['packages/*']);
  assert.equal(objectResult.frameworks.includes('vue'), true);
  assert.equal(objectResult.testFrameworks.includes('cypress'), true);

  const pnpmFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-pnpm-stack-'));
  fs.mkdirSync(path.join(pnpmFixture, 'modules', 'tool'), { recursive: true });
  fs.writeFileSync(path.join(pnpmFixture, 'package.json'), JSON.stringify({ name: 'pnpm-root' }));
  fs.writeFileSync(
    path.join(pnpmFixture, 'pnpm-workspace.yaml'),
    ['packages:', "  - 'modules/*'", '  - "ignored/**" # harmless missing pattern'].join('\n'),
  );
  fs.writeFileSync(
    path.join(pnpmFixture, 'modules', 'tool', 'package.json'),
    JSON.stringify({ name: 'tool', dependencies: { svelte: '5.0.0' }, devDependencies: { vitest: '2.0.0' } }),
  );
  const pnpmResult = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', pnpmFixture]);
  assert.equal(pnpmResult.packageManager, 'pnpm');
  assert.deepEqual(pnpmResult.workspace.patterns, ['ignored/**', 'modules/*']);
  assert.equal(pnpmResult.packages.some((entry) => entry.path === 'modules/tool'), true);
  assert.equal(pnpmResult.frameworks.includes('svelte'), true);
  assert.equal(pnpmResult.testFrameworks.includes('vitest'), true);
});

test('detect-web-test-stack honors globstar, exclusions, and fail-closed pattern limits', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-glob-stack-'));
  for (const packagePath of ['apps/web', 'packages/nested/tool', 'packages/excluded/private']) {
    fs.mkdirSync(path.join(fixture, packagePath), { recursive: true });
  }
  fs.writeFileSync(
    path.join(fixture, 'package.json'),
    JSON.stringify({
      workspaces: ['apps/**/web', 'packages/**', '!packages/excluded/**'],
    }),
  );
  fs.writeFileSync(
    path.join(fixture, 'apps', 'web', 'package.json'),
    JSON.stringify({ name: 'web', dependencies: { next: '15.0.0' } }),
  );
  fs.writeFileSync(
    path.join(fixture, 'packages', 'nested', 'tool', 'package.json'),
    JSON.stringify({ name: 'tool', dependencies: { fastify: '5.0.0' } }),
  );
  fs.writeFileSync(
    path.join(fixture, 'packages', 'excluded', 'private', 'package.json'),
    JSON.stringify({ name: 'excluded', devDependencies: { jest: '30.0.0' } }),
  );

  const result = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', fixture]);
  assert.equal(result.packages.some((entry) => entry.path === 'apps/web'), true);
  assert.equal(result.packages.some((entry) => entry.path === 'packages/nested/tool'), true);
  assert.equal(result.packages.some((entry) => entry.path === 'packages/excluded/private'), false);
  assert.equal(result.testFrameworks.includes('jest'), false);
  assert.equal(result.workspace.discoveryStatus, 'complete');

  const unsupportedFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-exotic-stack-'));
  fs.mkdirSync(path.join(unsupportedFixture, 'apps', 'web'), { recursive: true });
  fs.writeFileSync(
    path.join(unsupportedFixture, 'package.json'),
    JSON.stringify({ workspaces: ['apps/?eb'] }),
  );
  fs.writeFileSync(
    path.join(unsupportedFixture, 'apps', 'web', 'package.json'),
    JSON.stringify({ dependencies: { next: '15.0.0' } }),
  );
  const unsupportedResult = runJson(
    'node',
    ['website-test-automation/scripts/detect-web-test-stack.mjs', unsupportedFixture],
  );
  assert.equal(unsupportedResult.packages.some((entry) => entry.path === 'apps/web'), false);
  assert.equal(unsupportedResult.workspace.discoveryStatus, 'unsupported-patterns');
  assert.match(unsupportedResult.confidenceNotes.join('\n'), /Unsupported workspace pattern/);

  const excessiveFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-pattern-budget-stack-'));
  fs.writeFileSync(
    path.join(excessiveFixture, 'package.json'),
    JSON.stringify({ workspaces: Array.from({ length: 129 }, (_, index) => `packages/package-${index}`) }),
  );
  const excessiveResult = runJson(
    'node',
    ['website-test-automation/scripts/detect-web-test-stack.mjs', excessiveFixture],
  );
  assert.equal(excessiveResult.workspace.discoveryStatus, 'pattern-budget-exceeded');
  assert.match(excessiveResult.confidenceNotes.join('\n'), /pattern limit/i);
});

test('detect-web-test-stack preserves oversized package status', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'oversized-package-stack-'));
  fs.writeFileSync(
    path.join(fixture, 'package.json'),
    JSON.stringify({ padding: 'x'.repeat(2 * 1024 * 1024) }),
  );

  const result = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', fixture]);
  assert.equal(result.hasPackageJson, true);
  assert.equal(result.packageJsonStatus, 'oversized');
  assert.doesNotMatch(result.confidenceNotes.join('\n'), /Malformed package\.json/);
});

test('detect-web-test-stack distinguishes malformed package files and continues workspaces', () => {
  const malformedRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'malformed-root-stack-'));
  fs.writeFileSync(path.join(malformedRoot, 'package.json'), '{');
  const rootResult = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', malformedRoot]);
  assert.equal(rootResult.hasPackageJson, true);
  assert.equal(rootResult.packageJsonStatus, 'malformed');
  assert.match(rootResult.confidenceNotes.join('\n'), /Malformed package\.json: package\.json/);
  assert.doesNotMatch(rootResult.confidenceNotes.join('\n'), /No package\.json found/);

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'malformed-child-stack-'));
  fs.mkdirSync(path.join(fixture, 'apps', 'broken'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'apps', 'good'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ workspaces: ['apps/*'] }));
  fs.writeFileSync(path.join(fixture, 'apps', 'broken', 'package.json'), '{');
  fs.writeFileSync(
    path.join(fixture, 'apps', 'good', 'package.json'),
    JSON.stringify({ name: 'good', dependencies: { nuxt: '4.0.0' }, devDependencies: { vitest: '2.0.0' } }),
  );
  const result = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', fixture]);
  assert.equal(result.packages.find((entry) => entry.path === 'apps/broken')?.packageJsonStatus, 'malformed');
  assert.equal(result.packages.find((entry) => entry.path === 'apps/good')?.packageJsonStatus, 'parsed');
  assert.equal(result.frameworks.includes('nuxt'), true);
  assert.equal(result.testFrameworks.includes('vitest'), true);
  assert.match(result.confidenceNotes.join('\n'), /Malformed package\.json: apps\/broken\/package\.json/);
});

test('detect-web-test-stack rejects package, workspace, config, and lock symlink escapes', () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-outside-'));
  fs.writeFileSync(
    path.join(outside, 'package.json'),
    JSON.stringify({ packageManager: 'pnpm@9', dependencies: { next: '15.0.0' }, devDependencies: { '@playwright/test': '1.50.0' } }),
  );
  fs.writeFileSync(path.join(outside, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n');
  fs.writeFileSync(path.join(outside, 'pnpm-workspace.yaml'), "packages:\n  - 'apps/*'\n");
  fs.writeFileSync(path.join(outside, 'playwright.config.ts'), 'export default {};\n');

  const rootLinkFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-root-link-'));
  fs.symlinkSync(path.join(outside, 'package.json'), path.join(rootLinkFixture, 'package.json'));
  fs.symlinkSync(path.join(outside, 'pnpm-workspace.yaml'), path.join(rootLinkFixture, 'pnpm-workspace.yaml'));
  const rootLinkResult = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', rootLinkFixture]);
  assert.equal(rootLinkResult.hasPackageJson, true);
  assert.equal(rootLinkResult.packageJsonStatus, 'symlink-rejected');
  assert.equal(rootLinkResult.workspace.detected, false);
  assert.deepEqual(rootLinkResult.frameworks, []);
  assert.deepEqual(rootLinkResult.testFrameworks, []);

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-workspace-links-'));
  fs.mkdirSync(path.join(fixture, 'apps', 'bad'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'apps', 'good'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'package.json'), JSON.stringify({ workspaces: ['apps/*'] }));
  fs.symlinkSync(outside, path.join(fixture, 'apps', 'escape'));
  fs.symlinkSync(path.join(outside, 'package.json'), path.join(fixture, 'apps', 'bad', 'package.json'));
  fs.writeFileSync(
    path.join(fixture, 'apps', 'good', 'package.json'),
    JSON.stringify({ name: 'good', dependencies: { express: '5.0.0' } }),
  );
  fs.symlinkSync(path.join(outside, 'playwright.config.ts'), path.join(fixture, 'apps', 'good', 'playwright.config.ts'));
  fs.symlinkSync(path.join(outside, 'pnpm-lock.yaml'), path.join(fixture, 'pnpm-lock.yaml'));

  const result = runJson('node', ['website-test-automation/scripts/detect-web-test-stack.mjs', fixture]);
  assert.equal(result.packageManager, 'unknown');
  assert.equal(result.packages.some((entry) => entry.path === 'apps/escape'), false);
  assert.equal(result.packages.find((entry) => entry.path === 'apps/bad')?.packageJsonStatus, 'symlink-rejected');
  assert.deepEqual(result.frameworks, ['express']);
  assert.deepEqual(result.browserTools, []);
  assert.match(result.confidenceNotes.join('\n'), /symlink/i);
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

test('route-inventory recognizes modern Next.js route methods without comment false positives', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'api-method-route-inventory-'));
  fs.mkdirSync(path.join(fixture, 'app', 'api', 'items'), { recursive: true });
  fs.writeFileSync(
    path.join(fixture, 'app', 'api', 'items', 'route.ts'),
    [
      'export function GET() { return Response.json([]); }',
      'export const POST = async () => Response.json({}, { status: 201 });',
      'export const HEAD = () => new Response(null);',
      'export async function OPTIONS() { return new Response(null); }',
      '// export async function DELETE() { return new Response(null); }',
      '/* export const PATCH = async () => new Response(null); */',
    ].join('\n'),
  );
  fs.mkdirSync(path.join(fixture, 'app', 'api', 'commented'), { recursive: true });
  fs.writeFileSync(
    path.join(fixture, 'app', 'api', 'commented', 'route.ts'),
    '// export async function DELETE() { return new Response(null); }\n',
  );

  const result = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', fixture]);
  const routes = result.routes.map((route) => route.route);
  assert.equal(routes.includes('GET|POST|HEAD|OPTIONS /api/items'), true);
  assert.equal(routes.includes('/api/commented'), true);
  assert.equal(routes.some((route) => /DELETE|PATCH/.test(route)), false);
});

test('route-inventory normalizes parallel and intercepting Next.js route segments', () => {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'next-segment-route-inventory-'));
  const pages = [
    ['app', 'dashboard', '@modal', 'settings', 'page.tsx'],
    ['app', 'feed', '@modal', '(.)compose', 'page.tsx'],
    ['app', 'feed', '@modal', '(..)photo', '[id]', 'page.tsx'],
    ['app', 'account', 'settings', '@modal', '(..)(..)help', 'page.tsx'],
    ['app', 'account', '@modal', '(...)login', 'page.tsx'],
  ];
  for (const segments of pages) {
    const file = path.join(fixture, ...segments);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'export default function Page() { return null; }\n');
  }

  const result = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', fixture]);
  const routes = result.routes.map((route) => route.route);
  assert.equal(routes.includes('/dashboard/settings'), true);
  assert.equal(routes.includes('/feed/compose'), true);
  assert.equal(routes.includes('/photo/[id]'), true);
  assert.equal(routes.includes('/help'), true);
  assert.equal(routes.includes('/login'), true);
  assert.equal(routes.some((route) => route.includes('@modal') || route.includes('(.)')), false);
});

test('route-inventory ignores commented route hints and rejects route symlinks', () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'route-inventory-outside-'));
  fs.writeFileSync(path.join(outside, 'page.tsx'), 'export default function Leaked() { return null; }\n');

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'safe-route-inventory-'));
  fs.mkdirSync(path.join(fixture, 'server'), { recursive: true });
  fs.writeFileSync(
    path.join(fixture, 'server', 'routes.ts'),
    [
      "app.get('/live', handler);",
      "const liveRoute = <Route path='/client-live' />;",
      "// app.post('/commented-server', handler);",
      "/* const hiddenRoute = <Route path='/commented-client' />; */",
    ].join('\n'),
  );
  fs.mkdirSync(path.join(fixture, 'app', 'leaked'), { recursive: true });
  fs.symlinkSync(path.join(outside, 'page.tsx'), path.join(fixture, 'app', 'leaked', 'page.tsx'));
  fs.symlinkSync(outside, path.join(fixture, 'app', 'escaped-directory'));

  const result = runJson('node', ['website-test-automation/scripts/route-inventory.mjs', fixture]);
  const routes = result.routes.map((route) => route.route);
  assert.equal(routes.includes('GET /live'), true);
  assert.equal(routes.includes('/client-live'), true);
  assert.equal(routes.includes("POST /commented-server"), false);
  assert.equal(routes.includes('/commented-client'), false);
  assert.equal(routes.includes('/leaked'), false);
  assert.match(result.notes.join('\n'), /symlink/i);
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

test('canonical case routing fields are required, typed, and enum validated', () => {
  const without = (field) => {
    const testCase = validTestCase();
    delete testCase[field];
    return testCase;
  };
  const { result, errorsFor } = validateCaseFiles('testcase-routing-fields-', {
    'missing-surface': without('surface'),
    'missing-layer': without('layer'),
    'missing-disposition': without('disposition'),
    'typed-surface': validTestCase({ surface: [] }),
    'invalid-surface': validTestCase({ surface: 'desktop' }),
    'typed-layer': validTestCase({ layer: false }),
    'invalid-layer': validTestCase({ layer: 'database' }),
    'typed-disposition': validTestCase({ disposition: 42 }),
    'invalid-disposition': validTestCase({ disposition: 'ship-it' }),
  });
  assert.equal(result.status, 1, `invalid routing fields must fail\n${result.stdout}\n${result.stderr}`);
  for (const [name, field] of [
    ['missing-surface', 'surface'],
    ['missing-layer', 'layer'],
    ['missing-disposition', 'disposition'],
  ]) {
    assert.match(errorsFor(name), new RegExp(`missing required field: ${field}`));
  }
  for (const [name, field] of [
    ['typed-surface', 'surface'],
    ['typed-layer', 'layer'],
    ['typed-disposition', 'disposition'],
  ]) {
    const errors = errorsFor(name);
    assert.match(errors, new RegExp(`${field} must be a string`));
    assert.doesNotMatch(errors, new RegExp(`invalid ${field}:`));
  }
  for (const [name, field, value] of [
    ['invalid-surface', 'surface', 'desktop'],
    ['invalid-layer', 'layer', 'database'],
    ['invalid-disposition', 'disposition', 'ship-it'],
  ]) {
    assert.match(errorsFor(name), new RegExp(`invalid ${field}: "${value}"`));
  }
});

test('canonical case routing rejects unresolved risk automation conflicts', () => {
  const scenarios = {
    'human-without-risk': {
      testCase: validTestCase({
        disposition: 'human-logic-risk',
        logic_risk: false,
        automation: { recommended: false, target: 'not-automated-risk-note', preferred_tools: [] },
      }),
      expected: 'disposition human-logic-risk requires logic_risk: true',
    },
    'risk-without-reason': {
      testCase: validTestCase({
        disposition: 'exploratory',
        logic_risk: true,
        why_unreasonable: '',
        automation: { recommended: false, target: 'exploratory', preferred_tools: [] },
      }),
      expected: 'logic_risk true requires non-empty why_unreasonable',
    },
    'mismatch-automate-now': {
      testCase: validTestCase({
        source_status: 'mismatch',
        mismatch: 'Requirements and implementation disagree.',
        disposition: 'automate-now',
        automation: { recommended: true, target: 'api-or-component', preferred_tools: [] },
      }),
      expected: 'source_status mismatch cannot use disposition automate-now',
    },
    'mismatch-durable': {
      testCase: validTestCase({
        source_status: 'mismatch',
        mismatch: 'Requirements and implementation disagree.',
        disposition: 'automate-later',
        automation: { recommended: false, target: 'durable-regression', preferred_tools: [] },
      }),
      expected: 'source_status mismatch cannot use automation.target durable-regression',
    },
    'logic-risk-automate-now': {
      testCase: validTestCase({
        logic_risk: true,
        why_unreasonable: 'The current behavior is unsafe for users.',
        disposition: 'automate-now',
        automation: { recommended: true, target: 'api-or-component', preferred_tools: [] },
      }),
      expected: 'logic_risk true cannot use disposition automate-now',
    },
    'logic-risk-durable': {
      testCase: validTestCase({
        logic_risk: true,
        why_unreasonable: 'The current behavior is unsafe for users.',
        disposition: 'exploratory',
        automation: { recommended: false, target: 'durable-regression', preferred_tools: [] },
      }),
      expected: 'logic_risk true cannot use automation.target durable-regression',
    },
  };
  const { result, errorsFor } = validateCaseFiles(
    'testcase-routing-conflicts-',
    Object.fromEntries(Object.entries(scenarios).map(([name, scenario]) => [name, scenario.testCase])),
  );
  assert.equal(result.status, 1, `routing conflicts must fail\n${result.stdout}\n${result.stderr}`);
  for (const [name, scenario] of Object.entries(scenarios)) {
    assert.match(errorsFor(name), new RegExp(scenario.expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('canonical dispositions reject contradictory legacy automation projections', () => {
  const incompatible = {
    'automate-now': validTestCase({
      disposition: 'automate-now',
      automation: { recommended: false, target: 'manual', preferred_tools: [] },
    }),
    'browser-smoke': validTestCase({
      disposition: 'browser-smoke',
      automation: { recommended: false, target: 'durable-regression', preferred_tools: [] },
    }),
    'exploratory': validTestCase({
      disposition: 'exploratory',
      automation: { recommended: true, target: 'manual', preferred_tools: [] },
    }),
    'manual': validTestCase({
      disposition: 'manual',
      automation: { recommended: true, target: 'exploratory', preferred_tools: [] },
    }),
    'provider-live': validTestCase({
      disposition: 'provider-live',
      automation: { recommended: true, target: 'exploratory', preferred_tools: [] },
    }),
    'automate-later': validTestCase({
      disposition: 'automate-later',
      automation: { recommended: true, target: 'manual', preferred_tools: [] },
    }),
    'human-logic-risk': validTestCase({
      disposition: 'human-logic-risk',
      logic_risk: true,
      why_unreasonable: 'The current behavior is unsafe for users.',
      automation: { recommended: true, target: 'manual', preferred_tools: [] },
    }),
    'risk-note': validTestCase({
      disposition: 'risk-note',
      automation: { recommended: true, target: 'manual', preferred_tools: [] },
    }),
    'not-in-scope': validTestCase({
      disposition: 'not-in-scope',
      automation: { recommended: true, target: 'manual', preferred_tools: [] },
    }),
  };
  const expected = {
    'automate-now': { recommended: 'true', targets: 'durable-regression, api-or-component' },
    'browser-smoke': { recommended: 'true', targets: 'browser-agent-smoke' },
    'exploratory': { recommended: 'false', targets: 'exploratory' },
    'manual': { recommended: 'false', targets: 'manual' },
    'provider-live': { recommended: 'false', targets: 'manual' },
    'automate-later': { recommended: 'false', targets: 'not-automated-risk-note' },
    'human-logic-risk': { recommended: 'false', targets: 'not-automated-risk-note' },
    'risk-note': { recommended: 'false', targets: 'not-automated-risk-note' },
    'not-in-scope': { recommended: 'false', targets: 'not-automated-risk-note' },
  };
  const { result, errorsFor } = validateCaseFiles('testcase-legacy-routing-conflicts-', incompatible);
  assert.equal(result.status, 1, `legacy routing conflicts must fail\n${result.stdout}\n${result.stderr}`);
  for (const [disposition, projection] of Object.entries(expected)) {
    const errors = errorsFor(disposition);
    assert.match(errors, new RegExp(`disposition ${disposition} requires automation\\.recommended=${projection.recommended}`));
    assert.match(errors, new RegExp(`disposition ${disposition} requires automation\\.target: ${projection.targets}`));
  }
});

test('canonical dispositions accept matching or omitted legacy automation projections', () => {
  const compatible = {
    'automate-now': [true, 'durable-regression'],
    'browser-smoke': [true, 'browser-agent-smoke'],
    'exploratory': [false, 'exploratory'],
    'manual': [false, 'manual'],
    'provider-live': [false, 'manual'],
    'automate-later': [false, 'not-automated-risk-note'],
    'human-logic-risk': [false, 'not-automated-risk-note'],
    'risk-note': [false, 'not-automated-risk-note'],
    'not-in-scope': [false, 'not-automated-risk-note'],
  };
  const cases = Object.fromEntries(
    Object.entries(compatible).map(([disposition, [recommended, target]]) => [
      disposition,
      validTestCase({
        disposition,
        logic_risk: disposition === 'human-logic-risk',
        why_unreasonable: disposition === 'human-logic-risk' ? 'The current behavior is unsafe for users.' : '',
        preconditions: recommended ? ['The test environment is controlled.'] : [],
        automation: { recommended, target, preferred_tools: [] },
      }),
    ]),
  );
  cases['legacy-omitted'] = validTestCase({ automation: {} });
  cases['recommended-only'] = validTestCase({
    disposition: 'automate-now',
    preconditions: ['The test environment is controlled.'],
    automation: { recommended: true },
  });
  cases['target-only'] = validTestCase({
    disposition: 'browser-smoke',
    automation: { target: 'browser-agent-smoke' },
  });

  const { result } = validateCaseFiles('testcase-legacy-routing-compatible-', cases);
  assert.equal(result.status, 0, `matching or omitted legacy projections must pass\n${result.stdout}\n${result.stderr}`);
});

test('canonical case routing fields stay aligned across case artifacts', () => {
  const artifacts = [
    'website-test-automation/assets/testcase-template.yaml',
    'website-test-automation/references/testcase-schema.md',
    'website-test-automation/references/test-case-authoring.md',
    'website-test-automation/references/output-templates.md',
    'docs/PRD.md',
  ];
  for (const rel of artifacts) {
    const contents = read(rel);
    for (const field of ['surface:', 'layer:', 'disposition:']) {
      assert.match(contents, new RegExp(`^\\s*${field}`, 'm'), `${rel} must include ${field}`);
    }
  }

  const schemaReference = read('website-test-automation/references/testcase-schema.md');
  assert.match(schemaReference, /## Migration And Compatibility/);
  assert.match(schemaReference, /existing case artifacts[\s\S]*must add[\s\S]*surface[\s\S]*layer[\s\S]*disposition/i);
  assert.match(schemaReference, /automation\.recommended[\s\S]*automation\.target[\s\S]*optional compatibility projections/i);

  const responseCase = read('website-test-automation/references/output-templates.md')
    .split('## Source-Backed Test Cases')[1]
    .split('## Automation Selection')[0];
  assert.match(responseCase, /disposition:\s*automate-now[\s\S]*recommended:\s*true[\s\S]*target:\s*durable-regression/);

  const prd = read('docs/PRD.md');
  const fr2 = prd.match(/### FR-2: Test Case Authoring Core\n([\s\S]*?)(?=\n### )/)?.[1] || '';
  assert.notEqual(fr2, '', 'docs/PRD.md must keep the FR-2 required-field contract');
  for (const field of ['surface', 'layer', 'disposition']) {
    assert.match(fr2, new RegExp(`\\b${field}\\b`, 'i'), `FR-2 must require ${field}`);
  }

  const workedExample = read('website-test-automation/references/worked-example.md');
  for (const field of ['surface:', 'layer:', 'disposition:']) {
    assert.equal((workedExample.match(new RegExp(`^\\s*${field}`, 'gm')) || []).length, 2, `${field} must persist on both worked-example cases`);
  }

  const routingReferences = [
    workedExample,
    read('website-test-automation/references/workflow.md'),
    read('website-test-automation/references/scenario-workflows.md'),
    read('website-test-automation/references/output-templates.md'),
  ].join('\n');
  assert.doesNotMatch(routingReferences, /`?(?:manual\/live|risk-note\/not-in-scope)`?/i);
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
  assert.equal(parsed.totalCases, 5);
  const errors = parsed.errors.join('\n');
  assert.match(errors, /invalid priority: "P5"/);
  assert.match(errors, /invalid type: "smoke"/);
  assert.match(errors, /invalid source_status: "guessed"/);
  assert.match(errors, /invalid surface: "desktop"/);
  assert.match(errors, /invalid layer: "database"/);
  assert.match(errors, /invalid disposition: "ship-it"/);
  assert.match(errors, /invalid automation\.target: "someday"/);
  assert.match(errors, /missing required field: id/);
  assert.match(errors, /missing required field: disposition/);
  assert.match(errors, /P0 case needs at least one source evidence/);
  assert.match(errors, /disposition human-logic-risk requires logic_risk: true/);
  assert.match(errors, /logic_risk true requires non-empty why_unreasonable/);
  assert.match(errors, /source_status mismatch cannot use disposition automate-now/);
  assert.match(errors, /source_status mismatch cannot use automation\.target durable-regression/);
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
      'surface: api',
      'layer: api',
      'disposition: manual',
      'type: api',
      'priority: P0',
      'steps:',
      '  - call endpoint',
      'expected:',
      '  - returns 200',
      'automation:',
      '  recommended: false',
      '  target: manual',
      '---',
      'id: TC-A-002',
      'title: Second',
      'source:',
      '  docs: []',
      '  code: ["src/x.ts"]',
      '  observed: []',
      'source_status: inferred',
      'surface: web',
      'layer: component',
      'disposition: manual',
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
        surface: 'web',
        layer: 'browser-runner',
        disposition: 'manual',
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

  // Scalar array members are preserved and rejected by the shared schema.
  fs.writeFileSync(path.join(dir, 'scalars.json'), '[1, "two"]');
  const scalarResult = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', path.join(dir, 'scalars.json')]);
  assert.equal(scalarResult.status, 1);
  const scalarSummary = JSON.parse(scalarResult.stdout);
  assert.equal(scalarSummary.totalCases, 2);
  assert.equal(scalarSummary.errors.filter((error) => /test case must be a plain object/.test(error)).length, 2);
});

test('validate-testcases fails closed when JSON arrays or YAML sequences contain scalar members', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-mixed-members-'));
  const jsonFile = path.join(dir, 'mixed.json');
  const yamlFile = path.join(dir, 'mixed.yaml');
  fs.writeFileSync(jsonFile, JSON.stringify([validTestCase(), 'not-a-case', null]));
  fs.writeFileSync(yamlFile, `${read('tests/fixtures/testcases/valid.yaml').trimEnd()}\n- not-a-case\n`);

  const jsonResult = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', jsonFile]);
  assert.equal(jsonResult.status, 1, `mixed JSON must fail\n${jsonResult.stdout}\n${jsonResult.stderr}`);
  const jsonSummary = JSON.parse(jsonResult.stdout);
  assert.equal(jsonSummary.totalCases, 3);
  assert.equal(jsonSummary.errors.filter((error) => /test case must be a plain object/.test(error)).length, 2);

  const yamlResult = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', yamlFile]);
  assert.equal(yamlResult.status, 1, `mixed YAML must fail\n${yamlResult.stdout}\n${yamlResult.stderr}`);
  const yamlSummary = JSON.parse(yamlResult.stdout);
  assert.equal(yamlSummary.totalCases, 2);
  assert.match(yamlSummary.errors.join('\n'), /test case must be a plain object/);

  const exported = runRaw('node', ['website-test-automation/scripts/export-testcases.mjs', jsonFile]);
  assert.equal(exported.status, 1);
  assert.equal(exported.stdout, '');
  assert.match(exported.stderr, /schema error:.*test case must be a plain object/s);
});

test('validate-testcases treats directories with no supported regular files as invalid input sets', () => {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-empty-dir-'));
  const symlinkDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-symlink-only-'));
  const unsupportedDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-unsupported-only-'));
  const outside = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-empty-outside-')), 'outside.json');
  fs.writeFileSync(outside, JSON.stringify(validTestCase()));
  fs.symlinkSync(outside, path.join(symlinkDir, 'outside.json'));
  fs.writeFileSync(path.join(unsupportedDir, 'cases.txt'), JSON.stringify(validTestCase()));

  for (const dir of [emptyDir, symlinkDir, unsupportedDir]) {
    const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', dir]);
    assert.equal(result.status, 1, `${dir} must fail\n${result.stdout}\n${result.stderr}`);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.ok, false);
    assert.equal(summary.totalFiles, 0);
    assert.equal(summary.totalCases, 0);
    assert.match(summary.errors.join('\n'), /no test case files|no test cases/i);
  }
});

test('test-case loading handles supported extensions case-insensitively and parses uppercase JSON as JSON', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-uppercase-ext-'));
  const upperJson = path.join(dir, 'case.JSON');
  const upperYaml = path.join(dir, 'case.YAML');
  const upperYml = path.join(dir, 'case.YML');
  fs.writeFileSync(upperJson, JSON.stringify(validTestCase(), null, 2));
  fs.writeFileSync(upperYaml, read('tests/fixtures/testcases/valid.yaml'));
  fs.writeFileSync(upperYml, read('tests/fixtures/testcases/valid.yaml'));

  for (const file of [upperJson, upperYaml, upperYml]) {
    const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', file]);
    assert.equal(result.status, 0, `${file} must parse\n${result.stdout}\n${result.stderr}`);
    assert.equal(JSON.parse(result.stdout).totalCases, 1);
  }
});

test('JSON test cases reject dangerous own keys recursively without rejecting ordinary extension fields', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-json-keys-'));
  const ownKey = (object, key, value) => {
    Object.defineProperty(object, key, { value, enumerable: true, configurable: true, writable: true });
    return object;
  };

  const topLevel = ownKey(validTestCase(), '__proto__', { polluted: true });
  const nestedSource = validTestCase();
  ownKey(nestedSource.source, 'constructor', { polluted: true });
  const nestedAutomation = validTestCase();
  ownKey(nestedAutomation.automation, 'prototype', { polluted: true });
  const nestedArray = validTestCase({ metadata: [{ safe: true }] });
  ownKey(nestedArray.metadata[0], '__proto__', { polluted: true });
  const safeExtensions = validTestCase({
    metadata: [{ custom: { owner: 'qa' } }],
    source: { docs: ['docs/PRD.md'], code: [], observed: [], vendor: { name: 'internal' } },
  });

  const dangerous = {
    'top-level.json': topLevel,
    'nested-source.json': nestedSource,
    'nested-automation.json': nestedAutomation,
    'nested-array.json': nestedArray,
  };
  for (const [name, value] of Object.entries(dangerous)) {
    fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
  }
  const safeFile = path.join(dir, 'safe-extensions.json');
  fs.writeFileSync(safeFile, JSON.stringify(safeExtensions));

  const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', dir]);
  assert.equal(result.status, 1, `dangerous JSON keys must fail\n${result.stdout}\n${result.stderr}`);
  const summary = JSON.parse(result.stdout);
  for (const name of Object.keys(dangerous)) {
    const report = summary.files.find((item) => item.file.endsWith(name));
    assert.equal(report.errors.some((error) => /parse error:.*unsafe mapping key/i.test(error)), true, name);
  }
  const safeReport = summary.files.find((item) => item.file.endsWith('safe-extensions.json'));
  assert.deepEqual(safeReport.errors, []);

  const exported = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    path.join(dir, 'top-level.json'),
  ]);
  assert.equal(exported.status, 1);
  assert.equal(exported.stdout, '');
  assert.match(exported.stderr, /parse error:.*unsafe mapping key/i);
});

test('validate-testcases rejects malformed required and optional field types', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-types-'));
  const file = path.join(dir, 'types.json');
  fs.writeFileSync(
    file,
    JSON.stringify([
      validTestCase({ id: 42, title: false, source: [] }),
      validTestCase({ source: { docs: 'docs/PRD.md', code: [42], observed: {} } }),
      validTestCase({ steps: 'Call endpoint', expected: { result: 200 }, automation: [] }),
      validTestCase({
        mismatch: false,
        human_expectation: [],
        why_unreasonable: 42,
        logic_risk: 'false',
        suggested_product_fix: {},
        risk: false,
        persona: [],
        preconditions: 'none',
        negative_cases: {},
        data_needs: false,
        evidence: [],
        assumptions: 'none',
        unknowns: [42],
      }),
      validTestCase({
        automation: { recommended: 'yes', target: 'later', preferred_tools: 'vitest' },
        evidence: { required: 'trace' },
      }),
    ]),
  );

  const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', file]);
  assert.equal(result.status, 1, `expected schema failure\n${result.stdout}\n${result.stderr}`);
  const errors = JSON.parse(result.stdout).errors.join('\n');
  for (const message of [
    'id must be a string',
    'title must be a string',
    'source must be a plain object',
    'source.docs must be an array of strings',
    'source.code must be an array of strings',
    'source.observed must be an array of strings',
    'steps must be an array of strings',
    'expected must be an array of strings',
    'automation must be a plain object',
    'mismatch must be a string',
    'human_expectation must be a string',
    'why_unreasonable must be a string',
    'logic_risk must be a boolean',
    'suggested_product_fix must be a string',
    'risk must be a string',
    'persona must be a string',
    'preconditions must be an array of strings',
    'negative_cases must be an array of strings',
    'data_needs must be an array of strings',
    'evidence must be a plain object',
    'assumptions must be an array of strings',
    'unknowns must be an array of strings',
    'automation.recommended must be a boolean',
    'invalid automation.target: "later"',
    'automation.preferred_tools must be an array of strings',
    'evidence.required must be an array of strings',
  ]) {
    assert.match(errors, new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('validate-testcases rejects unsafe keys, broken quotes, and malformed flow collections as parse errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-yaml-errors-'));
  const baseLines = [
    'id: TC-YAML-001',
    'title: Valid title',
    'source:',
    '  docs: ["docs/PRD.md"]',
    '  code: []',
    '  observed: []',
    'source_status: documented',
    'surface: api',
    'layer: api',
    'disposition: manual',
    'type: api',
    'priority: P2',
    'steps: [Call endpoint]',
    'expected: [Returns 200]',
    'automation: {recommended: false, target: manual}',
  ];
  const cases = {
    'unterminated.yaml': baseLines.map((line) => (line.startsWith('title:') ? 'title: "unterminated' : line)),
    'mismatched.yaml': baseLines.map((line) => (line.startsWith('title:') ? 'title: \'mismatched"' : line)),
    'flow-mismatch.yaml': baseLines.map((line) =>
      line.startsWith('steps:') ? 'steps: [Call endpoint, {broken: value]' : line,
    ),
    'flow-malformed.yaml': baseLines.map((line) =>
      line.startsWith('automation:') ? 'automation: {recommended false, target: manual}' : line,
    ),
    'proto.yaml': [
      '__proto__:',
      '  id: TC-YAML-001',
      ...baseLines.filter((line) => !line.startsWith('id:')),
    ],
    'constructor.yaml': [...baseLines, 'constructor: unsafe'],
    'prototype.yaml': [...baseLines, 'prototype: unsafe'],
  };
  for (const [name, lines] of Object.entries(cases)) fs.writeFileSync(path.join(dir, name), lines.join('\n'));

  const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', dir]);
  assert.equal(result.status, 1, `expected parse failures\n${result.stdout}\n${result.stderr}`);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.totalFiles, Object.keys(cases).length);
  assert.equal(parsed.files.every((report) => report.errors.some((error) => /parse error/i.test(error))), true);
});

test('validate-testcases reports unsupported YAML constructs and unexpected indentation as parse errors', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-unsupported-yaml-'));
  const base = validYamlLines();
  const fixtures = {
    'literal-block.yaml': base.flatMap((line) =>
      line.startsWith('title:') ? ['title: |', '  Multiline title'] : [line],
    ),
    'folded-block.yaml': base.flatMap((line) =>
      line.startsWith('title:') ? ['title: >-', '  Folded title'] : [line],
    ),
    'anchor.yaml': base.map((line) => (line === 'source:' ? 'source: &source' : line)),
    'alias.yaml': base.map((line) => (line === 'source:' ? 'source: *source' : line)),
    'merge-key.yaml': base.flatMap((line) => (line === 'source:' ? ['source:', '  <<: *defaults'] : [line])),
    'unexpected-indent.yaml': base.flatMap((line) =>
      line.startsWith('id:') ? [line, '  ignored: value'] : [line],
    ),
  };
  for (const [name, lines] of Object.entries(fixtures)) fs.writeFileSync(path.join(dir, name), lines.join('\n'));

  const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', dir]);
  assert.equal(result.status, 1, `unsupported YAML must fail\n${result.stdout}\n${result.stderr}`);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.totalFiles, Object.keys(fixtures).length);
  assert.equal(
    summary.files.every((report) => report.errors.some((error) => /parse error/i.test(error))),
    true,
  );
});

test('validate-testcases preserves quotes and apostrophes inside plain YAML scalars', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-plain-quotes-'));
  const file = path.join(dir, 'plain-quotes.yaml');
  fs.writeFileSync(
    file,
    [
      'id: TC-YAML-002',
      'title: Click "Save"',
      'source:',
      '  docs: ["docs/PRD.md"]',
      '  code: []',
      '  observed: []',
      'source_status: documented',
      'surface: web',
      'layer: browser-runner',
      'disposition: manual',
      'type: e2e',
      'priority: P2',
      "steps: [Open user's profile]",
      "expected: [User's profile appears]",
      'automation: {recommended: false, target: manual}',
    ].join('\n'),
  );

  const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', file]);
  assert.equal(result.status, 0, `plain scalars should remain valid\n${result.stdout}\n${result.stderr}`);
});

test('validate-testcases requires non-empty P0/P1 evidence or unknown text', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-evidence-'));
  const file = path.join(dir, 'empty-evidence.json');
  fs.writeFileSync(
    file,
    JSON.stringify(
      validTestCase({
        priority: 'P0',
        source: { docs: ['', '   '], code: [], observed: [] },
        unknowns: ['', '   '],
      }),
    ),
  );

  const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', file]);
  assert.equal(result.status, 1);
  assert.match(JSON.parse(result.stdout).errors.join('\n'), /P0 case needs at least one source evidence entry/);
});

test('test-case collection skips directory symlinks and rejects direct symlink or unsupported-file inputs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-symlinks-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-outside-'));
  const insideFile = path.join(dir, 'inside.json');
  const outsideFile = path.join(outside, 'invalid.json');
  fs.writeFileSync(insideFile, JSON.stringify(validTestCase()));
  fs.writeFileSync(outsideFile, JSON.stringify(validTestCase({ source: 'invalid' })));
  fs.symlinkSync(outsideFile, path.join(dir, 'outside.json'));

  const scanned = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', dir, insideFile]);
  assert.equal(scanned.status, 0, `directory symlink should be skipped\n${scanned.stdout}\n${scanned.stderr}`);
  const scanSummary = JSON.parse(scanned.stdout);
  assert.equal(scanSummary.totalFiles, 1, 'duplicate direct and directory inputs should be de-duplicated');
  assert.equal(scanSummary.totalCases, 1);

  const directSymlink = runRaw('node', [
    'website-test-automation/scripts/validate-testcases.mjs',
    path.join(dir, 'outside.json'),
  ]);
  assert.equal(directSymlink.status, 2);
  assert.match(directSymlink.stderr, /symbolic link/i);

  const unsupported = path.join(dir, 'cases.txt');
  fs.writeFileSync(unsupported, JSON.stringify(validTestCase()));
  const unsupportedResult = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', unsupported]);
  assert.equal(unsupportedResult.status, 2);
  assert.match(unsupportedResult.stderr, /supported YAML\/JSON file/i);
});

test('loadCases re-checks and rejects symbolic links immediately before reading', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-loader-symlink-'));
  const target = path.join(dir, 'target.json');
  const link = path.join(dir, 'link.json');
  fs.writeFileSync(target, JSON.stringify(validTestCase()));
  fs.symlinkSync(target, link);
  const loaderUrl = pathToFileURL(path.join(skillRoot, 'scripts/lib/yaml-testcases.mjs')).href;
  const result = runRaw(process.execPath, [
    '--input-type=module',
    '--eval',
    `import { loadCases } from ${JSON.stringify(loaderUrl)}; loadCases(${JSON.stringify(link)});`,
  ]);

  assert.equal(result.status, 1, `loader must reject symlink\n${result.stdout}\n${result.stderr}`);
  assert.match(result.stderr, /symbolic link/i);
});

test('loadCases re-checks and rejects non-regular files immediately before reading', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-loader-directory-'));
  const loaderUrl = pathToFileURL(path.join(skillRoot, 'scripts/lib/yaml-testcases.mjs')).href;
  const result = runRaw(process.execPath, [
    '--input-type=module',
    '--eval',
    `import { loadCases } from ${JSON.stringify(loaderUrl)}; loadCases(${JSON.stringify(dir)});`,
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /regular file/i);
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

test('validate-testcases rejects missing, unknown, duplicate, conflicting, or unsupported options', () => {
  const input = 'tests/fixtures/testcases/valid.yaml';
  const invalidArgs = [
    [input, '--format'],
    [input, '--format='],
    [input, '--format', 'xml'],
    [input, '--unknown'],
    [input, '--format=json', '--format=json'],
    [input, '--format=json', '--format=md'],
  ];
  for (const args of invalidArgs) {
    const result = runRaw('node', ['website-test-automation/scripts/validate-testcases.mjs', ...args]);
    assert.equal(result.status, 2, `${args.join(' ')} must be a usage error\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Usage: validate-testcases\.mjs/);
    assert.doesNotMatch(result.stdout, /"totalFiles"/);
  }
});

test('test-case CLIs accept one help option and reject repeated help options', () => {
  for (const script of ['validate-testcases.mjs', 'export-testcases.mjs']) {
    const scriptPath = path.join(skillRoot, 'scripts', script);
    for (const args of [['--help'], ['-h']]) {
      const result = runRaw('node', [scriptPath, ...args]);
      assert.equal(result.status, 0, `${script} ${args.join(' ')} must show help`);
      assert.match(result.stdout, /Usage:/);
    }
    for (const args of [['--help', '--help'], ['-h', '--help']]) {
      const result = runRaw('node', [scriptPath, ...args]);
      assert.equal(result.status, 2, `${script} ${args.join(' ')} must reject repeated help`);
      assert.match(result.stdout, /Usage:/);
    }
  }
});

test('export-testcases rejects missing, unknown, duplicate, conflicting, or unsupported options', () => {
  const input = 'tests/fixtures/testcases/valid.yaml';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-duplicate-options-'));
  const firstOut = path.join(dir, 'first.csv');
  const secondOut = path.join(dir, 'second.csv');
  const invalidArgs = [
    [input, '--out'],
    [input, '--out='],
    [input, '--format'],
    [input, '--format='],
    [input, '--format', 'xml'],
    [input, '--unknown'],
    [input, '--format=csv', '--format=csv'],
    [input, '--format=csv', '--format=md'],
    [input, `--out=${firstOut}`, `--out=${firstOut}`],
    [input, `--out=${firstOut}`, `--out=${secondOut}`],
  ];
  for (const args of invalidArgs) {
    const result = runRaw('node', ['website-test-automation/scripts/export-testcases.mjs', ...args]);
    assert.equal(result.status, 2, `${args.join(' ')} must be a usage error\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Usage: export-testcases\.mjs/);
    assert.doesNotMatch(result.stdout, /^"ID"/m);
  }
});

test('test-case CLIs accept dash-prefixed input paths after the option terminator', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-option-terminator-'));
  const inputName = '--cases.json';
  fs.writeFileSync(path.join(dir, inputName), JSON.stringify(validTestCase()));
  const validateScript = path.join(skillRoot, 'scripts/validate-testcases.mjs');
  const exportScript = path.join(skillRoot, 'scripts/export-testcases.mjs');

  const validated = runRaw('node', [validateScript, '--format', 'md', '--', inputName], { cwd: dir });
  assert.equal(validated.status, 0, `terminator validation failed\n${validated.stdout}\n${validated.stderr}`);
  assert.match(validated.stdout, /## Test Case Validation/);

  const exported = runRaw('node', [exportScript, '--format=md', '--', inputName], { cwd: dir });
  assert.equal(exported.status, 0, `terminator export failed\n${exported.stdout}\n${exported.stderr}`);
  assert.match(exported.stdout, /^\| ID \| Title \| Surface \| Layer \| Disposition \| Priority \|/);
});

test('export-testcases preserves equals signs in --out=<path> values', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-out-equals-'));
  const out = path.join(dir, 'cases=review.csv');
  const result = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    'tests/fixtures/testcases/valid.yaml',
    `--out=${out}`,
  ]);

  assert.equal(result.status, 0, `equals path must export\n${result.stdout}\n${result.stderr}`);
  assert.equal(fs.existsSync(out), true);
  assert.match(fs.readFileSync(out, 'utf8'), /TC-AUTH-001/);
  assert.match(result.stdout, new RegExp(out.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('export-testcases converts schema cases to CSV and markdown', () => {
  const csv = run('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    'tests/fixtures/testcases/valid.yaml',
    '--format',
    'csv',
  ]);
  const lines = csv.split('\n');
  assert.match(lines[0], /^"ID","Title","Surface","Layer","Disposition","Priority","Type"/);
  assert.match(csv, /TC-AUTH-001/);
  assert.match(csv, /"web","browser-runner","automate-now"/);
  assert.match(csv, /"1\. Open login page\n2\. Enter valid credentials\n3\. Submit form"/);

  const md = run('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    'tests/fixtures/testcases/valid.yaml',
    '--format',
    'md',
  ]);
  assert.match(md, /^\| ID \| Title \| Surface \| Layer \| Disposition \| Priority \|/);
  assert.match(md, /TC-AUTH-001/);
  assert.match(md, /\| web \| browser-runner \| automate-now \|/);
  assert.match(md, /<br>/);

  // Edge cases: bracket-prefixed plain scalars survive intact, formula-leading
  // cells get a defensive prefix, bad --out exits 2, parse errors fail closed.
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
      'surface: web',
      'layer: browser-runner',
      'disposition: manual',
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
  const partialOut = path.join(edgeDir, 'partial.csv');
  const partial = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    path.join(edgeDir, 'broken.json'),
    path.join(edgeDir, 'edge.yaml'),
    '--out',
    partialOut,
  ]);
  assert.equal(partial.status, 1);
  assert.match(partial.stderr, /parse error/);
  assert.equal(partial.stdout, '');
  assert.equal(fs.existsSync(partialOut), false, 'parse errors must not produce a partial export');
});

test('export-testcases rejects schema errors without stdout or output artifacts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-invalid-export-'));
  const out = path.join(dir, 'invalid.csv');
  const result = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    'tests/fixtures/testcases/invalid.yaml',
    '--out',
    out,
  ]);

  assert.equal(result.status, 1, `expected schema failure\n${result.stdout}\n${result.stderr}`);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /schema error/i);
  assert.equal(fs.existsSync(out), false);
});

test('export-testcases refuses output paths that resolve to an input file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-same-output-'));
  const input = path.join(dir, 'cases.yaml');
  const original = fs.readFileSync(path.join(repoRoot, 'tests/fixtures/testcases/valid.yaml'), 'utf8');
  fs.writeFileSync(input, original);

  const samePath = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    input,
    '--out',
    path.join(dir, '.', 'cases.yaml'),
  ]);
  assert.equal(samePath.status, 2);
  assert.match(samePath.stderr, /output path.*input file/i);
  assert.equal(fs.readFileSync(input, 'utf8'), original);

  const alias = path.join(dir, 'alias.yaml');
  fs.symlinkSync(input, alias);
  const sameRealpath = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    input,
    '--out',
    alias,
  ]);
  assert.equal(sameRealpath.status, 2);
  assert.match(sameRealpath.stderr, /output path.*input file/i);
  assert.equal(fs.readFileSync(input, 'utf8'), original);
  assert.equal(fs.lstatSync(alias).isSymbolicLink(), true);
});

test('export-testcases writes atomically and removes temporary files after write failures', () => {
  const successDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-atomic-success-'));
  const input = path.join(successDir, 'cases.yaml');
  const out = path.join(successDir, 'export.csv');
  fs.copyFileSync(path.join(repoRoot, 'tests/fixtures/testcases/valid.yaml'), input);
  fs.writeFileSync(out, 'sentinel');
  const originalInode = fs.statSync(out).ino;
  const success = runRaw('node', ['website-test-automation/scripts/export-testcases.mjs', input, '--out', out]);
  assert.equal(success.status, 0, `expected atomic export\n${success.stdout}\n${success.stderr}`);
  assert.match(fs.readFileSync(out, 'utf8'), /TC-AUTH-001/);
  assert.notEqual(fs.statSync(out).ino, originalInode, 'atomic rename should replace rather than truncate the output file');
  assert.deepEqual(fs.readdirSync(successDir).sort(), ['cases.yaml', 'export.csv']);

  const failureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testcase-atomic-failure-'));
  const failureInput = path.join(failureDir, 'cases.yaml');
  const blockedOut = path.join(failureDir, 'blocked.csv');
  fs.copyFileSync(path.join(repoRoot, 'tests/fixtures/testcases/valid.yaml'), failureInput);
  fs.mkdirSync(blockedOut);
  const failure = runRaw('node', [
    'website-test-automation/scripts/export-testcases.mjs',
    failureInput,
    '--out',
    blockedOut,
  ]);
  assert.equal(failure.status, 2);
  assert.match(failure.stderr, /Cannot write output file/);
  assert.deepEqual(fs.readdirSync(failureDir).sort(), ['blocked.csv', 'cases.yaml']);
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
