#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('Usage: summarize-test-report.mjs <report-file-or-dir> [--format json|md]\nSummarizes JSON (Playwright-style) and JUnit XML test reports where feasible.');
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
let targetStats;
let reportRoot;
try {
  targetStats = fs.lstatSync(target);
  if (targetStats.isSymbolicLink() || (!targetStats.isFile() && !targetStats.isDirectory())) {
    throw new Error('not an ordinary file or directory');
  }
  reportRoot = fs.realpathSync(targetStats.isDirectory() ? target : path.dirname(target));
} catch {
  console.error(`Report path not found: ${target}`);
  process.exit(2);
}

const REPORT_EXT = /\.(json|xml)$/;
const MAX_OUTPUT_TEXT_LENGTH = 2000;
const MAX_DETAIL_ITEMS = 100;
const MAX_REPORT_FILE_BYTES = 16 * 1024 * 1024;
const MAX_REPORT_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_REPORT_FILES = 10_000;
const MAX_REPORT_DIRECTORIES = 10_000;
const MAX_REPORT_ENTRIES = 50_000;
const outputStats = { textFieldsTruncated: 0 };
const resourceWarnings = [];
let scanStopped = false;
let visitedDirectories = 0;
let visitedEntries = 0;

function addResourceWarning(message) {
  if (!resourceWarnings.includes(message)) resourceWarnings.push(message);
}

function isRootContained(candidate) {
  const relative = path.relative(reportRoot, candidate);
  return relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function readDirectoryEntries(directory) {
  let handle;
  const entries = [];
  try {
    const stats = fs.lstatSync(directory);
    const real = fs.realpathSync(directory);
    if (stats.isSymbolicLink() || !stats.isDirectory() || !isRootContained(real)) {
      addResourceWarning(`Unsafe report directory was skipped: ${path.relative(reportRoot, directory) || '.'}`);
      return entries;
    }
    handle = fs.opendirSync(directory);
    while (!scanStopped) {
      const entry = handle.readSync();
      if (!entry) break;
      visitedEntries += 1;
      if (visitedEntries > MAX_REPORT_ENTRIES) {
        addResourceWarning(`Report entry scan exceeded the ${MAX_REPORT_ENTRIES}-entry resource limit.`);
        scanStopped = true;
        break;
      }
      entries.push(entry);
    }
  } catch (error) {
    addResourceWarning(`Unreadable report directory was skipped: ${path.relative(reportRoot, directory) || '.'} (${error.code || error.message})`);
  } finally {
    if (handle) {
      try {
        handle.closeSync();
      } catch {
        // The scan is already marked incomplete if the directory could not be read.
      }
    }
  }
  return entries.sort((left, right) => left.name.localeCompare(right.name));
}

function collectReportFiles(p) {
  const out = [];

  function walk(current) {
    if (scanStopped) return;
    const entries = readDirectoryEntries(current);
    for (const entry of entries) {
      if (scanStopped) return;
      const full = path.join(current, entry.name);
      let stats;
      try {
        stats = fs.lstatSync(full);
      } catch (error) {
        addResourceWarning(`Unreadable report path was skipped: ${path.relative(reportRoot, full)} (${error.code || error.message})`);
        continue;
      }
      if (stats.isSymbolicLink()) continue;
      if (stats.isDirectory()) {
        visitedDirectories += 1;
        if (visitedDirectories > MAX_REPORT_DIRECTORIES) {
          addResourceWarning(`Report directory scan exceeded the ${MAX_REPORT_DIRECTORIES}-directory resource limit.`);
          scanStopped = true;
          return;
        }
        walk(full);
      } else if (stats.isFile() && REPORT_EXT.test(entry.name)) {
        if (out.length >= MAX_REPORT_FILES) {
          addResourceWarning(`Report file discovery exceeded the ${MAX_REPORT_FILES}-file resource limit.`);
          scanStopped = true;
          return;
        }
        out.push(full);
      }
    }
  }

  if (targetStats.isFile()) {
    if (REPORT_EXT.test(p)) out.push(p);
  } else {
    walk(p);
  }
  return out;
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
  if (total > maxBytes) return { status: 'oversized' };
  return { status: 'read', bytesRead: total, content: Buffer.concat(chunks, total).toString('utf8') };
}

function readReportFile(file, remainingAggregateBytes) {
  const relative = path.relative(reportRoot, file) || path.basename(file);
  let inspectedStats;
  let fd;
  try {
    inspectedStats = fs.lstatSync(file);
    if (inspectedStats.isSymbolicLink() || !inspectedStats.isFile()) {
      return { warning: `Report file is no longer an ordinary non-symlink file: ${relative}` };
    }
    if (inspectedStats.size > MAX_REPORT_FILE_BYTES) {
      return { warning: `Report file exceeds the ${MAX_REPORT_FILE_BYTES}-byte size limit: ${relative}` };
    }
    if (inspectedStats.size > remainingAggregateBytes) {
      return { warning: `Report aggregate bytes exceed the ${MAX_REPORT_TOTAL_BYTES}-byte resource limit at: ${relative}`, aggregateLimit: true };
    }
    const inspectedRealPath = fs.realpathSync(file);
    if (!isRootContained(inspectedRealPath)) {
      return { warning: `Report file escapes the report root: ${relative}` };
    }

    const noFollow = fs.constants.O_NOFOLLOW || 0;
    fd = fs.openSync(file, fs.constants.O_RDONLY | noFollow);
    const openedStats = fs.fstatSync(fd);
    const currentStats = fs.lstatSync(file);
    const sameFile = openedStats.isFile() && currentStats.isFile() && !currentStats.isSymbolicLink() &&
      openedStats.dev === inspectedStats.dev && openedStats.ino === inspectedStats.ino &&
      currentStats.dev === openedStats.dev && currentStats.ino === openedStats.ino;
    if (!sameFile || !isRootContained(fs.realpathSync(file))) {
      return { warning: `Report file changed during safe inspection: ${relative}` };
    }

    const readLimit = Math.min(MAX_REPORT_FILE_BYTES, remainingAggregateBytes);
    const result = readBoundedUtf8(fd, readLimit);
    if (result.status === 'oversized') {
      const aggregateLimit = remainingAggregateBytes < MAX_REPORT_FILE_BYTES;
      return {
        warning: aggregateLimit
          ? `Report aggregate bytes exceed the ${MAX_REPORT_TOTAL_BYTES}-byte resource limit at: ${relative}`
          : `Report file exceeds the ${MAX_REPORT_FILE_BYTES}-byte size limit: ${relative}`,
        aggregateLimit,
      };
    }
    return result;
  } catch (error) {
    return {
      warning: error.code === 'ELOOP'
        ? `Report file symlink was rejected: ${relative}`
        : `Report file could not be read safely: ${relative} (${error.code || error.message})`,
    };
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function redactSecrets(value) {
  return String(value ?? '')
    .replace(
      /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/g,
      '[REDACTED]',
    )
    .replace(
      /([?&](?:(?:[^?&#=\s]*(?:token|secret|password|passwd|pwd)[^?&#=\s]*)|api[_-]?key|key|auth|authorization|session|cookie)=)[^&#\s]*/gi,
      '$1[REDACTED]',
    )
    .replace(/(\bAuthorization\b["']?\s*[:=]\s*["']?)[^\r\n]*/gi, '$1[REDACTED]')
    .replace(/\bBearer\s+[-A-Za-z0-9._~+/=]+/gi, 'Bearer [REDACTED]')
    .replace(/(\b(?:Set-Cookie|Cookie)\b["']?\s*[:=]\s*["']?)[^\r\n]*/gi, '$1[REDACTED]')
    .replace(
      /\b([A-Za-z0-9_.-]*(?:token|secret|password|passwd|pwd|api[_-]?key|session(?:[_-]?id)?|private[_-]?key|access[_-]?key)[A-Za-z0-9_.-]*)\s*[:=]\s*(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;&\r\n]+)/gi,
      '$1=[REDACTED]',
    )
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, '[REDACTED]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED]')
    .replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, '[REDACTED]')
    .replace(/\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/g, '[REDACTED]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, '[REDACTED]');
}

function sanitizeOutputText(value) {
  const redacted = redactSecrets(value).replace(/\0/g, '');
  if (redacted.length <= MAX_OUTPUT_TEXT_LENGTH) return redacted;
  outputStats.textFieldsTruncated += 1;
  return `${redacted.slice(0, MAX_OUTPUT_TEXT_LENGTH)}…[TRUNCATED]`;
}

function escapeMarkdown(value) {
  return redactSecrets(value)
    .replace(/\s*[\r\n]+\s*/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]{}()#+\-.!|>])/g, '\\$1');
}

function recordFailure(failures, detailCounts, failure) {
  detailCounts.failures += 1;
  if (failures.length >= MAX_DETAIL_ITEMS) return;
  failures.push({
    title: sanitizeOutputText(failure.title),
    status: failure.status,
    message: sanitizeOutputText(failure.message),
  });
}

function recordArtifact(artifacts, detailCounts, artifact) {
  detailCounts.artifacts += 1;
  if (artifacts.length >= MAX_DETAIL_ITEMS) return;
  artifacts.push({
    name: sanitizeOutputText(artifact.name),
    path: sanitizeOutputText(artifact.path),
  });
}

// JUnit XML: count <testcase> entries; a nested <failure>/<error> means failed,
// <skipped> means skipped, otherwise passed. Returns how many testcases were seen.
function visitJUnit(xml, counts, failures, detailCounts) {
  // Strip XML comments so a commented-out testcase is not counted, then use a
  // lazy attribute match so a self-closing `<testcase .../>` ends its own match
  // instead of backtracking into the next testcase's closing tag.
  const stripped = xml.replace(/<!--[\s\S]*?-->/g, '');
  const testcases = stripped.match(/<testcase\b[^>]*?(?:\/>|>[\s\S]*?<\/testcase>)/g) || [];
  for (const testcase of testcases) {
    const title = decodeXml(testcase.match(/\bname="([^"]*)"/)?.[1] || 'unknown test');
    if (/<(failure|error)\b/.test(testcase)) {
      counts.failed += 1;
      recordFailure(failures, detailCounts, {
        title,
        status: 'failed',
        message: decodeXml(testcase.match(/<(?:failure|error)\b[^>]*\bmessage="([^"]*)"/)?.[1] || ''),
      });
    } else if (/<skipped\b/.test(testcase)) {
      counts.skipped += 1;
    } else {
      counts.passed += 1;
    }
  }
  return testcases.length;
}

function findTitle(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (typeof stack[i]?.title === 'string') return stack[i].title;
  }
  return 'unknown test';
}

function visit(value, counts, failures, artifacts, detailCounts, stack = []) {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, counts, failures, artifacts, detailCounts, stack);
    return;
  }
  if (!value || typeof value !== 'object') return;
  const nextStack = value.title ? [...stack, value] : stack;
  const status = String(value.status || value.outcome || '').toLowerCase();
  if (['passed', 'pass', 'ok'].includes(status) || value.ok === true) counts.passed += 1;
  if (['failed', 'fail', 'timedout', 'interrupted'].includes(status) || value.ok === false) {
    counts.failed += 1;
    recordFailure(failures, detailCounts, {
      title: findTitle(nextStack),
      status: status === 'timedout' || status === 'interrupted' ? status : 'failed',
      message: value.error?.message || value.message || '',
    });
  }
  if (['skipped', 'pending'].includes(status)) counts.skipped += 1;
  if (Array.isArray(value.results) && value.results.length > 1) counts.retried += 1;
  if (Array.isArray(value.attachments)) {
    for (const item of value.attachments) {
      if (item?.path) {
        recordArtifact(artifacts, detailCounts, {
          name: item.name || 'artifact',
          path: item.path,
        });
      }
    }
  }
  for (const child of Object.values(value)) visit(child, counts, failures, artifacts, detailCounts, nextStack);
}

const files = collectReportFiles(target).sort();
const counts = { passed: 0, failed: 0, skipped: 0, retried: 0 };
const failures = [];
const artifacts = [];
const detailCounts = { failures: 0, artifacts: 0 };
const unsupported = [];
let jsonFilesRead = 0;
let xmlFilesRead = 0;
let reportBytesRead = 0;

for (const file of files) {
  const readResult = readReportFile(file, MAX_REPORT_TOTAL_BYTES - reportBytesRead);
  if (readResult.warning) {
    addResourceWarning(readResult.warning);
    if (readResult.aggregateLimit) break;
    continue;
  }
  reportBytesRead += readResult.bytesRead;
  if (file.endsWith('.xml')) {
    const seen = visitJUnit(readResult.content, counts, failures, detailCounts);
    if (seen > 0) xmlFilesRead += 1;
    else unsupported.push(sanitizeOutputText(path.relative(process.cwd(), file)));
    continue;
  }
  try {
    visit(JSON.parse(readResult.content), counts, failures, artifacts, detailCounts);
    jsonFilesRead += 1;
  } catch {
    unsupported.push(sanitizeOutputText(path.relative(process.cwd(), file)));
  }
}

const filesRead = jsonFilesRead + xmlFilesRead;
const resourceIncomplete = resourceWarnings.length > 0;
const parseIncomplete = unsupported.length > 0;
const incomplete = resourceIncomplete || parseIncomplete;
const safeResourceWarnings = resourceWarnings.map(sanitizeOutputText);
const nextAction = resourceIncomplete
  ? 'Report summary is incomplete because resource or safety limits were reached; review resourceWarnings and rerun with a narrower report set.'
  : parseIncomplete
    ? 'Report summary is incomplete because one or more discovered reports were unsupported or could not be parsed; inspect unsupported and regenerate those reports.'
  : counts.failed > 0
    ? 'Inspect failure artifacts and classify with flake-triage.md.'
    : 'Review coverage gaps and decide next automation candidates.';
const summary = {
  reportPath: sanitizeOutputText(target),
  filesDiscovered: files.length,
  filesRead,
  filesSkipped: files.length - filesRead,
  filesTruncated: resourceIncomplete,
  incomplete,
  resourceWarnings: safeResourceWarnings,
  jsonFilesRead,
  xmlFilesRead,
  unsupported,
  counts,
  failures,
  failureDetailsOmitted: detailCounts.failures - failures.length,
  artifacts,
  artifactDetailsOmitted: detailCounts.artifacts - artifacts.length,
  outputTextFieldsTruncated: outputStats.textFieldsTruncated,
  nextAction,
};

if (format === 'md') {
  const markdownFailures = failures.length
    ? failures
        .map((failure) => `${escapeMarkdown(failure.title)}${failure.message ? ` — ${escapeMarkdown(failure.message)}` : ''}`)
        .join('; ')
    : 'none';
  const markdownArtifacts = artifacts.length
    ? artifacts.map((artifact) => escapeMarkdown(artifact.path)).join(', ')
    : 'none';
  console.log(`## Test Report Summary

- Files discovered: ${summary.filesDiscovered}
- Files read: ${summary.filesRead}
- Files skipped: ${summary.filesSkipped}
- Files truncated: ${summary.filesTruncated}
- Incomplete: ${summary.incomplete}
- Resource warnings: ${summary.resourceWarnings.length ? summary.resourceWarnings.map(escapeMarkdown).join('; ') : 'none'}
- Unsupported reports: ${summary.unsupported.length ? summary.unsupported.map(escapeMarkdown).join(', ') : 'none'}
- JSON files read: ${summary.jsonFilesRead}
- JUnit XML files read: ${summary.xmlFilesRead}
- Passed signals: ${counts.passed}
- Failed signals: ${counts.failed}
- Skipped signals: ${counts.skipped}
- Retried/flaky signals: ${counts.retried}
- Failures: ${markdownFailures}
- Failure details omitted: ${summary.failureDetailsOmitted}
- Artifacts: ${markdownArtifacts}
- Artifact details omitted: ${summary.artifactDetailsOmitted}
- Output text fields truncated: ${summary.outputTextFieldsTruncated}
- Next action: ${summary.nextAction}`);
} else {
  console.log(JSON.stringify(summary, null, 2));
}

if (incomplete) process.exitCode = 1;
