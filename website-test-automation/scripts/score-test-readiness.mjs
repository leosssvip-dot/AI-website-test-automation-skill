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
const resourceLimits = Object.freeze({
  maxScannedFiles: 10_000,
  maxScannedDirectories: 10_000,
  maxScannedEntries: 50_000,
  maxTotalScoredTextBytes: 32 * 1024 * 1024,
  maxManifestCandidates: 20,
  maxProjectsPerManifest: 100,
  maxEvidenceRefsPerProject: 20,
  maxEvidenceRefsPerManifest: 200,
  maxUniqueEvidenceBytesPerManifest: 16 * 1024 * 1024,
});
const files = [];
const safeManifestCandidates = [];
const unsafeManifestCandidates = [];
const resourceWarnings = [];
let scanStopped = false;
let scannedDirectoryCount = 0;
let scannedEntryCount = 0;

const rel = (file) => path.relative(rootRealPath, file).replaceAll(path.sep, '/');

function isEvidenceManifest(relativeFile) {
  const segments = relativeFile.split('/');
  return segments.at(-1) === 'evidence-manifest.json' &&
    segments.slice(0, -1).some((segment) => evidenceDirectories.has(segment));
}

function addResourceWarning(message) {
  if (!resourceWarnings.includes(message)) resourceWarnings.push(message);
}

function recordManifestCandidate(file, unsafeReason = null) {
  const manifestPath = rel(file);
  if (!isEvidenceManifest(manifestPath)) return;
  if (safeManifestCandidates.length + unsafeManifestCandidates.length >= resourceLimits.maxManifestCandidates) {
    addResourceWarning(`Manifest candidate budget exceeded ${resourceLimits.maxManifestCandidates}; additional candidates were ignored.`);
    return;
  }
  if (unsafeReason) unsafeManifestCandidates.push({ manifestPath, reason: unsafeReason });
  else safeManifestCandidates.push({ manifestPath, file });
}

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

function readBoundedUtf8(fd, maxBytes) {
  const chunks = [];
  let total = 0;
  while (total <= maxBytes) {
    const remaining = maxBytes + 1 - total;
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, remaining));
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    total += bytesRead;
  }
  if (total > maxBytes) return { ok: false, reason: `file exceeds the ${maxBytes}-byte text limit` };
  return { ok: true, content: Buffer.concat(chunks, total).toString('utf8'), bytes: total };
}

function readContainedRegularTextFile(file, maxBytes = maxTextFileBytes, expectedStats = null) {
  const inspection = inspectContainedRegularFile(file, maxBytes);
  if (!inspection.ok) return inspection;
  if (expectedStats && (inspection.stats.dev !== expectedStats.dev || inspection.stats.ino !== expectedStats.ino)) {
    return { ok: false, reason: 'file changed during inspection' };
  }

  let fd;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const openedStats = fs.fstatSync(fd);
    const currentStats = fs.lstatSync(file);
    const sameFile = openedStats.isFile() && currentStats.isFile() && !currentStats.isSymbolicLink() &&
      openedStats.dev === inspection.stats.dev && openedStats.ino === inspection.stats.ino &&
      currentStats.dev === openedStats.dev && currentStats.ino === openedStats.ino;
    if (!sameFile || !isRootContained(fs.realpathSync(file))) {
      return { ok: false, reason: 'file changed during inspection' };
    }
    const readResult = readBoundedUtf8(fd, maxBytes);
    return readResult.ok ? { ...readResult, stats: openedStats } : readResult;
  } catch (error) {
    return { ok: false, reason: error.code === 'ELOOP' ? 'path contains a symbolic link' : 'file is unreadable' };
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function readDirectoryEntries(directory) {
  let handle;
  const entries = [];
  try {
    const stats = fs.lstatSync(directory);
    if (stats.isSymbolicLink() || !stats.isDirectory() || !isRootContained(fs.realpathSync(directory))) return entries;
    handle = fs.opendirSync(directory);
    while (!scanStopped) {
      const entry = handle.readSync();
      if (!entry) break;
      scannedEntryCount += 1;
      if (scannedEntryCount > resourceLimits.maxScannedEntries) {
        scanStopped = true;
        addResourceWarning(`Scanned entry budget exceeded ${resourceLimits.maxScannedEntries}; remaining entries were ignored.`);
        break;
      }
      entries.push(entry);
    }
  } catch {
    addResourceWarning(`Unreadable directory was skipped: ${rel(directory)}`);
  } finally {
    if (handle) {
      try {
        handle.closeSync();
      } catch {
        // A close race must not hide the bounded scan result.
      }
    }
  }
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function walk() {
  const pending = [rootRealPath];
  while (pending.length > 0 && !scanStopped) {
    const directory = pending.pop();
    scannedDirectoryCount += 1;
    if (scannedDirectoryCount > resourceLimits.maxScannedDirectories) {
      scanStopped = true;
      addResourceWarning(`Scanned directory budget exceeded ${resourceLimits.maxScannedDirectories}; remaining directories were ignored.`);
      break;
    }
    const childDirectories = [];
    for (const entry of readDirectoryEntries(directory)) {
      if (scanStopped) break;
      if (ignored.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      let stats;
      try {
        stats = fs.lstatSync(full);
      } catch {
        continue;
      }
      if (stats.isSymbolicLink()) {
        recordManifestCandidate(full, 'manifest path is a symbolic link');
        continue;
      }
      if (stats.isDirectory()) {
        try {
          const realDirectory = fs.realpathSync(full);
          if (isRootContained(realDirectory)) childDirectories.push(realDirectory);
        } catch {
          // Ignore directories that disappear or become unreadable during traversal.
        }
        continue;
      }
      if (!stats.isFile()) continue;
      try {
        const realFile = fs.realpathSync(full);
        if (!isRootContained(realFile)) continue;
        recordManifestCandidate(full);
        if (files.length >= resourceLimits.maxScannedFiles) {
          scanStopped = true;
          addResourceWarning(`Scanned file budget exceeded ${resourceLimits.maxScannedFiles}; remaining entries were ignored.`);
          break;
        }
        files.push(full);
      } catch {
        // Ignore files that disappear or become unreadable during traversal.
      }
    }
    for (const child of childDirectories.reverse()) pending.push(child);
  }
}

walk();

const scorableFiles = [];
const textChunks = [];
let scoredTextBytes = 0;
let scoredTextFileCount = 0;
let skippedScoredTextFiles = 0;
for (const file of files) {
  const inspection = inspectContainedRegularFile(file);
  if (!inspection.ok) {
    addResourceWarning('One or more scanned files became unsafe or unreadable before scoring.');
    continue;
  }
  const isText = /\.(md|ya?ml|json|mjs|js|ts|tsx|jsx|html)$/.test(file);
  if (!isText) {
    scorableFiles.push(file);
    continue;
  }
  if (scoredTextBytes + inspection.stats.size > resourceLimits.maxTotalScoredTextBytes) {
    skippedScoredTextFiles += 1;
    addResourceWarning(`Scored text budget exceeded ${resourceLimits.maxTotalScoredTextBytes} bytes (32 MiB); additional text files were ignored.`);
    continue;
  }
  const readResult = readContainedRegularTextFile(file, maxTextFileBytes, inspection.stats);
  if (!readResult.ok) {
    skippedScoredTextFiles += 1;
    addResourceWarning('One or more scored text files became unsafe or unreadable during bounded reading.');
    continue;
  }
  if (scoredTextBytes + readResult.bytes > resourceLimits.maxTotalScoredTextBytes) {
    skippedScoredTextFiles += 1;
    addResourceWarning(`Scored text budget exceeded ${resourceLimits.maxTotalScoredTextBytes} bytes (32 MiB); additional text files were ignored.`);
    continue;
  }
  textChunks.push(readResult.content);
  scorableFiles.push(file);
  scoredTextBytes += readResult.bytes;
  scoredTextFileCount += 1;
}
const relFiles = scorableFiles.map(rel);
const allText = textChunks.join('\n');

const resourceBudget = {
  limits: resourceLimits,
  usage: {
    scannedFileCount: files.length,
    scannedDirectoryCount,
    scannedEntryCount,
    scoredTextFileCount,
    scoredTextBytes,
    skippedScoredTextFiles,
    manifestCandidateCount: safeManifestCandidates.length + unsafeManifestCandidates.length,
  },
  warnings: resourceWarnings,
};

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

const placeholderPattern = /(?:^|[^A-Za-z0-9_./-])(?:todo|tbd|pending|placeholder|not[\s_-]+run|example[\s_-]*only|replace(?:[\s_-]+(?:me|this|later))?)(?=$|[^A-Za-z0-9_./-])/i;
const resultUnitSource = '(?:test\\s+(?:cases?|files?)|tests?|checks?|assertions?|cases?|scenarios?|specs?|examples?|suites?|passes?|failures?|errors?)';
const executionUnitSource = '(?:test\\s+(?:cases?|files?)|tests?|checks?|assertions?|cases?|scenarios?|specs?|examples?|suites?)';
const concreteResultPatterns = [
  { kind: 'verb', pattern: /\b(?:passed|failed|verified|observed|completed|succeeded|executed|ran)\b/gi, requiresContext: true },
  { kind: 'count', pattern: /\b[1-9]\d*\s+(?:passes?|failures?|errors?)\b/gi, requiresContext: false },
  { kind: 'metric', pattern: /\b(?:http(?:\s+status)?|status(?:\s+code)?|exit(?:\s+code)?)\s*[:=]?\s*\d{1,3}\b/gi, requiresContext: false },
];
const expectationLanguagePattern = /\b(?:expect(?:ed|ation)?|should|will|plan(?:ned)?|target)\b/gi;
const actualContextPattern = /\b(?:actual|observed|received|returned|recorded)\b/gi;
const noExecutionPattern = new RegExp(
  [
    `\\b(?:${executionUnitSource}|command)\\s+(?:(?:was|were|is|are|has|have)\\s+)?not\\s+(?:run|executed|started)\\b`,
    '\\bnot[\\s_-]+run\\b',
    "\\b(?:did\\s+not|didn't|never)\\s+(?:run|execute|start)\\b",
    `\\bno\\s+${executionUnitSource}\\s+(?:ran|were\\s+run|executed|started)\\b`,
    `\\b(?:0|zero|no)\\s+${executionUnitSource}\\s+(?:(?:were|was)\\s+)?(?:run|ran|executed|started|completed)\\b`,
    `\\b(?:with|having|had|reported?)\\s+(?:0|zero|no|none)\\s+(?:total\\s+)?${executionUnitSource}\\b(?!\\s+(?:passed|failed|passes?|failures?|errors?)\\b)`,
    `\\b(?:0|zero|no|none)\\s+(?:total\\s+)?${executionUnitSource}(?:\\s+count)?(?!\\s+(?:passed|failed|passes?|failures?|errors?)\\b)`,
    `\\b(?:total\\s+)?${executionUnitSource}(?:\\s+count)?\\s*(?::|=|-)?\\s*(?:0|zero|no|none)\\b`,
    `\\bwithout\\s+(?:running|executing|starting)\\s+${executionUnitSource}\\b`,
    '\\b(?:dry[\\s_-]*run|list[\\s_-]*only|enumerat(?:e|ion)[\\s_-]*only)\\b',
    '(?:^|\\s)--list(?:\\s|$)',
  ].join('|'),
  'i',
);
const nonExecutionStatePattern = /\b(?:skipped|pending|disabled|blocked|ignored|collected|discovered|deselected|queued|scheduled|not[\s_-]+started)\b/i;

function clauseAt(value, index) {
  const before = value.slice(0, index);
  const start = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf(';'),
    before.lastIndexOf(','),
    before.lastIndexOf(':'),
    before.lastIndexOf('!'),
    before.lastIndexOf('?'),
    before.lastIndexOf('\n'),
  ) + 1;
  const remaining = value.slice(index);
  const boundaryOffsets = ['.', ';', ',', ':', '!', '?', '\n']
    .map((boundary) => remaining.indexOf(boundary))
    .filter((offset) => offset >= 0);
  const end = boundaryOffsets.length ? index + Math.min(...boundaryOffsets) : value.length;
  return { start, end, text: value.slice(start, end) };
}

function boundedSegmentAt(value, index, boundaries, radius = 256) {
  const localStart = Math.max(0, index - radius);
  const before = value.slice(localStart, index);
  let boundary = -1;
  for (const character of boundaries) boundary = Math.max(boundary, before.lastIndexOf(character));
  const start = localStart + boundary + 1;
  const localEnd = Math.min(value.length, index + radius);
  const after = value.slice(index, localEnd);
  const offsets = [...boundaries]
    .map((character) => after.indexOf(character))
    .filter((offset) => offset >= 0);
  const end = offsets.length ? index + Math.min(...offsets) : localEnd;
  return {
    start,
    end,
    text: value.slice(start, end),
    prefixTruncated: localStart > 0 && boundary === -1,
  };
}

function boundedStatementAt(value, index) {
  return boundedSegmentAt(value, index, new Set(['.', ';', ',', '!', '?', '\n']));
}

function boundedClauseAt(value, index) {
  return boundedSegmentAt(value, index, new Set(['.', ';', ',', ':', '!', '?', '\n']));
}

function verbIsTiedToZeroCount(value, matchIndex, matchLength) {
  const statement = boundedStatementAt(value, matchIndex);
  const relativeIndex = matchIndex - statement.start;
  const beforeVerb = statement.text.slice(0, relativeIndex);
  const afterVerb = statement.text.slice(relativeIndex + matchLength);
  const resultVerbPattern = /\b(?:passed|failed|verified|observed|completed|succeeded|executed|ran)\b/gi;
  const zeroPattern = /\b(?:0|zero|none|no|neither)\b/gi;
  const previousResult = [...beforeVerb.matchAll(resultVerbPattern)].at(-1);
  const previousZero = [...beforeVerb.matchAll(zeroPattern)].at(-1);
  if (previousZero && (!previousResult || previousZero.index > previousResult.index)) {
    const between = beforeVerb.slice(previousZero.index + previousZero[0].length);
    const tokenCount = between.match(/[A-Za-z0-9]+/g)?.length || 0;
    if (tokenCount <= 8 && !/\b(?:and|but|then|while|whereas|with|after|before)\b/i.test(between)) return true;
  }

  const immediateZero = /^\s*(?:(?:only|exactly|all)\s+)?(?:0|zero|none|no)\b/i;
  if (immediateZero.test(afterVerb)) return true;
  const labeledZero = afterVerb.match(/^\s*([^.;,!?>\n]{0,48})(?::|=)\s*(?:0|zero|none)\b/i);
  return Boolean(labeledZero && !/\b(?:with|after|before)\b/i.test(labeledZero[1]));
}

function countIsZeroRatioDenominator(value, matchIndex) {
  const beforeCount = value.slice(Math.max(0, matchIndex - 96), matchIndex);
  return /\b(?:0|zero|none|neither)\s*(?:\/\s*|(?:out\s+of|of)\s+(?:(?:the|a)\s+)?(?:total\s+)?(?:of\s+)?)$/i.test(beforeCount);
}

function placeholderMarkerIndex(value) {
  return value.search(placeholderPattern);
}

function concreteResultIndex(value) {
  expectationLanguagePattern.lastIndex = 0;
  const hasExpectationLanguage = expectationLanguagePattern.test(value);
  const substantiveTokenCount = value.match(/[A-Za-z0-9][A-Za-z0-9_-]*/g)?.length || 0;
  const candidates = [];
  for (const { kind, pattern, requiresContext } of concreteResultPatterns) {
    pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
      candidates.push({ kind, requiresContext, match });
    }
  }
  candidates.sort((left, right) => left.match.index - right.match.index);

  expectationLanguagePattern.lastIndex = 0;
  actualContextPattern.lastIndex = 0;
  const expectationIndexes = [...value.matchAll(expectationLanguagePattern)].map((item) => item.index);
  const actualIndexes = [...value.matchAll(actualContextPattern)].map((item) => item.index);
  const lastIndexBefore = (indexes, limit) => {
    let low = 0;
    let high = indexes.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (indexes[middle] < limit) low = middle + 1;
      else high = middle;
    }
    return low > 0 ? indexes[low - 1] : -1;
  };

  for (const { kind, requiresContext, match } of candidates) {
    if (requiresContext && substantiveTokenCount < 3) continue;
    if (kind === 'count' && Number.parseInt(match[0], 10) === 0) continue;
    if (kind === 'count' && countIsZeroRatioDenominator(value, match.index)) continue;
    if (kind === 'count' && nonExecutionStatePattern.test(boundedStatementAt(value, match.index).text)) continue;
    if (kind === 'verb') {
      if (verbIsTiedToZeroCount(value, match.index, match[0].length)) continue;
      const clause = boundedClauseAt(value, match.index);
      if (clause.prefixTruncated) continue;
      const clausePrefix = value.slice(clause.start, match.index);
      if (/\b(?:expect(?:ed|ation)?|should|will|planned?|target)\b/i.test(clausePrefix)) continue;
      if (/\bnot\b(?!\s+only\b)|\b(?:never|no|without|none|neither)\b/i.test(clausePrefix)) continue;
      if (/\b(?:yet|still|remain(?:s|ed)?|need(?:s|ed)?)\s+to\s+be\b|\bto\s+be\s*$/i.test(clausePrefix)) continue;
    }
    if ((kind === 'metric' || kind === 'count') && hasExpectationLanguage) {
      const lastExpectation = lastIndexBefore(expectationIndexes, match.index);
      const lastActual = lastIndexBefore(actualIndexes, match.index);
      if (lastActual <= lastExpectation) continue;
    }
    return match.index;
  }
  return -1;
}

function isInvalidIdentityValue(value) {
  return typeof value !== 'string' || value.trim() === '' || placeholderMarkerIndex(value.trim()) >= 0;
}

function concreteProofReason(value) {
  if (typeof value !== 'string' || value.trim() === '') return 'must be a nonblank string';
  const normalized = value.trim();
  if (noExecutionPattern.test(normalized)) return 'must not claim zero or unexecuted validation as observed proof';
  const concreteIndex = concreteResultIndex(normalized);
  if (concreteIndex < 0) return 'must record a concrete observed result';
  const placeholderIndex = placeholderMarkerIndex(normalized);
  if (placeholderIndex >= 0 && concreteIndex >= placeholderIndex) {
    return 'must record a concrete result before any placeholder marker';
  }
  return null;
}

function normalizeProjectTarget(value) {
  const trimmed = value.trim();
  try {
    const parsed = new URL(trimmed);
    if (!parsed.hostname) throw new Error('not a host URL');
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return `url:${parsed.toString()}`;
  } catch {
    const normalized = trimmed
      .replaceAll('\\', '/')
      .replace(/\/{2,}/g, '/')
      .replace(/\/+$/, '')
      .toLowerCase();
    return `local:${normalized}`;
  }
}

function createManifestResourceUsage() {
  return {
    projectCount: 0,
    evidenceRefCount: 0,
    uniqueEvidenceFileCount: 0,
    uniqueEvidenceBytes: 0,
    evidenceCacheHits: 0,
  };
}

function validateEvidenceReference(reference, projectLabel, context) {
  if (typeof reference !== 'string' || reference.trim() === '') {
    return { reason: `${projectLabel} has a blank evidence reference`, key: null };
  }
  if (path.isAbsolute(reference)) {
    return { reason: `${projectLabel} evidence reference must be relative to the target root`, key: null };
  }
  if (reference.split(/[\\/]+/).includes('..')) {
    return { reason: `${projectLabel} evidence reference must not contain parent-directory traversal`, key: null };
  }

  let evidencePath;
  try {
    evidencePath = path.resolve(rootRealPath, reference);
  } catch {
    return { reason: `${projectLabel} evidence reference is not a usable path`, key: null };
  }

  const knownIdentity = context.pathIdentityCache.get(evidencePath);
  const knownCached = knownIdentity ? context.evidenceCache.get(knownIdentity) : null;
  if (knownCached) {
    context.resourceUsage.evidenceCacheHits += 1;
    return {
      reason: knownCached.reason ? `${projectLabel} evidence ${JSON.stringify(reference)}: ${knownCached.reason}` : null,
      key: knownIdentity,
    };
  }

  const inspection = inspectContainedRegularFile(evidencePath);
  if (!inspection.ok) {
    return {
      reason: `${projectLabel} evidence ${JSON.stringify(reference)}: ${inspection.reason}`,
      key: evidencePath,
    };
  }

  const identityKey = `${inspection.stats.dev}:${inspection.stats.ino}`;
  context.pathIdentityCache.set(evidencePath, identityKey);
  const identityCached = context.evidenceCache.get(identityKey);
  if (identityCached) {
    context.resourceUsage.evidenceCacheHits += 1;
    return {
      reason: identityCached.reason ? `${projectLabel} evidence ${JSON.stringify(reference)}: ${identityCached.reason}` : null,
      key: identityKey,
    };
  }

  if (context.resourceUsage.uniqueEvidenceBytes + inspection.stats.size > resourceLimits.maxUniqueEvidenceBytesPerManifest) {
    const reason = `unique evidence bytes exceed ${resourceLimits.maxUniqueEvidenceBytesPerManifest}`;
    context.evidenceCache.set(identityKey, { reason });
    return { reason: `${projectLabel} evidence ${JSON.stringify(reference)}: ${reason}`, key: identityKey };
  }

  const readResult = readContainedRegularTextFile(evidencePath, maxTextFileBytes, inspection.stats);
  if (!readResult.ok) {
    const reason = readResult.reason;
    context.evidenceCache.set(identityKey, { reason });
    return { reason: `${projectLabel} evidence ${JSON.stringify(reference)}: ${reason}`, key: identityKey };
  }
  if (context.resourceUsage.uniqueEvidenceBytes + readResult.bytes > resourceLimits.maxUniqueEvidenceBytesPerManifest) {
    const reason = `unique evidence bytes exceed ${resourceLimits.maxUniqueEvidenceBytesPerManifest}`;
    context.evidenceCache.set(identityKey, { reason });
    return { reason: `${projectLabel} evidence ${JSON.stringify(reference)}: ${reason}`, key: identityKey };
  }
  context.resourceUsage.uniqueEvidenceFileCount += 1;
  context.resourceUsage.uniqueEvidenceBytes += readResult.bytes;

  const proofReason = concreteProofReason(readResult.content);
  context.evidenceCache.set(identityKey, { reason: proofReason });
  if (proofReason) {
    return { reason: `${projectLabel} evidence ${JSON.stringify(reference)}: ${proofReason}`, key: identityKey };
  }
  return { reason: null, key: identityKey };
}

function validateEvidenceManifest(manifestFile) {
  const manifestPath = rel(manifestFile);
  const reasons = [];
  const resourceUsage = createManifestResourceUsage();
  const finish = (validProjectCount = 0) => ({
    manifestPath,
    valid: reasons.length === 0,
    validProjectCount,
    reasons,
    resourceUsage,
  });
  const inspection = inspectContainedRegularFile(manifestFile);
  if (!inspection.ok) {
    reasons.push(inspection.reason);
    return finish();
  }

  const readResult = readContainedRegularTextFile(manifestFile, maxTextFileBytes, inspection.stats);
  if (!readResult.ok) {
    reasons.push(readResult.reason);
    return finish();
  }
  let manifest;
  try {
    manifest = JSON.parse(readResult.content);
  } catch {
    reasons.push('manifest is malformed JSON');
    return finish();
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    reasons.push('manifest must be a JSON object');
    return finish();
  }
  if (manifest.version !== 1) reasons.push('manifest version must equal 1');
  if (!Array.isArray(manifest.projects)) {
    reasons.push('manifest projects must be an array');
    return finish();
  }
  resourceUsage.projectCount = manifest.projects.length;
  if (manifest.projects.length < 2) reasons.push('manifest must contain at least two projects');
  if (manifest.projects.length > resourceLimits.maxProjectsPerManifest) {
    reasons.push(`manifest projects exceed ${resourceLimits.maxProjectsPerManifest}`);
    return finish();
  }

  for (const [index, project] of manifest.projects.entries()) {
    if (!project || typeof project !== 'object' || Array.isArray(project) || !Array.isArray(project.evidence)) continue;
    resourceUsage.evidenceRefCount += project.evidence.length;
    if (project.evidence.length > resourceLimits.maxEvidenceRefsPerProject) {
      reasons.push(`projects[${index}].evidence refs exceed ${resourceLimits.maxEvidenceRefsPerProject}`);
    }
  }
  if (resourceUsage.evidenceRefCount > resourceLimits.maxEvidenceRefsPerManifest) {
    reasons.push(`manifest evidence refs exceed ${resourceLimits.maxEvidenceRefsPerManifest}`);
  }
  if (reasons.some((reason) => /refs exceed/.test(reason))) return finish();

  const validIds = [];
  const validTargets = [];
  const validProjects = [];
  const context = { evidenceCache: new Map(), pathIdentityCache: new Map(), resourceUsage };
  let validProjectCount = 0;
  for (const [index, project] of manifest.projects.entries()) {
    const projectLabel = `projects[${index}]`;
    const projectReasons = [];
    if (!project || typeof project !== 'object' || Array.isArray(project)) {
      projectReasons.push(`${projectLabel} must be an object`);
    } else {
      for (const field of ['id', 'target', 'command']) {
        if (isInvalidIdentityValue(project[field])) {
          projectReasons.push(`${projectLabel}.${field} must be a non-placeholder string`);
        }
      }
      const outcomeReason = concreteProofReason(project.outcome);
      if (outcomeReason) projectReasons.push(`${projectLabel}.outcome ${outcomeReason}`);
      const evidenceKeys = new Set();
      if (!Array.isArray(project.evidence) || project.evidence.length === 0) {
        projectReasons.push(`${projectLabel}.evidence must be a nonempty string array`);
      } else {
        for (const reference of project.evidence) {
          const evidenceResult = validateEvidenceReference(reference, projectLabel, context);
          if (evidenceResult.reason) projectReasons.push(evidenceResult.reason);
          if (evidenceResult.key) evidenceKeys.add(evidenceResult.key);
        }
      }

      if (projectReasons.length === 0) {
        validProjects.push({ projectLabel, evidenceKeys });
      }
    }

    if (projectReasons.length === 0) {
      validProjectCount += 1;
      validIds.push(project.id.trim().toLowerCase());
      validTargets.push(normalizeProjectTarget(project.target));
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
  const evidenceOwnerCounts = new Map();
  for (const project of validProjects) {
    for (const key of project.evidenceKeys) {
      evidenceOwnerCounts.set(key, (evidenceOwnerCounts.get(key) || 0) + 1);
    }
  }
  for (const project of validProjects) {
    if (![...project.evidenceKeys].some((key) => evidenceOwnerCounts.get(key) === 1)) {
      reasons.push(`${project.projectLabel} must include at least one evidence path not reused by another project`);
    }
  }
  if (validProjectCount < 2) reasons.push('manifest must contain at least two fully valid projects');
  return finish(validProjectCount);
}

function evaluateRealProjectEvidence() {
  const candidates = [
    ...safeManifestCandidates.map((candidate) => ({
      manifestPath: candidate.manifestPath,
      file: candidate.file,
      unsafeReason: null,
    })),
    ...unsafeManifestCandidates.map((candidate) => ({
      manifestPath: candidate.manifestPath,
      file: null,
      unsafeReason: candidate.reason,
    })),
  ].sort((left, right) => left.manifestPath.localeCompare(right.manifestPath));
  const globalBudgetReasons = [...resourceWarnings];
  if (candidates.length === 0) {
    return {
      hasProvenRealProjectEvidence: false,
      manifestPath: null,
      validProjectCount: 0,
      reasons: [
        'No root-contained ordinary evidence-manifest.json was found under an approved evidence directory.',
        ...globalBudgetReasons,
      ],
      manifestEvaluations: [],
    };
  }

  if (candidates.length > resourceLimits.maxManifestCandidates) {
    const reason = `Manifest candidates exceed ${resourceLimits.maxManifestCandidates}`;
    addResourceWarning(reason);
    return {
      hasProvenRealProjectEvidence: false,
      manifestPath: candidates[0].manifestPath,
      validProjectCount: 0,
      reasons: [`${candidates[0].manifestPath}: ${reason}`],
      manifestEvaluations: candidates.slice(0, resourceLimits.maxManifestCandidates).map((candidate) => ({
        manifestPath: candidate.manifestPath,
        valid: false,
        validProjectCount: 0,
        reasons: [reason],
        resourceUsage: createManifestResourceUsage(),
      })),
    };
  }

  const evaluations = candidates.map((candidate) => candidate.unsafeReason ? {
    manifestPath: candidate.manifestPath,
    valid: false,
    validProjectCount: 0,
    reasons: [candidate.unsafeReason],
    resourceUsage: createManifestResourceUsage(),
  } : validateEvidenceManifest(candidate.file));
  const manifestEvaluations = evaluations.map(({ manifestPath, valid, validProjectCount, reasons, resourceUsage }) => ({
    manifestPath,
    valid,
    validProjectCount,
    reasons,
    resourceUsage,
  }));
  const valid = evaluations.find((evaluation) => evaluation.valid);
  if (valid && globalBudgetReasons.length === 0) {
    return {
      hasProvenRealProjectEvidence: true,
      manifestPath: valid.manifestPath,
      validProjectCount: valid.validProjectCount,
      reasons: [],
      manifestEvaluations,
    };
  }

  const selected = valid || evaluations.reduce((best, evaluation) =>
    evaluation.validProjectCount > best.validProjectCount ? evaluation : best);
  return {
    hasProvenRealProjectEvidence: false,
    manifestPath: selected.manifestPath,
    validProjectCount: selected.validProjectCount,
    reasons: [
      ...selected.reasons.map((reason) => `${selected.manifestPath}: ${reason}`),
      ...globalBudgetReasons.map((reason) => `${selected.manifestPath}: ${reason}`),
    ],
    manifestEvaluations,
  };
}

const contractScore = Math.round(dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length);
const gaps = dimensions.flatMap((dimension) => dimension.missing.map((missing) => ({
  workstream: dimension.key,
  missing,
})));
const evidenceCalibration = evaluateRealProjectEvidence();
resourceBudget.exceeded = resourceWarnings.length > 0;
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
  resourceBudget,
  dimensions,
  gaps,
}, null, 2));
