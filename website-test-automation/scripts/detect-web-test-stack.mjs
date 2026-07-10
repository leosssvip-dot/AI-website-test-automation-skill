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
const MAX_WORKSPACE_ENTRIES = 50_000;
const MAX_WORKSPACE_MATCH_CHECKS = 500_000;
const MAX_WORKSPACE_PATTERNS = 128;
const MAX_WORKSPACE_PATTERN_BYTES = 16 * 1024;
const MAX_WORKSPACE_PATTERN_LENGTH = 256;
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
  return { status: 'regular', content: Buffer.concat(chunks, total).toString('utf8') };
}

function readRegularTextFile(target, label, maxBytes) {
  const inspection = inspectRegularFile(target, label, maxBytes);
  if (inspection.status !== 'regular') return inspection;

  let fd;
  try {
    const noFollow = fs.constants.O_NOFOLLOW || 0;
    fd = fs.openSync(target, fs.constants.O_RDONLY | noFollow);
    const openedStats = fs.fstatSync(fd);
    const sameInspectedFile = openedStats.dev === inspection.stats.dev && openedStats.ino === inspection.stats.ino;
    if (!openedStats.isFile() || !sameInspectedFile) {
      addNote(`File changed during inspection: ${label}`);
      return { status: 'non-regular', exists: true };
    }
    if (openedStats.size > maxBytes) {
      addNote(`Oversized file skipped: ${label}`);
      return { status: 'oversized', exists: true };
    }

    const currentStats = fs.lstatSync(target);
    const sameCurrentFile = currentStats.isFile() && !currentStats.isSymbolicLink() &&
      currentStats.dev === openedStats.dev && currentStats.ino === openedStats.ino;
    const currentRealPath = fs.realpathSync(target);
    if (!sameCurrentFile || !isContained(currentRealPath)) {
      addNote(`File changed during inspection: ${label}`);
      return { status: 'symlink-rejected', exists: true };
    }

    const readResult = readBoundedUtf8(fd, maxBytes);
    if (readResult.status === 'oversized') {
      addNote(`Oversized file skipped: ${label}`);
      return { status: 'oversized', exists: true };
    }
    return { ...inspection, content: readResult.content };
  } catch (error) {
    if (error.code === 'ELOOP') {
      addNote(`Skipped symlink: ${label}`);
      return { status: 'symlink-rejected', exists: true };
    }
    addNote(`Unreadable ${label}: ${error.code || error.message}`);
    return { status: 'non-regular', exists: true };
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
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
  const inspection = readRegularTextFile(packageFile, label, MAX_PACKAGE_BYTES);
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
    return { report: { ...base, packageJsonStatus: 'oversized' }, pkg: null };
  }

  let pkg;
  try {
    pkg = JSON.parse(inspection.content);
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

let workspacePatternFailure = null;
let workspacePatternCount = 0;
let workspacePatternBytes = 0;

function rejectWorkspacePattern(source, value, status = 'unsupported-patterns') {
  workspacePatternFailure ||= status;
  addNote(`Unsupported workspace pattern from ${source}: ${String(value).slice(0, MAX_WORKSPACE_PATTERN_LENGTH)}`);
  return null;
}

function normalizeWorkspacePattern(value, source) {
  workspacePatternCount += 1;
  if (workspacePatternCount > MAX_WORKSPACE_PATTERNS) {
    workspacePatternFailure = 'pattern-budget-exceeded';
    addNote(`Workspace pattern limit exceeded ${MAX_WORKSPACE_PATTERNS}; workspace discovery was disabled.`);
    return null;
  }
  if (typeof value !== 'string') return rejectWorkspacePattern(source, value);

  let pattern = value.trim();
  if ((pattern.startsWith('"') && pattern.endsWith('"')) || (pattern.startsWith("'") && pattern.endsWith("'"))) {
    pattern = pattern.slice(1, -1).trim();
  }
  const negated = pattern.startsWith('!');
  if (negated) pattern = pattern.slice(1).trim();
  pattern = pattern.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
  const byteLength = Buffer.byteLength(pattern);
  workspacePatternBytes += byteLength;
  if (byteLength > MAX_WORKSPACE_PATTERN_LENGTH || workspacePatternBytes > MAX_WORKSPACE_PATTERN_BYTES) {
    workspacePatternFailure = 'pattern-budget-exceeded';
    addNote(`Workspace pattern byte budget exceeded; workspace discovery was disabled.`);
    return null;
  }
  if (!pattern || path.posix.isAbsolute(pattern) || pattern.split('/').includes('..') || /[?{}()[\]\0]/.test(pattern) || pattern.includes('***')) {
    return rejectWorkspacePattern(source, `${negated ? '!' : ''}${pattern}`);
  }
  return { pattern, negated, display: `${negated ? '!' : ''}${pattern}` };
}

function readPnpmWorkspacePatterns() {
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml');
  const inspection = readRegularTextFile(workspaceFile, 'pnpm-workspace.yaml', MAX_PACKAGE_BYTES);
  if (inspection.status !== 'regular') return { present: false, patterns: [] };
  const lines = inspection.content.split(/\r?\n/);
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

function compileWorkspaceMatcher(pattern) {
  const patternSegments = pattern.split('/');
  const segmentMatchers = patternSegments.map((segment) => {
    if (segment === '**') return null;
    const source = segment.split('*')
      .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, '\\$&'))
      .join('[^/]*');
    return new RegExp(`^${source}$`);
  });
  return (candidate) => {
    const candidateSegments = candidate.split('/').filter(Boolean);
    const memo = new Map();
    const matches = (patternIndex, candidateIndex) => {
      const key = `${patternIndex}:${candidateIndex}`;
      if (memo.has(key)) return memo.get(key);
      let result;
      if (patternIndex === patternSegments.length) {
        result = candidateIndex === candidateSegments.length;
      } else if (patternSegments[patternIndex] === '**') {
        result = matches(patternIndex + 1, candidateIndex) ||
          (candidateIndex < candidateSegments.length && matches(patternIndex, candidateIndex + 1));
      } else {
        result = candidateIndex < candidateSegments.length &&
          segmentMatchers[patternIndex].test(candidateSegments[candidateIndex]) &&
          matches(patternIndex + 1, candidateIndex + 1);
      }
      memo.set(key, result);
      return result;
    };
    return matches(0, 0);
  };
}

let workspaceScanTruncated = false;

function discoverWorkspaceDirectories(patternDeclarations) {
  const includeMatchers = patternDeclarations.filter((entry) => !entry.negated).map((entry) => compileWorkspaceMatcher(entry.pattern));
  const excludeMatchers = patternDeclarations.filter((entry) => entry.negated).map((entry) => compileWorkspaceMatcher(entry.pattern));
  if (includeMatchers.length === 0) return [];
  const matches = new Set();
  let visitedDirectories = 0;
  let visitedEntries = 0;
  let matcherChecks = 0;
  let stopped = false;

  function matchesAny(matchers, candidate) {
    for (const matcher of matchers) {
      matcherChecks += 1;
      if (matcherChecks > MAX_WORKSPACE_MATCH_CHECKS) {
        addNote(`Workspace pattern matching exceeded ${MAX_WORKSPACE_MATCH_CHECKS} checks; remaining directories were ignored.`);
        workspaceScanTruncated = true;
        stopped = true;
        return false;
      }
      if (matcher(candidate)) return true;
    }
    return false;
  }

  function readDirectory(directory) {
    let handle;
    const entries = [];
    try {
      const stats = fs.lstatSync(directory);
      const real = fs.realpathSync(directory);
      if (stats.isSymbolicLink() || !stats.isDirectory() || !isContained(real)) {
        addNote(`Skipped unsafe workspace directory: ${rel(directory)}`);
        return entries;
      }
      handle = fs.opendirSync(directory);
      while (!stopped) {
        const entry = handle.readSync();
        if (!entry) break;
        visitedEntries += 1;
        if (visitedEntries > MAX_WORKSPACE_ENTRIES) {
          addNote(`Workspace entry scan exceeded ${MAX_WORKSPACE_ENTRIES}; remaining entries were ignored.`);
          workspaceScanTruncated = true;
          stopped = true;
          break;
        }
        entries.push(entry);
      }
    } catch (error) {
      addNote(`Unreadable workspace directory: ${rel(directory)} (${error.code || error.message})`);
      workspaceScanTruncated = true;
    } finally {
      if (handle) {
        try {
          handle.closeSync();
        } catch {
          // The scan result is already bounded; a close race must not hide it.
        }
      }
    }
    return entries.sort((left, right) => left.name.localeCompare(right.name));
  }

  function walk(directory) {
    if (stopped) return;
    const entries = readDirectory(directory);
    for (const entry of entries) {
      if (stopped || ignoredDirectories.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      const relative = rel(full);
      let stats;
      try {
        stats = fs.lstatSync(full);
      } catch (error) {
        addNote(`Unreadable workspace path: ${relative} (${error.code || error.message})`);
        continue;
      }
      if (stats.isSymbolicLink()) {
        addNote(`Skipped workspace scan symlink: ${relative}`);
        continue;
      }
      if (!stats.isDirectory()) continue;
      let real;
      try {
        real = fs.realpathSync(full);
      } catch (error) {
        addNote(`Unreadable workspace directory: ${relative} (${error.code || error.message})`);
        continue;
      }
      if (!isContained(real)) {
        addNote(`Skipped workspace directory outside repository root: ${relative}`);
        continue;
      }
      visitedDirectories += 1;
      if (visitedDirectories > MAX_WORKSPACE_DIRECTORIES) {
        addNote(`Workspace directory scan exceeded ${MAX_WORKSPACE_DIRECTORIES}; remaining directories were ignored.`);
        workspaceScanTruncated = true;
        stopped = true;
        return;
      }
      const included = matchesAny(includeMatchers, relative);
      const excluded = !stopped && matchesAny(excludeMatchers, relative);
      if (included && !excluded) {
        const packageInspection = inspectRegularFile(path.join(full, 'package.json'), `${relative}/package.json`, MAX_PACKAGE_BYTES);
        if (packageInspection.exists && !matches.has(relative)) {
          if (matches.size >= MAX_WORKSPACE_PACKAGES) {
            addNote(`Workspace package limit reached ${MAX_WORKSPACE_PACKAGES}; additional packages were ignored.`);
            workspaceScanTruncated = true;
            stopped = true;
            return;
          }
          matches.add(relative);
        }
      }
      walk(full);
    }
  }

  walk(root);
  return [...matches].sort();
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
const patternDeclarations = [...new Map(workspacePatterns.map((entry) => [entry.display, entry])).values()]
  .sort((left, right) => left.display.localeCompare(right.display));
const patterns = patternDeclarations.map((entry) => entry.display);
const workspacePaths = workspacePatternFailure ? [] : discoverWorkspaceDirectories(patternDeclarations);

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
if (packageManager === 'unknown' && pnpmWorkspace.present) packageManager = 'pnpm';
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
    discoveryStatus: workspaceSources.length === 0
      ? 'not-declared'
      : workspacePatternFailure || (workspaceScanTruncated ? 'truncated' : 'complete'),
  },
  frameworks,
  testFrameworks,
  browserTools,
  ciFiles,
  confidenceNotes,
}, null, 2));
