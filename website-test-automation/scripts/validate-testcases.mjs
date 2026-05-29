#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.log(
    'Usage: validate-testcases.mjs <file-or-dir> [more files...] [--format json|md]\n' +
      'Validates generated test-case YAML/JSON against references/testcase-schema.md.\n' +
      'Accepts a single mapping, a sequence of cases, multi-document YAML, or JSON.\n' +
      'Exit code 1 when any case has a schema error, 2 on usage/path errors.',
  );
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const formatFlag = process.argv.find((arg) => arg.startsWith('--format='));
const formatArgIndex = process.argv.indexOf('--format');
const format = formatFlag ? formatFlag.split('=')[1] : formatArgIndex !== -1 ? process.argv[formatArgIndex + 1] : 'json';

const inputArgs = process.argv.slice(2).filter((arg, i, all) => {
  if (arg.startsWith('--')) return false;
  if (all[i - 1] === '--format') return false;
  return true;
});

if (inputArgs.length === 0) {
  usage();
  process.exit(2);
}

const ENUMS = {
  priority: ['P0', 'P1', 'P2', 'P3'],
  type: ['e2e', 'api', 'component', 'visual', 'accessibility', 'performance', 'security-smoke', 'manual', 'exploratory'],
  source_status: ['documented', 'inferred', 'observed', 'mismatch'],
  'automation.target': ['durable-regression', 'browser-agent-smoke', 'exploratory', 'manual', 'api-or-component', 'not-automated-risk-note'],
};
const CORE_FIELDS = ['id', 'title', 'source', 'source_status', 'type', 'priority', 'steps', 'expected', 'automation'];
const SCHEMA_FIELDS = [
  'id', 'title', 'source', 'source_status', 'mismatch', 'human_expectation', 'why_unreasonable', 'logic_risk',
  'suggested_product_fix', 'type', 'priority', 'risk', 'persona', 'preconditions', 'steps', 'expected',
  'negative_cases', 'data_needs', 'automation', 'evidence', 'assumptions', 'unknowns',
];

// --- Minimal YAML-subset parser (zero-dependency) -------------------------
// Handles the fixed test-case shape: 2-level mappings, block/flow sequences,
// quoted/plain scalars, booleans, numbers, and `---` multi-document files.
function indentOf(line) {
  return line.match(/^(\s*)/)[1].replace(/\t/g, '  ').length;
}

function parseScalar(raw) {
  const value = raw.trim();
  if (value === '' || value === '~' || value === 'null') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value.startsWith('[')) return parseFlowSeq(value);
  if (value.startsWith('{')) return parseFlowMap(value);
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

function parseDocument(text) {
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

function loadCases(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  return parseDocument(text);
}

// --- Validation -----------------------------------------------------------
function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasSourceEvidence(testCase) {
  const source = testCase.source;
  if (!source || typeof source !== 'object') return false;
  return isNonEmptyArray(source.docs) || isNonEmptyArray(source.code) || isNonEmptyArray(source.observed);
}

function validateCase(testCase) {
  const errors = [];
  const warnings = [];

  for (const field of CORE_FIELDS) {
    if (!(field in testCase) || testCase[field] === null || testCase[field] === '') {
      errors.push(`missing required field: ${field}`);
    }
  }

  for (const [field, allowed] of Object.entries(ENUMS)) {
    const value = field.includes('.')
      ? field.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), testCase)
      : testCase[field];
    if (value !== undefined && value !== null && value !== '' && !allowed.includes(value)) {
      errors.push(`invalid ${field}: "${value}" (allowed: ${allowed.join(', ')})`);
    }
  }

  const priority = testCase.priority;
  if ((priority === 'P0' || priority === 'P1') && !hasSourceEvidence(testCase) && !isNonEmptyArray(testCase.unknowns)) {
    errors.push(`${priority} case needs at least one source evidence entry or an explicit unknowns entry`);
  }

  const missingSchema = SCHEMA_FIELDS.filter((field) => !(field in testCase));
  if (missingSchema.length) warnings.push(`missing schema field(s): ${missingSchema.join(', ')}`);

  if (testCase.source_status === 'mismatch') {
    if (!testCase.mismatch) warnings.push('source_status is mismatch but mismatch field is empty');
    if (testCase.automation && testCase.automation.target === 'durable-regression') {
      warnings.push('mismatch case recommends durable-regression; keep it manual/exploratory until the expectation is decided');
    }
  }

  if (Array.isArray(testCase.expected) && testCase.expected.length === 1 && /^(it\s+)?works?\.?$/i.test(String(testCase.expected[0]).trim())) {
    warnings.push('expected result is too vague ("works"); state a deterministic outcome');
  }
  if (Array.isArray(testCase.steps) && testCase.steps.length === 0) {
    warnings.push('steps is empty; add executable steps');
  }
  if (Array.isArray(testCase.expected) && testCase.expected.length === 0) {
    warnings.push('expected is empty; add a deterministic expected result');
  }

  if (testCase.logic_risk === true && !testCase.why_unreasonable) {
    warnings.push('logic_risk is true but why_unreasonable is empty');
  }

  if (testCase.automation && testCase.automation.recommended === true && !isNonEmptyArray(testCase.data_needs) && !isNonEmptyArray(testCase.preconditions)) {
    warnings.push('automation is recommended but no data_needs or preconditions are declared');
  }

  if (typeof testCase.id === 'string' && testCase.id !== '' && !/^TC-[A-Z0-9]+-\d+$/.test(testCase.id)) {
    warnings.push(`id "${testCase.id}" does not match TC-AREA-001 convention`);
  }

  return { errors, warnings };
}

// --- File collection ------------------------------------------------------
const VALID_EXT = /\.(ya?ml|json)$/i;
const ignored = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);

function collect(target) {
  const resolved = path.resolve(target);
  if (!fs.existsSync(resolved)) {
    console.error(`Path not found: ${resolved}`);
    process.exit(2);
  }
  const stat = fs.statSync(resolved);
  if (stat.isFile()) return [resolved];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (VALID_EXT.test(entry.name)) out.push(full);
    }
  };
  walk(resolved);
  return out;
}

const files = [...new Set(inputArgs.flatMap(collect))];
const fileReports = [];
const allErrors = [];
const allWarnings = [];
let totalCases = 0;

for (const file of files) {
  const relFile = path.relative(process.cwd(), file);
  let cases;
  try {
    cases = loadCases(file);
  } catch (error) {
    const message = `parse error: ${error.message}`;
    fileReports.push({ file: relFile, cases: 0, errors: [message], warnings: [] });
    allErrors.push(`${relFile}: ${message}`);
    continue;
  }
  if (cases.length === 0) {
    const message = 'no test cases found';
    fileReports.push({ file: relFile, cases: 0, errors: [message], warnings: [] });
    allErrors.push(`${relFile}: ${message}`);
    continue;
  }
  const fileErrors = [];
  const fileWarnings = [];
  cases.forEach((testCase, index) => {
    totalCases += 1;
    const label = `${relFile}#${index}${testCase.id ? ` (${testCase.id})` : ''}`;
    const { errors, warnings } = validateCase(testCase);
    for (const error of errors) {
      fileErrors.push(`${label}: ${error}`);
      allErrors.push(`${label}: ${error}`);
    }
    for (const warning of warnings) {
      fileWarnings.push(`${label}: ${warning}`);
      allWarnings.push(`${label}: ${warning}`);
    }
  });
  fileReports.push({ file: relFile, cases: cases.length, errors: fileErrors, warnings: fileWarnings });
}

const summary = {
  files: fileReports,
  totalFiles: files.length,
  totalCases,
  errorCount: allErrors.length,
  warningCount: allWarnings.length,
  ok: allErrors.length === 0,
  errors: allErrors,
  warnings: allWarnings,
};

if (format === 'md') {
  console.log(`## Test Case Validation

- Files: ${summary.totalFiles}
- Cases: ${summary.totalCases}
- Errors: ${summary.errorCount}
- Warnings: ${summary.warningCount}
- Result: ${summary.ok ? 'pass' : 'fail'}
${summary.errors.map((error) => `- error: ${error}`).join('\n')}
${summary.warnings.map((warning) => `- warning: ${warning}`).join('\n')}`.trim());
} else {
  console.log(JSON.stringify(summary, null, 2));
}

process.exit(summary.ok ? 0 : 1);
