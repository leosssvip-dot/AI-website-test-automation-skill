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
const REPORT_EXT = /\.(json|xml)$/i;
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
if (targetStats.isFile() && !REPORT_EXT.test(path.basename(target))) {
  console.error(`Report file must use a .json or .xml extension: ${target}`);
  process.exit(2);
}

const MAX_OUTPUT_TEXT_LENGTH = 2000;
const MAX_DETAIL_ITEMS = 100;
const MAX_REPORT_FILE_BYTES = 16 * 1024 * 1024;
const MAX_REPORT_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_REPORT_FILES = 10_000;
const MAX_REPORT_DIRECTORIES = 10_000;
const MAX_REPORT_ENTRIES = 50_000;
const MAX_JSON_STRUCTURE_TOKENS = 200_000;
const MAX_JSON_NESTING_DEPTH = 256;
const MAX_XML_ELEMENTS = 200_000;
const MAX_XML_NESTING_DEPTH = 256;
const MAX_XML_TESTCASES = 50_000;
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
  if (targetStats.isFile()) {
    if (REPORT_EXT.test(p)) out.push(p);
  } else {
    const pending = [p];
    while (pending.length > 0 && !scanStopped) {
      const current = pending.pop();
      visitedDirectories += 1;
      if (visitedDirectories > MAX_REPORT_DIRECTORIES) {
        addResourceWarning(`Report directory scan exceeded the ${MAX_REPORT_DIRECTORIES}-directory resource limit.`);
        scanStopped = true;
        break;
      }
      const childDirectories = [];
      for (const entry of readDirectoryEntries(current)) {
        if (scanStopped) break;
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
          childDirectories.push(full);
        } else if (stats.isFile() && REPORT_EXT.test(entry.name)) {
          if (out.length >= MAX_REPORT_FILES) {
            addResourceWarning(`Report file discovery exceeded the ${MAX_REPORT_FILES}-file resource limit.`);
            scanStopped = true;
            break;
          }
          out.push(full);
        }
      }
      for (const child of childDirectories.reverse()) pending.push(child);
    }
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

function inspectJsonStructure(value) {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let tokens = 0;
  for (const character of value) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') {
      inString = true;
      continue;
    }
    if (character === '{' || character === '[') {
      tokens += 1;
      depth += 1;
      if (depth > MAX_JSON_NESTING_DEPTH) {
        return { ok: false, reason: `JSON nesting exceeds ${MAX_JSON_NESTING_DEPTH}` };
      }
    } else if (character === '}' || character === ']') {
      depth -= 1;
    } else if (character === ',') {
      tokens += 1;
    }
    if (tokens > MAX_JSON_STRUCTURE_TOKENS) {
      return { ok: false, reason: `JSON structure exceeds ${MAX_JSON_STRUCTURE_TOKENS} tokens` };
    }
  }
  return { ok: true };
}

function stripUnsafeControls(value) {
  return value.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u061C\u200B-\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g,
    '',
  );
}

function redactPrivateKeyBlocks(value) {
  const beginPattern = /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/g;
  const endPattern = /-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/g;
  let cursor = 0;
  let output = '';
  while (true) {
    beginPattern.lastIndex = cursor;
    const begin = beginPattern.exec(value);
    if (!begin) return output + value.slice(cursor);
    output += value.slice(cursor, begin.index);
    endPattern.lastIndex = beginPattern.lastIndex;
    const end = endPattern.exec(value);
    output += '[REDACTED]';
    if (!end) return output;
    cursor = endPattern.lastIndex;
  }
}

function redactSecrets(value) {
  const normalized = stripUnsafeControls(String(value ?? ''));
  return redactPrivateKeyBlocks(normalized)
    .replace(
      /(?:[\p{L}][\p{L}'’.-]*[ \t]+){1,4}<[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}>/giu,
      '[REDACTED_PII]',
    )
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    .replace(/(?<![A-Za-z0-9])\+\d(?:[\s().-]*\d){7,14}(?![A-Za-z0-9])/g, '[REDACTED_PHONE]')
    .replace(/(?<!\d)\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}(?!\d)/g, '[REDACTED_PHONE]')
    .replace(/((?:[A-Za-z]:)?[\\/](?:Users|home)[\\/])[^\\/\s]+/gi, '$1[REDACTED_USER]')
    .replace(
      /([?&](?:(?:[^?&#=\s]*(?:token|secret|password|passwd|pwd)[^?&#=\s]*)|(?:[A-Za-z0-9.-]+[_-])?(?:sig|signature|credential|code)(?:[_-][A-Za-z0-9.-]+)?|api[_-]?key|key|auth|authorization|session|cookie)=)[^&#\s]*/gi,
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
    .replace(/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b/g, '[REDACTED_JWT]')
    .replace(
      /\b(?:sk-[A-Za-z0-9_-]{16,}|npm_[A-Za-z0-9]{20,}|pypi-[A-Za-z0-9_-]{20,}|hf_[A-Za-z0-9]{20,}|glpat-[A-Za-z0-9_-]{20,})\b/g,
      '[REDACTED]',
    )
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED]')
    .replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, '[REDACTED]')
    .replace(/\b(?:sk|rk)_live_[0-9A-Za-z]{16,}\b/g, '[REDACTED]')
    .replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, '[REDACTED]');
}

function sanitizeOutputText(value) {
  const redacted = redactSecrets(value);
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

function displayReportPath(file) {
  const relative = path.relative(process.cwd(), file);
  const isLocal = relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  return isLocal ? relative || '.' : path.basename(file);
}

function displayDiscoveredReport(file) {
  return path.relative(reportRoot, file) || path.basename(file);
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

function isXmlWhitespace(character) {
  return character === ' ' || character === '\t' || character === '\r' || character === '\n';
}

function isXmlNameStart(character) {
  return character !== undefined && /[A-Za-z_:]/.test(character);
}

function isXmlNameCharacter(character) {
  return character !== undefined && /[A-Za-z0-9_.:-]/.test(character);
}

function hasValidXmlEntities(value) {
  let cursor = 0;
  while (true) {
    const ampersand = value.indexOf('&', cursor);
    if (ampersand === -1) return true;
    const semicolon = value.indexOf(';', ampersand + 1);
    if (semicolon === -1) return false;
    const entity = value.slice(ampersand + 1, semicolon);
    if (!/^(?:amp|lt|gt|apos|quot|#\d+|#x[0-9A-Fa-f]+)$/.test(entity)) return false;
    cursor = semicolon + 1;
  }
}

function readXmlTag(xml, start) {
  let index = start + 1;
  let closing = false;
  if (xml[index] === '/') {
    closing = true;
    index += 1;
  }
  if (!isXmlNameStart(xml[index])) return null;
  const nameStart = index;
  while (isXmlNameCharacter(xml[index])) index += 1;
  const name = xml.slice(nameStart, index);
  const attributes = Object.create(null);

  if (closing) {
    while (isXmlWhitespace(xml[index])) index += 1;
    if (xml[index] !== '>') return null;
    return { kind: 'close', name, attributes, end: index + 1 };
  }

  while (index < xml.length) {
    let hadWhitespace = false;
    while (isXmlWhitespace(xml[index])) {
      hadWhitespace = true;
      index += 1;
    }
    if (xml[index] === '>') return { kind: 'open', name, attributes, selfClosing: false, end: index + 1 };
    if (xml[index] === '/' && xml[index + 1] === '>') {
      return { kind: 'open', name, attributes, selfClosing: true, end: index + 2 };
    }
    if (!hadWhitespace || !isXmlNameStart(xml[index])) return null;

    const attributeStart = index;
    while (isXmlNameCharacter(xml[index])) index += 1;
    const attributeName = xml.slice(attributeStart, index);
    if (Object.hasOwn(attributes, attributeName)) return null;
    while (isXmlWhitespace(xml[index])) index += 1;
    if (xml[index] !== '=') return null;
    index += 1;
    while (isXmlWhitespace(xml[index])) index += 1;
    const quote = xml[index];
    if (quote !== '"' && quote !== "'") return null;
    index += 1;
    const valueStart = index;
    while (index < xml.length && xml[index] !== quote) {
      if (xml[index] === '<') return null;
      index += 1;
    }
    if (xml[index] !== quote) return null;
    const attributeValue = xml.slice(valueStart, index);
    if (!hasValidXmlEntities(attributeValue)) return null;
    attributes[attributeName] = attributeValue;
    index += 1;
  }
  return null;
}

function parseDeclaredCount(attributes, name) {
  if (!Object.hasOwn(attributes, name)) return null;
  if (!/^\d+$/.test(attributes[name])) return Number.NaN;
  return Number(attributes[name]);
}

function isAllowedJUnitElement(name, stack) {
  const parent = stack.at(-1)?.name || null;
  if (parent === null) return name === 'testsuite' || name === 'testsuites';
  if (parent === 'testsuites') return name === 'testsuite';
  if (parent === 'testsuite') {
    return ['properties', 'testcase', 'system-out', 'system-err'].includes(name);
  }
  if (parent === 'properties') return name === 'property';
  if (parent === 'testcase') {
    return ['failure', 'error', 'skipped', 'system-out', 'system-err'].includes(name);
  }
  const resultContentNames = new Set(['failure', 'error', 'system-out', 'system-err']);
  const insideResultContent = stack.some((frame) => resultContentNames.has(frame.name));
  if (insideResultContent) {
    return !['testsuites', 'testsuite', 'testcase', 'properties', 'property', 'failure', 'error', 'skipped'].includes(name);
  }
  return false;
}

// Parse only the XML structure needed for JUnit, but do it in one forward pass.
// This rejects truncated/mismatched documents before counting any partial results
// and avoids the catastrophic backtracking risks of whole-document regexes.
function parseJUnit(xml) {
  const testcases = [];
  const stack = [];
  const totals = { tests: 0, failures: 0, errors: 0, skipped: 0 };
  let currentTestcase = null;
  let rootSeen = false;
  let rootClosed = false;
  let position = 0;
  let elementCount = 0;

  const resourceLimit = (message) => {
    const error = new Error(message);
    error.code = 'REPORT_RESOURCE_LIMIT';
    throw error;
  };

  const finishTestcase = (testcase) => {
    if (testcase.failureKind && testcase.skipped) return false;
    if (testcases.length >= MAX_XML_TESTCASES) {
      resourceLimit(`JUnit testcase count exceeds ${MAX_XML_TESTCASES}`);
    }
    totals.tests += 1;
    if (testcase.failureKind === 'failure') totals.failures += 1;
    if (testcase.failureKind === 'error') totals.errors += 1;
    if (testcase.skipped) totals.skipped += 1;
    testcases.push(testcase);
    return true;
  };

  const suiteMatchesDeclarations = (frame) => {
    for (const name of ['tests', 'failures', 'errors', 'skipped']) {
      const declared = parseDeclaredCount(frame.attributes, name);
      if (Number.isNaN(declared)) return false;
      if (declared !== null && declared !== totals[name] - frame.startTotals[name]) return false;
    }
    return true;
  };

  while (position < xml.length) {
    const nextTag = xml.indexOf('<', position);
    const textEnd = nextTag === -1 ? xml.length : nextTag;
    if (!hasValidXmlEntities(xml.slice(position, textEnd))) return null;
    if (stack.length === 0 && xml.slice(position, textEnd).trim() !== '') return null;
    if (nextTag === -1) {
      position = xml.length;
      break;
    }
    position = nextTag;

    if (xml.startsWith('<!--', position)) {
      const end = xml.indexOf('-->', position + 4);
      if (end === -1) return null;
      position = end + 3;
      continue;
    }
    if (xml.startsWith('<![CDATA[', position)) {
      if (stack.length === 0) return null;
      const end = xml.indexOf(']]>', position + 9);
      if (end === -1) return null;
      position = end + 3;
      continue;
    }
    if (xml.startsWith('<?', position)) {
      const end = xml.indexOf('?>', position + 2);
      if (end === -1) return null;
      position = end + 2;
      continue;
    }
    if (xml.startsWith('<!', position)) return null;

    const tag = readXmlTag(xml, position);
    if (!tag) return null;
    position = tag.end;

    if (tag.kind === 'close') {
      const frame = stack.pop();
      if (!frame || frame.name !== tag.name) return null;
      if (frame.name === 'testcase') {
        if (currentTestcase !== frame.testcase || !finishTestcase(frame.testcase)) return null;
        currentTestcase = null;
      }
      if (frame.suite && !suiteMatchesDeclarations(frame)) return null;
      if (stack.length === 0) rootClosed = true;
      continue;
    }

    if (stack.length === 0) {
      if (rootSeen || !['testsuite', 'testsuites'].includes(tag.name)) return null;
      rootSeen = true;
    }
    if (!isAllowedJUnitElement(tag.name, stack)) return null;
    elementCount += 1;
    if (elementCount > MAX_XML_ELEMENTS) resourceLimit(`XML element count exceeds ${MAX_XML_ELEMENTS}`);

    const frame = { name: tag.name };
    if (tag.name === 'testsuite' || tag.name === 'testsuites') {
      frame.suite = true;
      frame.attributes = tag.attributes;
      frame.startTotals = { ...totals };
    }
    if (tag.name === 'testcase') {
      if (currentTestcase) return null;
      const hasStatus = Object.hasOwn(tag.attributes, 'status');
      const normalizedStatus = hasStatus
        ? tag.attributes.status.trim().toLowerCase().replace(/[\s_-]+/g, '')
        : '';
      const hasDisabled = Object.hasOwn(tag.attributes, 'disabled');
      const normalizedDisabled = hasDisabled ? tag.attributes.disabled.trim().toLowerCase() : '';
      if (hasStatus && ![
        'run', 'passed', 'pass', 'success', 'successful',
        'notrun', 'disabled', 'pending', 'skipped', 'ignored',
        'failed', 'failure', 'error',
      ].includes(normalizedStatus)) return null;
      if (hasDisabled && !['true', '1', 'yes', 'false', '0', 'no'].includes(normalizedDisabled)) return null;
      const statusSkipped = ['notrun', 'disabled', 'pending', 'skipped', 'ignored'].includes(normalizedStatus);
      const disabled = ['true', '1', 'yes'].includes(normalizedDisabled);
      const explicitPassed = ['passed', 'pass', 'success', 'successful'].includes(normalizedStatus);
      const statusFailureKind = ['failed', 'failure'].includes(normalizedStatus)
        ? 'failure'
        : normalizedStatus === 'error' ? 'error' : null;
      if (explicitPassed && (statusSkipped || disabled || statusFailureKind)) return null;
      currentTestcase = {
        title: decodeXml(tag.attributes.name || 'unknown test'),
        failureKind: statusFailureKind,
        skipped: statusSkipped || disabled,
        explicitPassed,
        message: '',
      };
      frame.testcase = currentTestcase;
    } else if (tag.name === 'failure' || tag.name === 'error') {
      if (!currentTestcase || currentTestcase.explicitPassed ||
        (currentTestcase.failureKind && currentTestcase.failureKind !== tag.name)) return null;
      currentTestcase.failureKind = tag.name;
      if (!currentTestcase.message) currentTestcase.message = decodeXml(tag.attributes.message || '');
    } else if (tag.name === 'skipped') {
      if (!currentTestcase || currentTestcase.explicitPassed || currentTestcase.failureKind) return null;
      currentTestcase.skipped = true;
    }

    if (tag.selfClosing) {
      if (frame.name === 'testcase') {
        if (!finishTestcase(frame.testcase)) return null;
        currentTestcase = null;
      }
      if (frame.suite && !suiteMatchesDeclarations(frame)) return null;
      if (stack.length === 0) rootClosed = true;
    } else {
      if (stack.length >= MAX_XML_NESTING_DEPTH) {
        resourceLimit(`XML nesting exceeds ${MAX_XML_NESTING_DEPTH}`);
      }
      stack.push(frame);
    }
  }

  if (!rootSeen || !rootClosed || stack.length > 0 || currentTestcase) return null;
  return testcases;
}

// JUnit XML: a nested <failure>/<error> means failed, <skipped> means skipped,
// otherwise passed. Returns how many structurally valid testcases were seen.
function visitJUnit(xml, counts, failures, detailCounts) {
  let testcases;
  try {
    testcases = parseJUnit(xml);
  } catch (error) {
    if (error.code === 'REPORT_RESOURCE_LIMIT') return { seen: 0, resourceWarning: error.message };
    throw error;
  }
  if (!testcases) return { seen: 0 };
  for (const testcase of testcases) {
    if (testcase.failureKind) {
      counts.failed += 1;
      recordFailure(failures, detailCounts, {
        title: testcase.title,
        status: 'failed',
        message: testcase.message,
      });
    } else if (testcase.skipped) {
      counts.skipped += 1;
    } else {
      counts.passed += 1;
    }
  }
  return { seen: testcases.length };
}

function findTitle(stack) {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (typeof stack[i]?.title === 'string') return stack[i].title;
  }
  return 'unknown test';
}

function visit(value, counts, failures, artifacts, detailCounts, stack = []) {
  if (Array.isArray(value)) {
    return value.reduce(
      (seen, item) => seen + visit(item, counts, failures, artifacts, detailCounts, stack),
      0,
    );
  }
  if (!value || typeof value !== 'object') return 0;
  const nextStack = value.title ? [...stack, value] : stack;
  const status = String(value.status || value.outcome || '').toLowerCase();
  let seen = 0;
  if (['passed', 'pass', 'ok'].includes(status) || value.ok === true) {
    counts.passed += 1;
    seen += 1;
  }
  if (['failed', 'fail', 'timedout', 'interrupted'].includes(status) || value.ok === false) {
    counts.failed += 1;
    seen += 1;
    recordFailure(failures, detailCounts, {
      title: findTitle(nextStack),
      status: status === 'timedout' || status === 'interrupted' ? status : 'failed',
      message: value.error?.message || value.message || '',
    });
  }
  if (['skipped', 'pending'].includes(status)) {
    counts.skipped += 1;
    seen += 1;
  }
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
  for (const child of Object.values(value)) {
    seen += visit(child, counts, failures, artifacts, detailCounts, nextStack);
  }
  return seen;
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
  if (/\.xml$/i.test(file)) {
    const result = visitJUnit(readResult.content, counts, failures, detailCounts);
    if (result.resourceWarning) {
      addResourceWarning(`${result.resourceWarning}: ${displayDiscoveredReport(file)}`);
      continue;
    }
    if (result.seen > 0) xmlFilesRead += 1;
    else unsupported.push(sanitizeOutputText(displayDiscoveredReport(file)));
    continue;
  }
  try {
    const structure = inspectJsonStructure(readResult.content);
    if (!structure.ok) {
      addResourceWarning(`${structure.reason}: ${displayDiscoveredReport(file)}`);
      continue;
    }
    const seen = visit(JSON.parse(readResult.content), counts, failures, artifacts, detailCounts);
    if (seen > 0) jsonFilesRead += 1;
    else unsupported.push(sanitizeOutputText(displayDiscoveredReport(file)));
  } catch {
    unsupported.push(sanitizeOutputText(displayDiscoveredReport(file)));
  }
}

const filesRead = jsonFilesRead + xmlFilesRead;
const resourceIncomplete = resourceWarnings.length > 0;
const parseIncomplete = unsupported.length > 0;
const noReportsDiscovered = files.length === 0;
const incomplete = resourceIncomplete || parseIncomplete || noReportsDiscovered;
const safeResourceWarnings = resourceWarnings.map(sanitizeOutputText);
const nextAction = resourceIncomplete
  ? 'Report summary is incomplete because resource or safety limits were reached; review resourceWarnings and rerun with a narrower report set.'
  : noReportsDiscovered
    ? 'Report summary is incomplete because no supported JSON/XML reports were discovered; verify the report path and test-run artifacts.'
  : parseIncomplete
    ? 'Report summary is incomplete because one or more discovered reports were unsupported or could not be parsed; inspect unsupported and regenerate those reports.'
  : counts.failed > 0
    ? 'Inspect failure artifacts and classify with flake-triage.md.'
    : 'Review coverage gaps and decide next automation candidates.';
const summary = {
  reportPath: sanitizeOutputText(displayReportPath(target)),
  filesDiscovered: files.length,
  filesRead,
  filesSkipped: files.length - filesRead,
  filesTruncated: resourceIncomplete,
  incomplete,
  noReportsDiscovered,
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
- No reports discovered: ${summary.noReportsDiscovered}
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
