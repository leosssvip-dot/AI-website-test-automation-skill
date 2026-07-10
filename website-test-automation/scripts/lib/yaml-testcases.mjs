// Shared zero-dependency loader for schema test-case files, used by
// validate-testcases.mjs and export-testcases.mjs.
//
// Supported YAML subset (the fixed test-case shape): 2-level mappings,
// block/flow sequences, quoted/plain scalars, booleans, numbers, and `---`
// multi-document files. Not supported: block scalars (`|`, `>`),
// anchors/aliases, or trailing `#` comments after values. A value is treated
// as a flow collection only when it both starts AND ends with the matching
// bracket; a plain scalar that merely starts with `[` (e.g. "[Smoke] Login
// works") stays a scalar instead of being corrupted.
import fs from 'node:fs';
import path from 'node:path';

const DANGEROUS_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const VALID_EXT = /\.(ya?ml|json)$/i;
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const BLOCK_SCALAR_MARKER = /^[|>](?:(?:[+-][1-9]?)|(?:[1-9][+-]?))?$/;
const ANCHOR_OR_ALIAS = /^[&*][^\s,[\]{}]+(?:\s|$)/;
export const CASE_RESOURCE_LIMITS = Object.freeze({
  maxFileBytes: 2 * 1024 * 1024,
  maxTotalBytes: 32 * 1024 * 1024,
  maxFiles: 1_000,
  maxDirectories: 5_000,
  maxEntries: 20_000,
});
const collectedFileMetadata = new Map();

export function createCaseLoadBudget() {
  return { bytesRead: 0 };
}

function indentOf(line) {
  return line.match(/^(\s*)/)[1].replace(/\t/g, '  ').length;
}

function canStartFlowQuote(prefix) {
  const trimmed = prefix.trimEnd();
  return trimmed === '' || /[:\[\]{},]$/.test(trimmed);
}

function splitTopLevel(body) {
  const parts = [];
  const stack = [];
  let quote = null;
  let current = '';

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      current += char;
      if (quote === '"' && char === '\\') {
        if (index + 1 >= body.length) throw new Error('Malformed quoted scalar in flow collection');
        current += body[index + 1];
        index += 1;
      } else if (quote === "'" && char === "'" && body[index + 1] === "'") {
        current += body[index + 1];
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if ((char === '"' || char === "'") && canStartFlowQuote(current)) {
      quote = char;
      current += char;
      continue;
    }
    if (char === '[' || char === '{') {
      stack.push(char);
      current += char;
      continue;
    }
    if (char === ']' || char === '}') {
      const expected = char === ']' ? '[' : '{';
      if (stack.pop() !== expected) throw new Error('Mismatched flow collection brackets');
      current += char;
      continue;
    }
    if (char === ',' && stack.length === 0) {
      if (current.trim() === '') throw new Error('Malformed flow collection entry');
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (quote) throw new Error('Unterminated quote in flow collection');
  if (stack.length) throw new Error('Unterminated flow collection');
  if (current.trim() === '') throw new Error('Malformed trailing comma in flow collection');
  parts.push(current);
  return parts;
}

function findTopLevelColon(value) {
  const stack = [];
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (quote === '"' && char === '\\') index += 1;
      else if (quote === "'" && char === "'" && value[index + 1] === "'") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if ((char === '"' || char === "'") && canStartFlowQuote(value.slice(0, index))) quote = char;
    else if (char === '[' || char === '{') stack.push(char);
    else if (char === ']' || char === '}') stack.pop();
    else if (char === ':' && stack.length === 0) return index;
  }
  return -1;
}

function parseQuotedScalar(value) {
  const quote = value[0];
  if (value.length < 2 || value.at(-1) !== quote) throw new Error('Unterminated or mismatched quoted scalar');
  if (quote === '"') {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error('Malformed double-quoted scalar');
    }
  }

  const inner = value.slice(1, -1);
  let parsed = '';
  for (let index = 0; index < inner.length; index += 1) {
    if (inner[index] !== "'") {
      parsed += inner[index];
      continue;
    }
    if (inner[index + 1] !== "'") throw new Error('Malformed single-quoted scalar');
    parsed += "'";
    index += 1;
  }
  return parsed;
}

function parseKey(raw) {
  const value = raw.trim();
  if (value === '') throw new Error('Empty mapping key');
  const startsQuoted = value.startsWith('"') || value.startsWith("'");
  const key = startsQuoted ? parseQuotedScalar(value) : value;
  if (!startsQuoted && key === '<<') throw new Error('Unsupported YAML merge key');
  if (!startsQuoted && ANCHOR_OR_ALIAS.test(key)) throw new Error('Unsupported YAML anchor or alias');
  if (DANGEROUS_KEYS.has(key)) throw new Error(`Unsafe mapping key: ${key}`);
  return key;
}

function assertSafeJsonKeys(value) {
  if (value === null || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) throw new Error(`Unsafe mapping key: ${key}`);
    assertSafeJsonKeys(value[key]);
  }
}

function parseFlowSeq(value) {
  const body = value.slice(1, -1).trim();
  if (body === '') return [];
  return splitTopLevel(body).map((part) => parseScalar(part));
}

function parseFlowMap(value) {
  const body = value.slice(1, -1).trim();
  const map = Object.create(null);
  if (body === '') return map;
  for (const part of splitTopLevel(body)) {
    const colon = findTopLevelColon(part);
    if (colon === -1) throw new Error('Malformed flow mapping entry: missing colon');
    const key = parseKey(part.slice(0, colon));
    if (Object.hasOwn(map, key)) throw new Error(`Duplicate mapping key: ${key}`);
    map[key] = parseScalar(part.slice(colon + 1));
  }
  return map;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '' || value === '~' || value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

  const startsQuoted = value.startsWith('"') || value.startsWith("'");
  if (startsQuoted) return parseQuotedScalar(value);

  if (BLOCK_SCALAR_MARKER.test(value)) throw new Error('Unsupported YAML block scalar');
  if (ANCHOR_OR_ALIAS.test(value)) throw new Error('Unsupported YAML anchor or alias');

  if (value.startsWith('[') && value.endsWith(']')) return parseFlowSeq(value);
  if (value.startsWith('{') && value.endsWith('}')) return parseFlowMap(value);
  if ((value.startsWith('[') && value.endsWith('}')) || (value.startsWith('{') && value.endsWith(']'))) {
    throw new Error('Mismatched flow collection brackets');
  }
  return value;
}

function childBlock(lines, start, baseIndent) {
  let end = start + 1;
  while (end < lines.length && indentOf(lines[end]) > baseIndent) end += 1;
  return { block: lines.slice(start + 1, end), end };
}

function parseLines(lines) {
  if (lines.length === 0) return null;
  const baseIndent = Math.min(...lines.map(indentOf));
  const firstAtBase = lines.find((line) => indentOf(line) === baseIndent);
  const isSequence = /^-(\s|$)/.test(firstAtBase.trim());

  if (isSequence) {
    const items = [];
    let index = 0;
    while (index < lines.length) {
      if (indentOf(lines[index]) !== baseIndent) {
        throw new Error('Unexpected indentation');
      }
      if (!/^-(\s|$)/.test(lines[index].trim())) throw new Error('Mixed sequence and mapping entries');
      const { block, end } = childBlock(lines, index, baseIndent);
      const head = lines[index].replace(/^(\s*)-(\s)/, '$1 $2').replace(/^(\s*)-$/, '$1 ');
      const itemLines = [head, ...block];
      const trimmedHead = head.trim();
      items.push(trimmedHead === '' && block.length === 0 ? null : parseLines(itemLines));
      index = end;
    }
    return items;
  }

  const hasKey = lines.some((line) => indentOf(line) === baseIndent && /:(\s|$)/.test(line.trim()));
  if (!hasKey) return parseScalar(firstAtBase.trim());

  const map = Object.create(null);
  let index = 0;
  while (index < lines.length) {
    if (indentOf(lines[index]) !== baseIndent) {
      throw new Error('Unexpected indentation');
    }
    const line = lines[index].trim();
    const colon = line.indexOf(':');
    if (colon === -1) throw new Error('Malformed mapping entry: missing colon');
    const key = parseKey(line.slice(0, colon));
    if (Object.hasOwn(map, key)) throw new Error(`Duplicate mapping key: ${key}`);
    const inline = line.slice(colon + 1).trim();
    if (inline !== '') {
      map[key] = parseScalar(inline);
      index += 1;
    } else {
      const { block, end } = childBlock(lines, index, baseIndent);
      map[key] = block.length ? parseLines(block) : null;
      index = end;
    }
  }
  return map;
}

export function parseDocument(text) {
  const cleaned = text
    .split('\n')
    .filter((line) => line.trim() !== '' && !/^\s*#/.test(line));
  const docs = [];
  let current = [];
  for (const line of cleaned) {
    if (/^---\s*$/.test(line)) {
      if (current.length) docs.push(current);
      current = [];
      continue;
    }
    current.push(line);
  }
  if (current.length) docs.push(current);

  const cases = [];
  for (const doc of docs) {
    const value = parseLines(doc);
    if (Array.isArray(value)) cases.push(...value);
    else cases.push(value);
  }
  return cases;
}

function readBoundedUtf8(fd, maxBytes, label) {
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
  if (total > maxBytes) throw new Error(`Input exceeds the ${maxBytes}-byte (2 MiB) file limit: ${label}`);
  return { text: Buffer.concat(chunks, total).toString('utf8'), bytes: total };
}

function isContained(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function readCaseText(file, loadBudget, metadata = null) {
  const budget = loadBudget && typeof loadBudget === 'object' ? loadBudget : createCaseLoadBudget();
  if (!Number.isFinite(budget.bytesRead) || budget.bytesRead < 0) throw new Error('Invalid case-load resource budget');

  const stat = fs.lstatSync(file);
  if (stat.isSymbolicLink()) throw new Error(`Input path is a symbolic link: ${file}`);
  if (!stat.isFile()) throw new Error(`Input must be a regular file: ${file}`);
  const realBeforeOpen = fs.realpathSync(file);
  if (metadata) {
    const sameCollectedFile = stat.dev === metadata.dev && stat.ino === metadata.ino &&
      realBeforeOpen === metadata.canonicalPath && isContained(metadata.containmentRoot, realBeforeOpen);
    if (!sameCollectedFile) throw new Error(`Input or its parent changed after collection: ${file}`);
  }
  if (stat.size > CASE_RESOURCE_LIMITS.maxFileBytes) {
    throw new Error(`Input exceeds the ${CASE_RESOURCE_LIMITS.maxFileBytes}-byte (2 MiB) file limit: ${file}`);
  }

  let fd;
  try {
    fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
    const openedStat = fs.fstatSync(fd);
    const currentStat = fs.lstatSync(file);
    const sameFile = openedStat.isFile() && currentStat.isFile() && !currentStat.isSymbolicLink() &&
      stat.dev === openedStat.dev && stat.ino === openedStat.ino &&
      currentStat.dev === openedStat.dev && currentStat.ino === openedStat.ino;
    const realAfterOpen = fs.realpathSync(file);
    const sameCollectedPath = !metadata ||
      (realAfterOpen === metadata.canonicalPath && isContained(metadata.containmentRoot, realAfterOpen));
    if (!sameFile || !sameCollectedPath) throw new Error(`Input or its parent changed during inspection: ${file}`);
    if (openedStat.size > CASE_RESOURCE_LIMITS.maxFileBytes) {
      throw new Error(`Input exceeds the ${CASE_RESOURCE_LIMITS.maxFileBytes}-byte (2 MiB) file limit: ${file}`);
    }
    const readResult = readBoundedUtf8(fd, CASE_RESOURCE_LIMITS.maxFileBytes, file);
    if (budget.bytesRead + readResult.bytes > CASE_RESOURCE_LIMITS.maxTotalBytes) {
      throw new Error(`Case inputs exceed the ${CASE_RESOURCE_LIMITS.maxTotalBytes}-byte (32 MiB) aggregate limit`);
    }
    budget.bytesRead += readResult.bytes;
    return readResult.text;
  } catch (error) {
    if (error.code === 'ELOOP') throw new Error(`Input path is a symbolic link: ${file}`);
    throw error;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
}

export function loadCases(file, loadBudget = createCaseLoadBudget()) {
  const resolved = path.resolve(file);
  const text = readCaseText(resolved, loadBudget, collectedFileMetadata.get(resolved) || null);
  if (/\.json$/i.test(file)) {
    const parsed = JSON.parse(text);
    assertSafeJsonKeys(parsed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return parseDocument(text);
}

// Resolves files and directories to a unique list of regular YAML/JSON case files.
// Direct symbolic links and unsupported files are rejected; directory scans skip links.
export function collectCaseFiles(targets) {
  const out = new Map();
  let declaredBytes = 0;
  let directoryCount = 0;
  let entryCount = 0;

  const addFile = (file, stat, containmentRoot) => {
    if (stat.size > CASE_RESOURCE_LIMITS.maxFileBytes) {
      throw new Error(`Input exceeds the ${CASE_RESOURCE_LIMITS.maxFileBytes}-byte (2 MiB) file limit: ${file}`);
    }
    const canonical = fs.realpathSync(file);
    if (out.has(canonical)) return;
    if (out.size >= CASE_RESOURCE_LIMITS.maxFiles) {
      throw new Error(`Case file count exceeds the ${CASE_RESOURCE_LIMITS.maxFiles}-file limit`);
    }
    if (declaredBytes + stat.size > CASE_RESOURCE_LIMITS.maxTotalBytes) {
      throw new Error(`Case inputs exceed the ${CASE_RESOURCE_LIMITS.maxTotalBytes}-byte (32 MiB) aggregate limit`);
    }
    declaredBytes += stat.size;
    const resolved = path.resolve(file);
    out.set(canonical, resolved);
    collectedFileMetadata.set(resolved, {
      canonicalPath: canonical,
      containmentRoot,
      dev: stat.dev,
      ino: stat.ino,
    });
  };

  const scanDirectory = (target) => {
    const scanRoot = fs.realpathSync(target);
    const pending = [scanRoot];
    while (pending.length > 0) {
      const directory = pending.pop();
      directoryCount += 1;
      if (directoryCount > CASE_RESOURCE_LIMITS.maxDirectories) {
        throw new Error(`Case directory count exceeds the ${CASE_RESOURCE_LIMITS.maxDirectories}-directory limit`);
      }
      const directoryStat = fs.lstatSync(directory);
      if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory() || !isContained(scanRoot, fs.realpathSync(directory))) {
        throw new Error(`Unsafe case directory: ${directory}`);
      }

      let handle;
      const entries = [];
      try {
        handle = fs.opendirSync(directory);
        while (true) {
          const entry = handle.readSync();
          if (!entry) break;
          entryCount += 1;
          if (entryCount > CASE_RESOURCE_LIMITS.maxEntries) {
            throw new Error(`Case directory entries exceed the ${CASE_RESOURCE_LIMITS.maxEntries}-entry limit`);
          }
          entries.push(entry);
        }
      } finally {
        if (handle) handle.closeSync();
      }

      const childDirectories = [];
      for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const full = path.join(directory, entry.name);
        const stat = fs.lstatSync(full);
        if (stat.isSymbolicLink()) continue;
        if (stat.isDirectory()) {
          const realDirectory = fs.realpathSync(full);
          if (!isContained(scanRoot, realDirectory)) throw new Error(`Case directory escapes the scan root: ${full}`);
          childDirectories.push(realDirectory);
        } else if (stat.isFile() && VALID_EXT.test(entry.name)) {
          const realFile = fs.realpathSync(full);
          if (!isContained(scanRoot, realFile)) throw new Error(`Case file escapes the scan root: ${full}`);
          addFile(full, stat, scanRoot);
        }
      }
      for (const child of childDirectories.reverse()) pending.push(child);
    }
  };

  for (const target of targets) {
    const resolved = path.resolve(target);
    let stat;
    try {
      stat = fs.lstatSync(resolved);
    } catch (error) {
      if (error.code === 'ENOENT') throw new Error(`Path not found: ${resolved}`);
      throw error;
    }
    if (stat.isSymbolicLink()) throw new Error(`Input path is a symbolic link: ${resolved}`);
    if (stat.isFile()) {
      if (!VALID_EXT.test(path.basename(resolved))) {
        throw new Error(`Input must be a supported YAML/JSON file: ${resolved}`);
      }
      const canonical = fs.realpathSync(resolved);
      addFile(resolved, stat, path.dirname(canonical));
      continue;
    }
    if (!stat.isDirectory()) throw new Error(`Input must be a regular file or directory: ${resolved}`);
    scanDirectory(resolved);
  }
  return [...out.values()].sort();
}
