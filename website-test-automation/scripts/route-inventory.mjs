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

const root = path.resolve(process.argv[2] || '.');
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  console.error(`Unreadable repo path: ${root}`);
  process.exit(2);
}

const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const routeFiles = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?|vue|svelte|html)$/.test(entry.name)) routeFiles.push(full);
  }
}

walk(root);

const routes = [];
const add = (kind, route, file, confidence = 'medium') => {
  routes.push({ kind, route, file: path.relative(root, file), confidence });
};
const toRoutePath = (raw) => {
  const route = raw
    .split('/')
    .filter((part) => part && !/^\(.*\)$/.test(part))
    .join('/');
  return route ? `/${route}` : '/';
};
const toApiRoutePath = (raw) => {
  const nested = toRoutePath(raw || '');
  return nested === '/' ? '/api' : `/api${nested}`;
};

for (const file of routeFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, '/');
  const content = fs.readFileSync(file, 'utf8');

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
    const methods = [...content.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map((m) => m[1]);
    const methodPrefix = methods.length ? methods.join('|') + ' ' : '';
    add('next-app-api-route', `${methodPrefix}${toApiRoutePath(raw)}`, file, 'high');
  }

  if (/^(src\/)?pages\/.*\.(tsx?|jsx?)$/.test(rel) && !rel.includes('/_app.') && !rel.includes('/_document.')) {
    const raw = rel.replace(/^(src\/)?pages\//, '').replace(/\.(tsx?|jsx?)$/, '').replace(/\/index$/, '');
    add(rel.includes('/api/') ? 'next-api-route' : 'next-pages-route', '/' + raw, file, 'high');
  }

  for (const match of content.matchAll(/\b(?:app|router)\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g)) {
    add('server-route', `${match[1].toUpperCase()} ${match[2]}`, file, 'medium');
  }

  for (const match of content.matchAll(/\b(?:Route\s+path=|path:\s*)['"`]([^'"`]+)['"`]/g)) {
    add('client-route', match[1], file, 'low');
  }
}

console.log(JSON.stringify({
  repo: root,
  routeCount: routes.length,
  routes,
  notes: routes.length ? [] : ['No common route patterns detected.'],
}, null, 2));
