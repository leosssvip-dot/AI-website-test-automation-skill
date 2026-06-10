#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const validStatuses = new Set(['Planned', 'In Progress', 'Blocked', 'Verifying', 'Done', 'Superseded']);

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const rel of ['docs/PRD.md', 'docs/DEVELOPMENT_PLAN.md', 'docs/PROGRESS.md']) {
  if (!exists(rel)) fail(`Missing workflow document: ${rel}`);
}

const progress = read('docs/PROGRESS.md');
const activeTaskMatch = progress.match(/Active task:\s+\[[^\]]+\]\((tasks\/[^)]+)\)/);
if (!activeTaskMatch) fail('docs/PROGRESS.md must include an active task link.');
const activeTaskPath = `docs/${activeTaskMatch[1]}`;
if (!exists(activeTaskPath)) fail(`Active task does not exist: ${activeTaskPath}`);

const progressStatus = progress.match(/Task status:\s+([^\n]+)/)?.[1]?.trim();
if (!validStatuses.has(progressStatus)) fail(`Invalid progress task status: ${progressStatus}`);

const activeTask = read(activeTaskPath);
const taskStatus = activeTask.match(/## Status\s+([^\n]+)/)?.[1]?.trim();
if (!validStatuses.has(taskStatus)) fail(`Invalid active task status: ${taskStatus}`);
assert.equal(taskStatus, progressStatus, 'Active task status must match docs/PROGRESS.md');

for (const heading of ['## Goal', '## Scope', '## Risk Tier', '## Acceptance Criteria', '## Verification Result', '## Final Outcome']) {
  if (!activeTask.includes(heading)) fail(`${activeTaskPath} missing required heading: ${heading}`);
}

const plan = read('docs/DEVELOPMENT_PLAN.md');
if (!plan.includes('Product Requirements Source')) fail('docs/DEVELOPMENT_PLAN.md must cite product requirements source.');
if (!plan.includes('docs/PRD.md')) fail('docs/DEVELOPMENT_PLAN.md must cite docs/PRD.md.');

const validator = spawnSync(process.execPath, ['website-test-automation/scripts/validate-skill.mjs', 'website-test-automation'], {
  cwd: repoRoot,
  encoding: 'utf8',
});
if (validator.status !== 0) {
  console.error(validator.stdout);
  console.error(validator.stderr);
  fail('Skill validator failed from workflow validator.');
}

console.log('Agent workflow validation passed.');
