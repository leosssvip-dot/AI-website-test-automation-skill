#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('Usage: score-test-readiness.mjs <repo-or-skill-path>\nScores eight website testing readiness workstreams and outputs JSON.');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const root = path.resolve(process.argv.find((arg, i) => i > 1 && !arg.startsWith('--')) || '.');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Unreadable path: ${root}`);
  process.exit(2);
}

const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full);
  }
}

walk(root);

const rel = (file) => path.relative(root, file).replaceAll(path.sep, '/');
const relFiles = files.map(rel);
const textFiles = files.filter((file) => /\.(md|ya?ml|json|mjs|js|ts|tsx|jsx|html)$/.test(file));
const allText = textFiles.map((file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}).join('\n');

function hasFile(pattern) {
  return relFiles.some((file) => pattern.test(file));
}

function hasText(pattern) {
  return pattern.test(allText);
}

function scoreDimension(key, title, checks) {
  const evidence = [];
  const missing = [];
  let score = 0;
  for (const check of checks) {
    if (check.pass()) {
      score += check.points;
      evidence.push(check.label);
    } else {
      missing.push(check.label);
    }
  }
  return {
    key,
    title,
    score: Math.min(score, 100),
    evidence,
    missing,
  };
}

const dimensions = [
  scoreDimension('product-understanding', 'Product understanding', [
    { points: 25, label: 'requirements source or product-understanding reference', pass: () => hasFile(/(^|\/)(PRD|requirements?|product-understanding)\.md$/i) },
    { points: 25, label: 'personas/workflows/entities/states/permissions guidance', pass: () => hasText(/personas?.*workflows?|workflows?.*personas?/is) && hasText(/entities|states|permissions/i) },
    { points: 25, label: 'source ranking and mismatch handling', pass: () => hasText(/Requirements Source Ranking|source_status|mismatch/i) },
    { points: 25, label: 'design sources plus assumptions and unknowns are explicit', pass: () => hasText(/Figma|Lanhu|Storybook|design tokens/i) && hasText(/assumptions|unknowns/i) },
  ]),
  scoreDimension('source-backed-cases', 'Source-backed cases', [
    { points: 25, label: 'test case schema or template', pass: () => hasFile(/testcase-schema\.md$/) || hasFile(/testcase-template\.ya?ml$/) },
    { points: 25, label: 'source evidence required', pass: () => hasText(/source evidence|source:\s*[\s\S]*docs:/i) },
    { points: 25, label: 'risk, priority, preconditions, expected results', pass: () => hasText(/priority/i) && hasText(/risk/i) && hasText(/preconditions/i) && hasText(/expected/i) },
    { points: 25, label: 'negative cases, data needs, evidence, assumptions', pass: () => hasText(/negative_cases/i) && hasText(/data_needs/i) && hasText(/evidence/i) && hasText(/assumptions/i) },
  ]),
  scoreDimension('coverage-matrix', 'Coverage matrix', [
    { points: 25, label: 'coverage matrix reference or template', pass: () => hasFile(/coverage-matrix\.(md|ya?ml)$/) || hasText(/Coverage Matrix/i) },
    { points: 25, label: 'workflow/risk/layer dimensions', pass: () => hasText(/workflow/i) && hasText(/risk/i) && hasText(/test layer/i) },
    { points: 25, label: 'current coverage and gaps tracked', pass: () => hasText(/Current coverage|gaps?|next action/i) },
    { points: 25, label: 'manual and exploratory coverage visible', pass: () => hasText(/manual/i) && hasText(/exploratory/i) },
  ]),
  scoreDimension('automation-implementation', 'Automation implementation', [
    { points: 25, label: 'automation implementation guidance', pass: () => hasFile(/automation-implementation\.md$/) || hasText(/Automation Implementation/i) },
    { points: 25, label: 'runner templates or existing tests', pass: () => relFiles.filter((file) => /(\.spec\.|\.test\.|\.cy\.|webdriverio|selenium|playwright|vitest|testing-library)/i.test(file)).length >= 3 },
    { points: 25, label: 'fixtures, commands, deterministic assertions', pass: () => hasText(/fixtures?/i) && hasText(/commands?/i) && hasText(/deterministic assertions/i) },
    { points: 25, label: 'failure artifacts and review checklist', pass: () => hasText(/failure artifacts/i) && hasText(/Code Review Checklist|review checklist/i) },
  ]),
  scoreDimension('browser-smoke-evidence', 'Browser-smoke evidence', [
    { points: 25, label: 'browser adapter model', pass: () => hasFile(/browser-tool-adapters\.md$/) || hasText(/Browser Adapter|Codex Browser|Chrome DevTools/i) },
    { points: 25, label: 'browser-agent smoke evidence required', pass: () => hasText(/browser-agent smoke evidence/i) },
    { points: 25, label: 'screenshots, console/network, mobile overflow', pass: () => hasText(/screenshots?/i) && hasText(/console\/network|console.*network/is) && hasText(/mobile overflow/i) },
    { points: 25, label: 'scoped-skip reason', pass: () => hasText(/scoped-skip reason/i) },
  ]),
  scoreDimension('ci-flaky-reporting', 'CI/flaky reporting', [
    { points: 25, label: 'CI reporting guidance', pass: () => hasFile(/ci-reporting\.md$/) || hasText(/CI Reporting/i) },
    { points: 25, label: 'flaky triage taxonomy', pass: () => hasFile(/flake-triage\.md$/) || hasText(/Timing\/async|selector fragility|data dependency/i) },
    { points: 25, label: 'report summarizer or report parsing', pass: () => hasFile(/summarize-test-report\.mjs$/) || hasText(/test report summary/i) },
    { points: 25, label: 'traces, screenshots, videos, retry signals', pass: () => hasText(/traces?/i) && hasText(/screenshots?/i) && hasText(/videos?/i) && hasText(/retry|retried|flaky/i) },
  ]),
  scoreDimension('provider-live-governance', 'Provider/live governance', [
    { points: 25, label: 'provider/live testing policy', pass: () => hasFile(/provider-live-testing\.md$/) || hasText(/Provider And Paid Live Testing|Provider Live Test Plan/i) },
    { points: 25, label: 'cost cap, test account, stop condition', pass: () => hasText(/cost cap/i) && hasText(/test account/i) && hasText(/stop condition/i) },
    { points: 25, label: 'representative completion and callbacks/polling', pass: () => hasText(/representative completion/i) && hasText(/callback|polling/i) },
    { points: 25, label: 'redaction, refund/credit, storage evidence', pass: () => hasText(/redact|redaction/i) && hasText(/refund|credit/i) && hasText(/storage evidence/i) },
  ]),
  scoreDimension('specialized-quality', 'Specialized quality', [
    { points: 25, label: 'visual/accessibility/performance/security guidance', pass: () => hasFile(/visual-a11y-performance-security\.md$/) || hasText(/Visual.*Accessibility.*Performance.*Security/is) },
    { points: 25, label: 'visual state and dynamic content rules', pass: () => hasText(/dynamic content|mask/i) && hasText(/viewport/i) },
    { points: 25, label: 'accessibility keyboard/focus/role checks', pass: () => hasText(/keyboard/i) && hasText(/focus/i) && hasText(/role/i) },
    { points: 25, label: 'performance/security smoke plus design mismatch checks', pass: () => hasText(/performance smoke/i) && hasText(/security smoke/i) && hasText(/design mismatch/i) },
  ]),
];

const overallScore = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length);
const gaps = dimensions.flatMap((dimension) => dimension.missing.map((missing) => ({
  workstream: dimension.key,
  missing,
})));
const hasProvenRealProjectEvidence = hasFile(/(^|\/)(real-project-validation|forward-test-results|case-studies)\//i);
const level =
  overallScore >= 90 && hasProvenRealProjectEvidence ? '90+ proven maturity candidate' :
  overallScore >= 80 ? '80-90 mature readiness candidate' :
  overallScore >= 70 ? '70-79 operational candidate' :
  overallScore >= 50 ? '50-69 planning coverage' :
  '0-49 exploratory only';

console.log(JSON.stringify({
  target: root,
  dimensionCount: dimensions.length,
  overallScore,
  level,
  dimensions,
  gaps,
}, null, 2));
