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

function indentOf(line) {
  return line.match(/^(\s*)/)[1].replace(/\t/g, '  ').length;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '' || value === '~' || value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[') && value.endsWith(']')) return parseFlowSeq(value);
  if (value.startsWith('{') && value.endsWith('}')) return parseFlowMap(value);
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let current = '';
  for (const char of body) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === '[' || char === '{') depth += 1;
    if (char === ']' || char === '}') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim() !== '') parts.push(current);
  return parts;
}

function parseFlowSeq(value) {
  const body = value.slice(1, -1).trim();
  if (body === '') return [];
  return splitTopLevel(body).map((part) => parseScalar(part));
}

function parseFlowMap(value) {
  const body = value.slice(1, -1).trim();
  const map = {};
  if (body === '') return map;
  for (const part of splitTopLevel(body)) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    map[part.slice(0, idx).trim()] = parseScalar(part.slice(idx + 1));
  }
  return map;
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
    let i = 0;
    while (i < lines.length) {
      if (indentOf(lines[i]) !== baseIndent) {
        i += 1;
        continue;
      }
      const { block, end } = childBlock(lines, i, baseIndent);
      // Replace the leading dash with a space so the item content aligns as its own block.
      const head = lines[i].replace(/^(\s*)-(\s)/, '$1 $2').replace(/^(\s*)-$/, '$1 ');
      const itemLines = [head, ...block];
      const trimmedHead = head.trim();
      items.push(trimmedHead === '' && block.length === 0 ? null : parseLines(itemLines));
      i = end;
    }
    return items;
  }

  // A block with no `key:` line at the base indent is a single scalar (e.g. a block list item).
  const hasKey = lines.some((line) => indentOf(line) === baseIndent && /:(\s|$)/.test(line.trim()));
  if (!hasKey) return parseScalar(firstAtBase.trim());

  const map = {};
  let i = 0;
  while (i < lines.length) {
    if (indentOf(lines[i]) !== baseIndent) {
      i += 1;
      continue;
    }
    const line = lines[i].trim();
    const colon = line.indexOf(':');
    if (colon === -1) {
      i += 1;
      continue;
    }
    const key = line.slice(0, colon).trim();
    const inline = line.slice(colon + 1).trim();
    if (inline !== '') {
      map[key] = parseScalar(inline);
      i += 1;
    } else {
      const { block, end } = childBlock(lines, i, baseIndent);
      map[key] = block.length ? parseLines(block) : null;
      i = end;
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
    if (Array.isArray(value)) cases.push(...value.filter((v) => v && typeof v === 'object'));
    else if (value && typeof value === 'object') cases.push(value);
  }
  return cases;
}

export function loadCases(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const parsed = JSON.parse(text);
    // Keep only object-shaped cases so a stray scalar cannot crash validation.
    return (Array.isArray(parsed) ? parsed : [parsed]).filter((value) => value && typeof value === 'object');
  }
  return parseDocument(text);
}

const VALID_EXT = /\.(ya?ml|json)$/i;
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

// Resolves files and directories to a unique list of case files.
// Throws on a missing path so callers can exit with a usage error.
export function collectCaseFiles(targets) {
  const out = [];
  for (const target of targets) {
    const resolved = path.resolve(target);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Path not found: ${resolved}`);
    }
    const stat = fs.statSync(resolved);
    if (stat.isFile()) {
      out.push(resolved);
      continue;
    }
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (VALID_EXT.test(entry.name)) out.push(full);
      }
    };
    walk(resolved);
  }
  return [...new Set(out)];
}
