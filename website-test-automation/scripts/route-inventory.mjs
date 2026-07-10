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
const MAX_ENTRIES = 50_000;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const routeFiles = [];
const notes = [];
let visitedDirectories = 0;
let visitedEntries = 0;
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
  let handle;
  let entries;
  try {
    const stats = fs.lstatSync(dir);
    if (stats.isSymbolicLink() || !stats.isDirectory() || !isContained(fs.realpathSync(dir))) {
      addNote(`Skipped unsafe route directory: ${relativePath(dir)}`);
      return;
    }
    handle = fs.opendirSync(dir);
    entries = [];
    while (!scanStopped) {
      const entry = handle.readSync();
      if (!entry) break;
      visitedEntries += 1;
      if (visitedEntries > MAX_ENTRIES) {
        addNote(`Route entry scan exceeded ${MAX_ENTRIES}; remaining entries were ignored.`);
        scanStopped = true;
        break;
      }
      entries.push(entry);
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    addNote(`Unreadable directory skipped: ${relativePath(dir)} (${error.code || error.message})`);
    return;
  } finally {
    if (handle) {
      try {
        handle.closeSync();
      } catch {
        // A close race must not hide the bounded scan result.
      }
    }
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
  return total > maxBytes ? null : Buffer.concat(chunks, total).toString('utf8');
}

function readRouteSource(file) {
  const label = relativePath(file);
  let fd;
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
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    fd = fs.openSync(file, fs.constants.O_RDONLY | noFollow);
    const openedStats = fs.fstatSync(fd);
    const currentStats = fs.lstatSync(file);
    const sameFile = openedStats.isFile() && currentStats.isFile() && !currentStats.isSymbolicLink() &&
      stats.dev === openedStats.dev && stats.ino === openedStats.ino &&
      currentStats.dev === openedStats.dev && currentStats.ino === openedStats.ino;
    if (!sameFile || !isContained(fs.realpathSync(file))) {
      addNote(`Route file changed during inspection: ${label}`);
      return null;
    }
    const content = readBoundedUtf8(fd, MAX_SOURCE_BYTES);
    if (content === null) {
      addNote(`Skipped oversized route file: ${label}`);
      return null;
    }
    return content;
  } catch (error) {
    if (error.code === 'ELOOP') {
      addNote(`Skipped route file symlink: ${label}`);
      return null;
    }
    addNote(`Unreadable route file skipped: ${label} (${error.code || error.message})`);
    return null;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
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
const projectRootCache = new Map();

function hasSafePackageBoundary(directory) {
  const manifest = path.join(directory, 'package.json');
  try {
    const stats = fs.lstatSync(manifest);
    if (stats.isSymbolicLink()) {
      addNote(`Skipped package boundary symlink: ${relativePath(manifest)}`);
      return false;
    }
    return stats.isFile() && isContained(fs.realpathSync(manifest));
  } catch {
    return false;
  }
}

function findProjectRoot(file) {
  let directory = path.dirname(file);
  const visited = [];
  let projectRoot = root;
  while (isContained(directory)) {
    if (projectRootCache.has(directory)) {
      projectRoot = projectRootCache.get(directory);
      break;
    }
    visited.push(directory);
    if (directory === root || hasSafePackageBoundary(directory)) {
      projectRoot = directory;
      break;
    }
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  for (const visitedDirectory of visited) projectRootCache.set(visitedDirectory, projectRoot);
  return projectRoot;
}

for (const file of routeFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  const projectRoot = findProjectRoot(file);
  const projectRel = path.relative(projectRoot, file).replaceAll(path.sep, '/');
  const content = readRouteSource(file);
  if (content === null) continue;
  const uncommented = sanitizeJavaScript(content);
  const methodSource = sanitizeJavaScript(content, { maskStrings: true });

  if (/\.html$/.test(rel)) {
    const raw = rel.replace(/\.html$/, '').replace(/(^|\/)index$/, '');
    add('static-html-route', '/' + raw, file, 'medium');
  }

  const appPageMatch = projectRel.match(/^(?:src\/)?app\/(?:(.*)\/)?page\.(tsx?|jsx?)$/);
  if (appPageMatch) {
    add('next-app-route', toRoutePath(appPageMatch[1] || ''), file, 'high');
  }

  const appApiMatch = projectRel.match(/^(?:src\/)?app\/api(?:\/(.*))?\/route\.(tsx?|jsx?)$/);
  if (appApiMatch) {
    const raw = appApiMatch[1] || '';
    const foundMethods = new Set([
      ...methodSource.matchAll(/\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g),
      ...methodSource.matchAll(/\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=\s*(?=(?:async\s+)?(?:function\b|\([^;\n]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>))/g),
    ].map((match) => match[1]));
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].filter((method) => foundMethods.has(method));
    const methodPrefix = methods.length ? methods.join('|') + ' ' : '';
    add('next-app-api-route', `${methodPrefix}${toApiRoutePath(raw)}`, file, 'high');
  }

  const pagesMatch = projectRel.match(/^(?:src\/)?pages\/(.*)\.(tsx?|jsx?)$/);
  if (pagesMatch && !['_app', '_document'].includes(pagesMatch[1].split('/').at(-1))) {
    const raw = pagesMatch[1];
    add(raw.startsWith('api/') ? 'next-api-route' : 'next-pages-route', toPagesRoutePath(raw), file, 'high');
  }

  const nuxtPagesMatch = projectRel.match(/^(?:src\/)?(?:app\/)?pages\/(.*)\.vue$/);
  if (nuxtPagesMatch) {
    add('nuxt-pages-route', toPagesRoutePath(nuxtPagesMatch[1]), file, 'high');
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
