#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('Usage: route-inventory.mjs [repo-path]\nOutputs JSON route inventory for common website structures.');
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const inputRoot = path.resolve(process.argv[2] || '.');
let root;
try {
  if (!fs.statSync(inputRoot).isDirectory()) throw new Error('not a directory');
  root = fs.realpathSync(inputRoot);
} catch {
  console.error(`Unreadable repo path: ${inputRoot}`);
  process.exit(2);
}

const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const MAX_ROUTE_FILES = 20_000;
const MAX_DIRECTORIES = 10_000;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const routeFiles = [];
const notes = [];
let visitedDirectories = 0;
let scanStopped = false;

const addNote = (message) => {
  if (!notes.includes(message)) notes.push(message);
};
const relativePath = (target) => path.relative(root, target).replaceAll(path.sep, '/') || '.';
const isContained = (target) => {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

function walk(dir) {
  if (scanStopped) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    addNote(`Unreadable directory skipped: ${relativePath(dir)} (${error.code || error.message})`);
    return;
  }
  for (const entry of entries) {
    if (scanStopped) return;
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    let stats;
    try {
      stats = fs.lstatSync(full);
    } catch (error) {
      addNote(`Unreadable path skipped: ${relativePath(full)} (${error.code || error.message})`);
      continue;
    }
    if (stats.isSymbolicLink()) {
      addNote(`Skipped route scan symlink: ${relativePath(full)}`);
      continue;
    }
    if (stats.isDirectory()) {
      visitedDirectories += 1;
      if (visitedDirectories > MAX_DIRECTORIES) {
        addNote(`Route directory scan exceeded ${MAX_DIRECTORIES}; remaining directories were ignored.`);
        scanStopped = true;
        return;
      }
      walk(full);
    } else if (stats.isFile() && /\.(tsx?|jsx?|vue|svelte|html)$/.test(entry.name)) {
      if (routeFiles.length >= MAX_ROUTE_FILES) {
        addNote(`Route file limit reached ${MAX_ROUTE_FILES}; additional files were ignored.`);
        scanStopped = true;
        return;
      }
      routeFiles.push(full);
    }
  }
}

walk(root);

function readRouteSource(file) {
  const label = relativePath(file);
  let stats;
  try {
    stats = fs.lstatSync(file);
    if (stats.isSymbolicLink()) {
      addNote(`Skipped route file symlink: ${label}`);
      return null;
    }
    if (!stats.isFile()) {
      addNote(`Skipped non-regular route file: ${label}`);
      return null;
    }
    if (stats.size > MAX_SOURCE_BYTES) {
      addNote(`Skipped oversized route file: ${label}`);
      return null;
    }
    if (!isContained(fs.realpathSync(file))) {
      addNote(`Skipped route file outside repository root: ${label}`);
      return null;
    }
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    addNote(`Unreadable route file skipped: ${label} (${error.code || error.message})`);
    return null;
  }
}

function sanitizeJavaScript(source, { maskStrings = false } = {}) {
  let output = '';
  let state = 'code';
  let quote = null;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (state === 'line-comment') {
      if (char === '\n' || char === '\r') {
        output += char;
        state = 'code';
      } else {
        output += ' ';
      }
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        output += '  ';
        index += 1;
        state = 'code';
      } else {
        output += char === '\n' || char === '\r' ? char : ' ';
      }
      continue;
    }
    if (state === 'string') {
      if (char === '\\' && next !== undefined) {
        output += maskStrings ? '  ' : `${char}${next}`;
        index += 1;
      } else {
        output += maskStrings && char !== '\n' && char !== '\r' ? ' ' : char;
        if (char === quote) {
          state = 'code';
          quote = null;
        }
      }
      continue;
    }
    if (char === '/' && next === '/') {
      output += '  ';
      index += 1;
      state = 'line-comment';
    } else if (char === '/' && next === '*') {
      output += '  ';
      index += 1;
      state = 'block-comment';
    } else if (char === '"' || char === "'" || char === '`') {
      output += maskStrings ? ' ' : char;
      state = 'string';
      quote = char;
    } else {
      output += char;
    }
  }
  return output;
}

const routes = [];
const add = (kind, route, file, confidence = 'medium') => {
  routes.push({ kind, route, file: path.relative(root, file), confidence });
};
const toRoutePath = (raw) => {
  const parts = [];
  for (const originalPart of raw.split('/').filter(Boolean)) {
    if (originalPart.startsWith('@')) continue;
    let part = originalPart;
    if (part.startsWith('(...)')) {
      parts.length = 0;
      part = part.slice(5);
    } else {
      while (part.startsWith('(..)')) {
        parts.pop();
        part = part.slice(4);
      }
      if (part.startsWith('(.)')) part = part.slice(3);
    }
    if (!part || /^\([^)]*\)$/.test(part)) continue;
    parts.push(part);
  }
  return parts.length ? `/${parts.join('/')}` : '/';
};
const toApiRoutePath = (raw) => {
  const nested = toRoutePath(raw || '');
  return nested === '/' ? '/api' : `/api${nested}`;
};
const toPagesRoutePath = (raw) => toRoutePath(raw.replace(/(^|\/)index$/, ''));

for (const file of routeFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  const content = readRouteSource(file);
  if (content === null) continue;
  const uncommented = sanitizeJavaScript(content);
  const methodSource = sanitizeJavaScript(content, { maskStrings: true });

  if (/\.html$/.test(rel)) {
    const raw = rel.replace(/\.html$/, '').replace(/(^|\/)index$/, '');
    add('static-html-route', '/' + raw, file, 'medium');
  }

  if (/^(src\/)?app\/(?:.*\/)?page\.(tsx?|jsx?)$/.test(rel)) {
    const raw = rel.replace(/^(src\/)?app\//, '').replace(/\/?page\.(tsx?|jsx?)$/, '');
    add('next-app-route', toRoutePath(raw), file, 'high');
  }

  const appApiMatch = rel.match(/^(src\/)?app\/api(?:\/(.*))?\/route\.(tsx?|jsx?)$/);
  if (appApiMatch) {
    const raw = appApiMatch[2] || '';
    const foundMethods = new Set([
      ...methodSource.matchAll(/\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g),
      ...methodSource.matchAll(/\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=\s*(?=(?:async\s+)?(?:function\b|\([^;\n]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>))/g),
    ].map((match) => match[1]));
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].filter((method) => foundMethods.has(method));
    const methodPrefix = methods.length ? methods.join('|') + ' ' : '';
    add('next-app-api-route', `${methodPrefix}${toApiRoutePath(raw)}`, file, 'high');
  }

  if (/^(src\/)?pages\/.*\.(tsx?|jsx?)$/.test(rel) && !rel.includes('/_app.') && !rel.includes('/_document.')) {
    const raw = rel.replace(/^(src\/)?pages\//, '').replace(/\.(tsx?|jsx?)$/, '');
    add(rel.includes('/api/') ? 'next-api-route' : 'next-pages-route', toPagesRoutePath(raw), file, 'high');
  }

  if (/^(src\/)?pages\/.*\.vue$/.test(rel)) {
    const raw = rel.replace(/^(src\/)?pages\//, '').replace(/\.vue$/, '');
    add('nuxt-pages-route', toPagesRoutePath(raw), file, 'high');
  }

  for (const match of uncommented.matchAll(/\b(?:app|router)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g)) {
    add('server-route', `${match[1].toUpperCase()} ${match[2]}`, file, 'medium');
  }

  for (const match of uncommented.matchAll(/\b(?:Route\s+path=|path:\s*)['"`]([^'"`]+)['"`]/g)) {
    add('client-route', match[1], file, 'low');
  }
}

console.log(JSON.stringify({
  repo: inputRoot,
  routeCount: routes.length,
  routes,
  notes: routes.length ? notes : [...notes, 'No common route patterns detected.'],
}, null, 2));
