#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log('Usage: detect-web-test-stack.mjs [repo-path]\nOutputs JSON with package manager, workspace packages, frameworks, test tools, scripts, CI files, and notes.');
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

const MAX_PACKAGE_BYTES = 2 * 1024 * 1024;
const MAX_WORKSPACE_DIRECTORIES = 10_000;
const MAX_WORKSPACE_PACKAGES = 500;
const ignoredDirectories = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const confidenceNotes = [];

const addNote = (message) => {
  if (!confidenceNotes.includes(message)) confidenceNotes.push(message);
};
const rel = (target) => path.relative(root, target).replaceAll(path.sep, '/') || '.';
const isContained = (target) => {
  const relative = path.relative(root, target);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

function inspectRegularFile(target, label, maxBytes = Number.POSITIVE_INFINITY) {
  let stats;
  try {
    stats = fs.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return { status: 'missing', exists: false };
    addNote(`Unreadable ${label}: ${error.code || error.message}`);
    return { status: 'non-regular', exists: true };
  }
  if (stats.isSymbolicLink()) {
    addNote(`Skipped symlink: ${label}`);
    return { status: 'symlink-rejected', exists: true };
  }
  if (!stats.isFile()) {
    addNote(`Skipped non-regular file: ${label}`);
    return { status: 'non-regular', exists: true };
  }
  if (stats.size > maxBytes) {
    addNote(`Oversized file skipped: ${label}`);
    return { status: 'oversized', exists: true };
  }
  try {
    const real = fs.realpathSync(target);
    if (!isContained(real)) {
      addNote(`Skipped path outside repository root: ${label}`);
      return { status: 'symlink-rejected', exists: true };
    }
  } catch (error) {
    addNote(`Unreadable ${label}: ${error.code || error.message}`);
    return { status: 'non-regular', exists: true };
  }
  return { status: 'regular', exists: true, stats };
}

function safeFileExists(baseDir, name) {
  const target = path.join(baseDir, name);
  return inspectRegularFile(target, rel(target)).status === 'regular';
}

function safeDirectoryExists(target, label) {
  let stats;
  try {
    stats = fs.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    addNote(`Unreadable ${label}: ${error.code || error.message}`);
    return false;
  }
  if (stats.isSymbolicLink()) {
    addNote(`Skipped symlink: ${label}`);
    return false;
  }
  if (!stats.isDirectory()) return false;
  try {
    return isContained(fs.realpathSync(target));
  } catch {
    return false;
  }
}

function inspectPackage(packageDir, packagePath) {
  const packageFile = path.join(packageDir, 'package.json');
  const label = packagePath === '.' ? 'package.json' : `${packagePath}/package.json`;
  const inspection = inspectRegularFile(packageFile, label, MAX_PACKAGE_BYTES);
  const base = {
    path: packagePath,
    name: null,
    hasPackageJson: inspection.exists,
    packageJsonStatus: inspection.status === 'regular' ? 'parsed' : inspection.status,
    scripts: {},
    frameworks: [],
    testFrameworks: [],
    browserTools: [],
  };
  if (inspection.status === 'missing') return { report: { ...base, packageJsonStatus: 'missing' }, pkg: null };
  if (inspection.status === 'symlink-rejected' || inspection.status === 'non-regular') {
    return { report: base, pkg: null };
  }
  if (inspection.status === 'oversized') {
    addNote(`Malformed package.json: ${label} (exceeds ${MAX_PACKAGE_BYTES} bytes)`);
    return { report: { ...base, packageJsonStatus: 'malformed' }, pkg: null };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('root value must be an object');
  } catch {
    addNote(`Malformed package.json: ${label}`);
    return { report: { ...base, packageJsonStatus: 'malformed' }, pkg: null };
  }
  return { report: base, pkg };
}

const frameworkDependencies = [
  ['next', 'nextjs'],
  ['react', 'react'],
  ['vue', 'vue'],
  ['nuxt', 'nuxt'],
  ['@angular/core', 'angular'],
  ['svelte', 'svelte'],
  ['vite', 'vite'],
  ['express', 'express'],
  ['fastify', 'fastify'],
];
const testDependencies = [
  ['@playwright/test', 'playwright'],
  ['cypress', 'cypress'],
  ['selenium-webdriver', 'selenium'],
  ['webdriverio', 'webdriverio'],
  ['jest', 'jest'],
  ['vitest', 'vitest'],
];

function analyzePackage(packageDir, inspected) {
  const { report, pkg } = inspected;
  if (!pkg) return report;
  const dependencies = pkg.dependencies && typeof pkg.dependencies === 'object' && !Array.isArray(pkg.dependencies)
    ? pkg.dependencies : {};
  const devDependencies = pkg.devDependencies && typeof pkg.devDependencies === 'object' && !Array.isArray(pkg.devDependencies)
    ? pkg.devDependencies : {};
  const deps = { ...dependencies, ...devDependencies };
  const hasDep = (name) => Object.prototype.hasOwnProperty.call(deps, name);
  const frameworks = frameworkDependencies.filter(([name]) => hasDep(name)).map(([, label]) => label);
  const testFrameworks = testDependencies.filter(([name]) => hasDep(name)).map(([, label]) => label);
  const hasWdio = ['webdriverio', '@wdio/cli', '@wdio/globals'].some(hasDep) ||
    ['wdio.conf.ts', 'wdio.conf.js', 'wdio.conf.mjs', 'wdio.conf.cjs'].some((name) => safeFileExists(packageDir, name));
  if (hasWdio && !testFrameworks.includes('webdriverio')) testFrameworks.push('webdriverio');

  const browserTools = [];
  if (hasDep('@playwright/test') || ['playwright.config.ts', 'playwright.config.js', 'playwright.config.mjs', 'playwright.config.cjs'].some((name) => safeFileExists(packageDir, name))) {
    browserTools.push('playwright-runner');
  }
  if (hasDep('cypress') || ['cypress.config.ts', 'cypress.config.js', 'cypress.config.mjs', 'cypress.config.cjs'].some((name) => safeFileExists(packageDir, name))) {
    browserTools.push('cypress');
  }
  if (hasDep('selenium-webdriver')) browserTools.push('selenium');
  if (hasWdio) browserTools.push('webdriverio');

  const scripts = pkg.scripts && typeof pkg.scripts === 'object' && !Array.isArray(pkg.scripts) ? pkg.scripts : {};
  return {
    ...report,
    name: typeof pkg.name === 'string' ? pkg.name : null,
    scripts,
    frameworks: [...new Set(frameworks)].sort(),
    testFrameworks: [...new Set(testFrameworks)].sort(),
    browserTools: [...new Set(browserTools)].sort(),
  };
}

function stripYamlComment(value) {
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote === char ? null : char;
    } else if (char === '#' && !quote) {
      return value.slice(0, index);
    }
  }
  return value;
}

function normalizeWorkspacePattern(value, source) {
  if (typeof value !== 'string') return null;
  let pattern = value.trim();
  if ((pattern.startsWith('"') && pattern.endsWith('"')) || (pattern.startsWith("'") && pattern.endsWith("'"))) {
    pattern = pattern.slice(1, -1).trim();
  }
  pattern = pattern.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  if (!pattern) return null;
  if (pattern.startsWith('!') || path.posix.isAbsolute(pattern) || pattern.split('/').includes('..') || /[{}()[\]]/.test(pattern)) {
    addNote(`Unsupported workspace pattern from ${source}: ${pattern}`);
    return null;
  }
  return pattern;
}

function readPnpmWorkspacePatterns() {
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml');
  const inspection = inspectRegularFile(workspaceFile, 'pnpm-workspace.yaml', MAX_PACKAGE_BYTES);
  if (inspection.status !== 'regular') return { present: false, patterns: [] };
  const lines = fs.readFileSync(workspaceFile, 'utf8').split(/\r?\n/);
  const patterns = [];
  let inPackages = false;
  for (const rawLine of lines) {
    const line = stripYamlComment(rawLine).trimEnd();
    if (!inPackages) {
      if (/^packages\s*:\s*$/.test(line.trim())) inPackages = true;
      continue;
    }
    if (!line.trim()) continue;
    const match = line.match(/^\s+-\s+(.+?)\s*$/);
    if (!match) {
      if (!/^\s/.test(line)) break;
      continue;
    }
    const normalized = normalizeWorkspacePattern(match[1], 'pnpm-workspace.yaml');
    if (normalized) patterns.push(normalized);
  }
  return { present: true, patterns };
}

function globToRegExp(pattern) {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    if (char === '*' && pattern[index + 1] === '*') {
      source += '.*';
      index += 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
    }
  }
  return new RegExp(`${source}$`);
}

function discoverWorkspaceDirectories(patterns) {
  if (patterns.length === 0) return [];
  const matchers = patterns.map(globToRegExp);
  const matches = new Set();
  let visitedDirectories = 0;
  let stopped = false;

  function walk(directory) {
    if (stopped) return;
    let entries;
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    } catch {
      return;
    }
    for (const entry of entries) {
      if (stopped || ignoredDirectories.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      const relative = rel(full);
      if (entry.isSymbolicLink()) {
        addNote(`Skipped workspace scan symlink: ${relative}`);
        continue;
      }
      if (!entry.isDirectory()) continue;
      visitedDirectories += 1;
      if (visitedDirectories > MAX_WORKSPACE_DIRECTORIES) {
        addNote(`Workspace directory scan exceeded ${MAX_WORKSPACE_DIRECTORIES}; remaining directories were ignored.`);
        stopped = true;
        return;
      }
      if (matchers.some((matcher) => matcher.test(relative))) {
        const packageInspection = inspectRegularFile(path.join(full, 'package.json'), `${relative}/package.json`, MAX_PACKAGE_BYTES);
        if (packageInspection.exists) matches.add(relative);
      }
      walk(full);
    }
  }

  walk(root);
  return [...matches].sort().slice(0, MAX_WORKSPACE_PACKAGES);
}

const rootInspection = inspectPackage(root, '.');
const rootPkg = rootInspection.pkg;
const workspacePatterns = [];
const workspaceSources = [];
const rawWorkspaces = Array.isArray(rootPkg?.workspaces)
  ? rootPkg.workspaces
  : rootPkg?.workspaces && Array.isArray(rootPkg.workspaces.packages)
    ? rootPkg.workspaces.packages
    : [];
if (rawWorkspaces.length > 0) {
  workspaceSources.push('package.json#workspaces');
  for (const value of rawWorkspaces) {
    const normalized = normalizeWorkspacePattern(value, 'package.json#workspaces');
    if (normalized) workspacePatterns.push(normalized);
  }
}
const pnpmWorkspace = readPnpmWorkspacePatterns();
if (pnpmWorkspace.present) workspaceSources.push('pnpm-workspace.yaml');
workspacePatterns.push(...pnpmWorkspace.patterns);
const patterns = [...new Set(workspacePatterns)].sort();
const workspacePaths = discoverWorkspaceDirectories(patterns);
if (workspacePaths.length >= MAX_WORKSPACE_PACKAGES) {
  addNote(`Workspace package limit reached ${MAX_WORKSPACE_PACKAGES}; additional packages were ignored.`);
}

const packages = [
  analyzePackage(root, rootInspection),
  ...workspacePaths.map((packagePath) => {
    const directory = path.join(root, ...packagePath.split('/'));
    return analyzePackage(directory, inspectPackage(directory, packagePath));
  }),
].sort((left, right) => left.path === '.' ? -1 : right.path === '.' ? 1 : left.path.localeCompare(right.path));

const uniqueSorted = (values) => [...new Set(values)].sort();
const frameworks = uniqueSorted(packages.flatMap((entry) => entry.frameworks));
const testFrameworks = uniqueSorted(packages.flatMap((entry) => entry.testFrameworks));
const browserTools = uniqueSorted(packages.flatMap((entry) => entry.browserTools));
const scriptsByPackage = Object.fromEntries(packages.map((entry) => [entry.path, entry.scripts]));

function normalizePackageManager(value) {
  if (typeof value !== 'string') return null;
  return value.match(/^(npm|pnpm|yarn|bun)(?:@|$)/i)?.[1]?.toLowerCase() || null;
}

let packageManager = 'unknown';
for (const [name, manager] of [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
]) {
  if (safeFileExists(root, name)) {
    packageManager = manager;
    break;
  }
}
if (packageManager === 'unknown' && pnpmWorkspace.present && pnpmWorkspace.patterns.length > 0) packageManager = 'pnpm';
if (packageManager === 'unknown') packageManager = normalizePackageManager(rootPkg?.packageManager) || 'unknown';

const ciCandidates = [
  ['.github/workflows', 'directory'],
  ['.gitlab-ci.yml', 'file'],
  ['circle.yml', 'file'],
  ['.circleci/config.yml', 'file'],
  ['azure-pipelines.yml', 'file'],
  ['Jenkinsfile', 'file'],
];
const ciFiles = ciCandidates.filter(([name, type]) => {
  const target = path.join(root, ...name.split('/'));
  return type === 'directory' ? safeDirectoryExists(target, name) : safeFileExists(root, name);
}).map(([name]) => name);

const rootReport = packages.find((entry) => entry.path === '.');
if (rootReport.packageJsonStatus === 'missing') addNote('No package.json found at repository root; detection is limited.');
if (frameworks.length === 0) addNote('No common web framework dependency detected.');
if (testFrameworks.length === 0) addNote('No common JS test framework dependency detected.');

console.log(JSON.stringify({
  repo: inputRoot,
  packageManager,
  hasPackageJson: rootReport.hasPackageJson,
  packageJsonStatus: rootReport.packageJsonStatus,
  scripts: rootReport.scripts,
  scriptsByPackage,
  packages,
  workspace: {
    detected: workspaceSources.length > 0,
    sources: [...new Set(workspaceSources)].sort(),
    patterns,
    packageCount: Math.max(0, packages.length - 1),
  },
  frameworks,
  testFrameworks,
  browserTools,
  ciFiles,
  confidenceNotes,
}, null, 2));
