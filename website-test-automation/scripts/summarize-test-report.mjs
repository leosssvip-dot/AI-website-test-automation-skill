#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('Usage: summarize-test-report.mjs <report-file-or-dir> [--format json|md]\nSummarizes common JSON/JUnit-like test report data where feasible.');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const targetArg = process.argv.find((arg, i) => i > 1 && !arg.startsWith('--'));
const formatFlag = process.argv.find((arg) => arg.startsWith('--format='));
const formatArgIndex = process.argv.indexOf('--format');
const format = formatFlag ? formatFlag.split('=')[1] : formatArgIndex !== -1 ? process.argv[formatArgIndex + 1] : 'json';

if (!targetArg) {
  usage();
  process.exit(2);
}

const target = path.resolve(targetArg);
if (!fs.existsSync(target)) {
  console.error(`Report path not found: ${target}`);
  process.exit(2);
}

function collectJsonFiles(p) {
  const stat = fs.statSync(p);
  if (stat.isFile()) return p.endsWith('.json') ? [p] : [];
  const out = [];
  for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, entry.name);
    if (entry.isDirectory()) out.push(...collectJsonFiles(full));
    else if (entry.name.endsWith('.json')) out.push(full);
  }
  return out;
}

function findTitle(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (typeof stack[i]?.title === 'string') return stack[i].title;
  }
  return 'unknown test';
}

function visit(value, counts, failures = [], artifacts = [], stack = []) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, counts, failures, artifacts, stack);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const nextStack = value.title ? [...stack, value] : stack;
  const status = String(value.status || value.outcome || '').toLowerCase();
  if (['passed', 'pass', 'ok'].includes(status) || value.ok === true) counts.passed += 1;
  if (['failed', 'fail', 'timedout', 'interrupted'].includes(status) || value.ok === false) {
    counts.failed += 1;
    failures.push({
      title: findTitle(stack),
      status: status || 'failed',
      message: value.error?.message || value.message || '',
    });
  }
  if (['skipped', 'pending'].includes(status)) counts.skipped += 1;
  if (Array.isArray(value.results) && value.results.length > 1) counts.retried += 1;
  if (Array.isArray(value.attachments)) {
    for (const item of value.attachments) {
      if (item?.path) artifacts.push({ name: item.name || 'artifact', path: item.path });
    }
  }
  for (const child of Object.values(value)) visit(child, counts, failures, artifacts, nextStack);
}

const files = collectJsonFiles(target).slice(0, 20);
const counts = { passed: 0, failed: 0, skipped: 0, retried: 0 };
const failures = [];
const artifacts = [];
const unsupported = [];

for (const file of files) {
  try {
    visit(JSON.parse(fs.readFileSync(file, 'utf8')), counts, failures, artifacts);
  } catch {
    unsupported.push(path.relative(process.cwd(), file));
  }
}

const summary = {
  reportPath: target,
  jsonFilesRead: files.length - unsupported.length,
  unsupported,
  counts,
  failures,
  artifacts,
  nextAction: counts.failed > 0 ? 'Inspect failure artifacts and classify with flake-triage.md.' : 'Review coverage gaps and decide next automation candidates.',
};

if (format === 'md') {
  console.log(`## Test Report Summary

- JSON files read: ${summary.jsonFilesRead}
- Passed signals: ${counts.passed}
- Failed signals: ${counts.failed}
- Skipped signals: ${counts.skipped}
- Retried/flaky signals: ${counts.retried}
- Failures: ${failures.map((failure) => failure.title).join(', ') || 'none'}
- Artifacts: ${artifacts.map((artifact) => artifact.path).join(', ') || 'none'}
- Next action: ${summary.nextAction}`);
} else {
  console.log(JSON.stringify(summary, null, 2));
}
