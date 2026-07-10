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
let rootRealPath;
try {
  if (!fs.statSync(root).isDirectory()) throw new Error('not a directory');
  rootRealPath = fs.realpathSync(root);
} catch {
  console.error(`Unreadable path: ${root}`);
  process.exit(2);
}

const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const evidenceDirectories = new Set(['real-project-validation', 'forward-test-results', 'case-studies']);
const maxTextFileBytes = 2 * 1024 * 1024;
const files = [];

function isRootContained(candidate) {
  const relative = path.relative(rootRealPath, candidate);
  return relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function inspectContainedRegularFile(file, maxBytes = maxTextFileBytes) {
  const absolute = path.resolve(file);
  if (!isRootContained(absolute)) return { ok: false, reason: 'path escapes the target root' };

  const relative = path.relative(rootRealPath, absolute);
  let current = rootRealPath;
  try {
    for (const segment of relative.split(path.sep).filter(Boolean)) {
      current = path.join(current, segment);
      const stats = fs.lstatSync(current);
      if (stats.isSymbolicLink()) return { ok: false, reason: 'path contains a symbolic link' };
    }

    const stats = fs.lstatSync(absolute);
    if (stats.isSymbolicLink() || !stats.isFile()) {
      return { ok: false, reason: 'path is not an ordinary non-symlink file' };
    }
    if (stats.size > maxBytes) {
      return { ok: false, reason: `file exceeds the ${maxBytes}-byte text limit` };
    }
    if (!isRootContained(fs.realpathSync(absolute))) {
      return { ok: false, reason: 'real path escapes the target root' };
    }
    return { ok: true, stats };
  } catch {
    return { ok: false, reason: 'path does not exist or is unreadable' };
  }
}

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return;
  }

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    try {
      const stats = fs.lstatSync(full);
      if (stats.isSymbolicLink()) continue;
      if (stats.isDirectory()) {
        const realDirectory = fs.realpathSync(full);
        if (isRootContained(realDirectory)) walk(realDirectory);
      } else if (stats.isFile()) {
        const realFile = fs.realpathSync(full);
        if (isRootContained(realFile)) files.push(full);
      }
    } catch {
      // Ignore entries that disappear or become unreadable during traversal.
    }
  }
}

walk(rootRealPath);

const rel = (file) => path.relative(rootRealPath, file).replaceAll(path.sep, '/');
const scorableFiles = files.filter((file) => inspectContainedRegularFile(file).ok);
const relFiles = scorableFiles.map(rel);
const textFiles = scorableFiles.filter((file) => /\.(md|ya?ml|json|mjs|js|ts|tsx|jsx|html)$/.test(file));
const allText = textFiles.map((file) => {
  const inspection = inspectContainedRegularFile(file);
  if (!inspection.ok) return '';
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

function hasTaskRecordQaPackage() {
  return hasText(/Product Model Summary/i) &&
    hasText(/Coverage Matrix Summary/i) &&
    hasText(/Generated Test Cases/i) &&
    hasText(/Verification Result/i);
}

function hasProjectRequirementsSource() {
  return hasFile(/(^|\/)(PRD|requirements?|product-understanding)\.md$/i) ||
    hasFile(/(^|\/)AGENTS\.md$/i) ||
    hasFile(/(^|\/)docs\/DEVELOPMENT_PLAN\.md$/i) ||
    hasFile(/(^|\/)docs\/plans\/.*(product|roadmap|requirements?|functional|parity|test-plan).*\.md$/i) ||
    hasTaskRecordQaPackage();
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
    { points: 25, label: 'requirements source or product-understanding reference', pass: () => hasProjectRequirementsSource() },
    { points: 25, label: 'personas/workflows/entities/states/permissions guidance', pass: () => hasText(/personas?.*workflows?|workflows?.*personas?/is) && hasText(/entities|states|permissions/i) },
    { points: 25, label: 'source ranking and mismatch handling', pass: () => hasText(/Requirements Source Ranking|source_status|mismatch/i) },
    { points: 25, label: 'design sources plus assumptions and unknowns are explicit', pass: () => hasText(/Figma|Lanhu|Storybook|design tokens/i) && hasText(/assumptions|unknowns/i) },
  ]),
  scoreDimension('source-backed-cases', 'Source-backed cases', [
    { points: 25, label: 'test case schema or template', pass: () => hasFile(/testcase-schema\.md$/) || hasFile(/testcase-template\.ya?ml$/) || hasTaskRecordQaPackage() || hasText(/Source-Backed Test Cases/i) },
    { points: 25, label: 'source evidence required', pass: () => hasText(/source evidence|source_evidence|source:\s*[\s\S]*docs:/i) },
    { points: 25, label: 'risk, priority, preconditions, expected results', pass: () => hasText(/priority/i) && hasText(/risk/i) && hasText(/preconditions/i) && hasText(/expected/i) },
    { points: 25, label: 'negative cases, data needs, evidence, assumptions', pass: () => hasText(/negative_cases/i) && hasText(/data_needs/i) && hasText(/evidence/i) && hasText(/assumptions/i) },
  ]),
  scoreDimension('coverage-matrix', 'Coverage matrix', [
    { points: 25, label: 'coverage matrix reference or template', pass: () => hasFile(/coverage-matrix\.(md|ya?ml)$/) || hasText(/Coverage Matrix/i) },
    { points: 25, label: 'workflow/risk/layer dimensions', pass: () => hasText(/workflow/i) && hasText(/risk/i) && hasText(/test layer|Layer \| Priority|Layer[\s\S]{0,80}Priority/i) },
    { points: 25, label: 'current coverage and gaps tracked', pass: () => hasText(/Current coverage|gaps?|next action/i) },
    { points: 25, label: 'manual and exploratory coverage visible', pass: () => hasText(/manual/i) && hasText(/exploratory/i) },
  ]),
  scoreDimension('automation-implementation', 'Automation implementation', [
    { points: 25, label: 'automation implementation guidance', pass: () => hasFile(/automation-implementation\.md$/) || hasText(/Automation Implementation|Automated Tests Landed|Automation Handoff/i) },
    { points: 25, label: 'runner templates or existing tests', pass: () => relFiles.filter((file) => /(\.spec\.|\.test\.|\.cy\.|webdriverio|selenium|playwright|vitest|testing-library)/i.test(file)).length >= 3 },
    { points: 25, label: 'fixtures, commands, deterministic assertions', pass: () => hasText(/fixtures?|mocked/i) && hasText(/commands?|command evidence|Verification Result/i) && hasText(/deterministic assertions/i) },
    { points: 25, label: 'failure artifacts and review checklist', pass: () => hasText(/failure artifacts/i) && hasText(/Code Review Checklist|review checklist/i) },
  ]),
  scoreDimension('browser-smoke-evidence', 'Browser-smoke evidence', [
    { points: 25, label: 'browser adapter model', pass: () => hasFile(/browser-tool-adapters\.md$/) || hasText(/Browser Adapter|Codex Browser|Chrome DevTools|Browser Smoke Evidence/i) },
    { points: 25, label: 'browser-agent smoke evidence required', pass: () => hasText(/browser-agent smoke evidence|Browser Smoke Evidence/i) },
    { points: 25, label: 'screenshots, console/network, mobile overflow', pass: () => hasText(/screenshots?/i) && hasText(/console\/network|console.*network|console errors?/is) && hasText(/mobile.*overflow|horizontal overflow/i) },
    { points: 25, label: 'browser evidence applicability condition', pass: () => hasText(/## Browser Evidence Condition/i) && hasText(/When none of those conditions applies/i) },
  ]),
  scoreDimension('ci-flaky-reporting', 'CI/flaky reporting', [
    { points: 25, label: 'CI reporting guidance', pass: () => hasFile(/ci-reporting\.md$/) || hasText(/CI Reporting/i) },
    { points: 25, label: 'flaky triage taxonomy', pass: () => hasFile(/flake-triage\.md$/) || hasText(/Timing\/async|selector fragility|data dependency/i) },
    { points: 25, label: 'report summarizer or report parsing', pass: () => hasFile(/summarize-test-report\.mjs$/) || hasText(/test report summary|Test Files.*Tests|Verification Result/is) },
    { points: 25, label: 'traces, screenshots, videos, retry signals', pass: () => hasText(/traces?/i) && hasText(/screenshots?/i) && hasText(/videos?/i) && hasText(/retry|retried|flaky/i) },
  ]),
  scoreDimension('provider-live-governance', 'Provider/live governance', [
    { points: 25, label: 'provider/live testing policy', pass: () => hasFile(/provider-live-testing\.md$/) || hasText(/Provider And Paid Live Testing|Provider Live Test Plan|live evidence approval|manual\/live provider|Provider features require live evidence/i) },
    { points: 25, label: 'cost cap, test account, stop condition', pass: () => hasText(/cost cap/i) && hasText(/test account/i) && hasText(/stop condition/i) },
    { points: 25, label: 'representative completion and callbacks/polling', pass: () => hasText(/representative completion|completed representative/i) && hasText(/callback|polling/i) },
    { points: 25, label: 'redaction, refund/credit, storage evidence', pass: () => hasText(/redact|redaction/i) && hasText(/refund|credit/i) && hasText(/storage evidence/i) },
  ]),
  scoreDimension('specialized-quality', 'Specialized quality', [
    { points: 25, label: 'visual/accessibility/performance/security guidance', pass: () => hasFile(/visual-a11y-performance-security\.md$/) || hasText(/Visual.*Accessibility.*Performance.*Security/is) },
    { points: 25, label: 'visual state and dynamic content rules', pass: () => hasText(/dynamic content|mask|visual state|visual.*viewport|viewport behavior/is) && hasText(/viewport/i) },
    { points: 25, label: 'accessibility keyboard/focus/role checks', pass: () => hasText(/keyboard/i) && hasText(/focus/i) && hasText(/role/i) },
    { points: 25, label: 'performance/security smoke plus design mismatch checks', pass: () => hasText(/performance smoke/i) && hasText(/security smoke/i) && hasText(/design mismatch/i) },
  ]),
];

function hasPlaceholderMarker(value) {
  return /\b(?:todo|tbd|pending|placeholder)\b|\bnot[\s_-]+run\b|\bexample[\s_-]*only\b|\breplace(?:[\s_-]+(?:me|this|later))?\b/i.test(value);
}

function hasConcreteResult(value) {
  return /\b\d+\s+(?:tests?|checks?|assertions?|cases?)\s+(?:passed|failed|completed)\b|\b(?:passed|failed|completed|verified)\s+\d+(?:\s+\w+){0,3}\s+(?:tests?|checks?|assertions?|cases?)\b|\b\d+\s+(?:passes?|failures?)\b|\b(?:http|status|exit)(?:\s+code)?\s*[:=]?\s*\d+\b/i.test(value);
}

function isPlaceholderValue(value, allowConcreteResult = false) {
  if (typeof value !== 'string' || value.trim() === '') return true;
  const normalized = value.trim();
  return hasPlaceholderMarker(normalized) && !(allowConcreteResult && hasConcreteResult(normalized));
}

function isPlaceholderOnlyEvidence(contents) {
  if (typeof contents !== 'string' || contents.trim() === '') return true;
  const normalized = contents.trim().replace(/^#+\s*/, '');
  return hasPlaceholderMarker(normalized) && !hasConcreteResult(normalized);
}

function isEvidenceManifest(relativeFile) {
  const segments = relativeFile.split('/');
  return segments.at(-1) === 'evidence-manifest.json' &&
    segments.slice(0, -1).some((segment) => evidenceDirectories.has(segment));
}

function validateEvidenceReference(reference, projectLabel) {
  if (typeof reference !== 'string' || reference.trim() === '') {
    return `${projectLabel} has a blank evidence reference`;
  }
  if (path.isAbsolute(reference)) return `${projectLabel} evidence reference must be relative to the target root`;
  if (reference.split(/[\\/]+/).includes('..')) {
    return `${projectLabel} evidence reference must not contain parent-directory traversal`;
  }

  let evidencePath;
  try {
    evidencePath = path.resolve(rootRealPath, reference);
  } catch {
    return `${projectLabel} evidence reference is not a usable path`;
  }
  const inspection = inspectContainedRegularFile(evidencePath);
  if (!inspection.ok) return `${projectLabel} evidence ${JSON.stringify(reference)}: ${inspection.reason}`;

  let contents;
  try {
    contents = fs.readFileSync(evidencePath, 'utf8');
  } catch {
    return `${projectLabel} evidence ${JSON.stringify(reference)} is unreadable`;
  }
  if (isPlaceholderOnlyEvidence(contents)) {
    return `${projectLabel} evidence ${JSON.stringify(reference)} is empty or placeholder-only`;
  }
  return null;
}

function validateEvidenceManifest(manifestFile) {
  const manifestPath = rel(manifestFile);
  const reasons = [];
  const inspection = inspectContainedRegularFile(manifestFile);
  if (!inspection.ok) {
    return { manifestPath, valid: false, validProjectCount: 0, reasons: [inspection.reason] };
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  } catch {
    return { manifestPath, valid: false, validProjectCount: 0, reasons: ['manifest is malformed JSON'] };
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { manifestPath, valid: false, validProjectCount: 0, reasons: ['manifest must be a JSON object'] };
  }
  if (manifest.version !== 1) reasons.push('manifest version must equal 1');
  if (!Array.isArray(manifest.projects)) {
    reasons.push('manifest projects must be an array');
    return { manifestPath, valid: false, validProjectCount: 0, reasons };
  }
  if (manifest.projects.length < 2) reasons.push('manifest must contain at least two projects');

  const validIds = [];
  const validTargets = [];
  let validProjectCount = 0;
  for (const [index, project] of manifest.projects.entries()) {
    const projectLabel = `projects[${index}]`;
    const projectReasons = [];
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      projectReasons.push(`${projectLabel} must be an object`);
    } else {
      for (const field of ['id', 'target', 'command', 'outcome']) {
        if (isPlaceholderValue(project[field], field === 'outcome')) {
          projectReasons.push(`${projectLabel}.${field} must be a non-placeholder string`);
        }
      }
      if (!Array.isArray(project.evidence) || project.evidence.length === 0) {
        projectReasons.push(`${projectLabel}.evidence must be a nonempty string array`);
      } else {
        for (const reference of project.evidence) {
          const evidenceReason = validateEvidenceReference(reference, projectLabel);
          if (evidenceReason) projectReasons.push(evidenceReason);
        }
      }
    }

    if (projectReasons.length === 0) {
      validProjectCount += 1;
      validIds.push(project.id.trim().toLowerCase());
      validTargets.push(project.target.trim().toLowerCase());
    } else {
      reasons.push(...projectReasons);
    }
  }

  const uniqueIds = new Set(validIds);
  if (uniqueIds.size < 2) reasons.push('manifest must contain at least two unique valid project IDs');
  if (uniqueIds.size !== validIds.length) reasons.push('manifest project IDs must not be duplicated');
  const uniqueTargets = new Set(validTargets);
  if (uniqueTargets.size < 2) reasons.push('manifest must contain at least two unique valid project targets');
  if (uniqueTargets.size !== validTargets.length) reasons.push('manifest project targets must not be duplicated');
  if (validProjectCount < 2) reasons.push('manifest must contain at least two fully valid projects');

  return {
    manifestPath,
    valid: reasons.length === 0,
    validProjectCount,
    reasons,
  };
}

function evaluateRealProjectEvidence() {
  const candidates = files
    .filter((file) => isEvidenceManifest(rel(file)))
    .sort((left, right) => rel(left).localeCompare(rel(right)));
  if (candidates.length === 0) {
    return {
      hasProvenRealProjectEvidence: false,
      manifestPath: null,
      validProjectCount: 0,
      reasons: ['No root-contained ordinary evidence-manifest.json was found under an approved evidence directory.'],
      manifestEvaluations: [],
    };
  }

  const evaluations = candidates.map(validateEvidenceManifest);
  const manifestEvaluations = evaluations.map(({ manifestPath, valid, validProjectCount, reasons }) => ({
    manifestPath,
    valid,
    validProjectCount,
    reasons,
  }));
  const valid = evaluations.find((evaluation) => evaluation.valid);
  if (valid) {
    return {
      hasProvenRealProjectEvidence: true,
      manifestPath: valid.manifestPath,
      validProjectCount: valid.validProjectCount,
      reasons: [],
      manifestEvaluations,
    };
  }

  const selected = evaluations.reduce((best, evaluation) =>
    evaluation.validProjectCount > best.validProjectCount ? evaluation : best);
  return {
    hasProvenRealProjectEvidence: false,
    manifestPath: selected.manifestPath,
    validProjectCount: selected.validProjectCount,
    reasons: selected.reasons.map((reason) => `${selected.manifestPath}: ${reason}`),
    manifestEvaluations,
  };
}

const contractScore = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length);
const gaps = dimensions.flatMap((dimension) => dimension.missing.map((missing) => ({
  workstream: dimension.key,
  missing,
})));
const evidenceCalibration = evaluateRealProjectEvidence();
const { hasProvenRealProjectEvidence } = evidenceCalibration;
const overallScore = hasProvenRealProjectEvidence && contractScore >= 90 ? contractScore : Math.min(contractScore, 89);
const level =
  overallScore >= 90 && hasProvenRealProjectEvidence ? '90+ proven maturity candidate' :
  overallScore >= 80 ? '80-90 mature readiness candidate' :
  overallScore >= 70 ? '70-79 operational candidate' :
  overallScore >= 50 ? '50-69 planning coverage' :
  '0-49 exploratory only';

console.log(JSON.stringify({
  target: root,
  dimensionCount: dimensions.length,
  contractScore,
  overallScore,
  level,
  measurementNote: 'Scores measure process evidence found in files (docs, templates, scripts, test files); the scorer does not execute tests or measure runtime coverage.',
  evidenceCalibration: {
    ...evidenceCalibration,
    note: hasProvenRealProjectEvidence ?
      'A valid structured real-project evidence manifest was found; 90+ still requires contractScore >= 90.' :
      'Overall score is capped below 90 until a valid structured real-project evidence manifest exists; contractScore shows raw package contract coverage.',
  },
  dimensions,
  gaps,
}, null, 2));
