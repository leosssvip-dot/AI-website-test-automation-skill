#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { validateCase } from './lib/testcase-schema.mjs';
import { collectCaseFiles, loadCases } from './lib/yaml-testcases.mjs';

function usage() {
  console.log(
    'Usage: export-testcases.mjs <file-or-dir> [more files...] [--format csv|md] [--out <path>]\n' +
      'Converts schema test cases (references/testcase-schema.md) for handoff:\n' +
      '  csv  test-management import columns (TestRail/Xray/ZenTao-style)\n' +
      '  md   Markdown review table\n' +
      'Writes to stdout, or to --out <path>. Exit 2 on usage/path errors (including an unwritable --out),\n' +
      '1 when no cases are found or any input fails parsing/schema validation.',
  );
}

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  usage();
  process.exit(0);
}

const formatFlag = process.argv.find((arg) => arg.startsWith('--format='));
const formatArgIndex = process.argv.indexOf('--format');
const format = formatFlag ? formatFlag.split('=')[1] : formatArgIndex !== -1 ? process.argv[formatArgIndex + 1] : 'csv';
const outFlag = process.argv.find((arg) => arg.startsWith('--out='));
const outArgIndex = process.argv.indexOf('--out');
const outPath = outFlag ? outFlag.split('=')[1] : outArgIndex !== -1 ? process.argv[outArgIndex + 1] : null;

const inputArgs = process.argv.slice(2).filter((arg, i, all) => {
  if (arg.startsWith('--')) return false;
  if (all[i - 1] === '--format' || all[i - 1] === '--out') return false;
  return true;
});

if (inputArgs.length === 0 || !['csv', 'md'].includes(format)) {
  usage();
  process.exit(2);
}

let files;
try {
  files = collectCaseFiles(inputArgs);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

function canonicalPathForComparison(target) {
  const resolved = path.resolve(target);
  try {
    return fs.realpathSync(resolved);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    try {
      return path.join(fs.realpathSync(path.dirname(resolved)), path.basename(resolved));
    } catch {
      return resolved;
    }
  }
}

if (outPath) {
  let canonicalOut;
  try {
    canonicalOut = canonicalPathForComparison(outPath);
  } catch (error) {
    console.error(`Cannot inspect output path: ${error.message}`);
    process.exit(2);
  }
  const sameInput = files.find((file) => fs.realpathSync(file) === canonicalOut);
  if (sameInput) {
    console.error(`Output path resolves to an input file: ${path.resolve(outPath)}`);
    process.exit(2);
  }
}

const cases = [];
const parseErrors = [];
const schemaErrors = [];
for (const file of files) {
  const relFile = path.relative(process.cwd(), file);
  try {
    const loaded = loadCases(file);
    if (loaded.length === 0) {
      schemaErrors.push(`${relFile}: no test cases found`);
      continue;
    }
    loaded.forEach((testCase, index) => {
      const { errors } = validateCase(testCase);
      const id = testCase && typeof testCase === 'object' && typeof testCase.id === 'string' ? ` (${testCase.id})` : '';
      for (const error of errors) schemaErrors.push(`${relFile}#${index}${id}: ${error}`);
    });
    cases.push(...loaded);
  } catch (error) {
    parseErrors.push(`${relFile}: ${error.message}`);
  }
}

if (parseErrors.length) {
  console.error(parseErrors.map((message) => `parse error: ${message}`).join('\n'));
}
if (schemaErrors.length) {
  console.error(schemaErrors.map((message) => `schema error: ${message}`).join('\n'));
}
if (parseErrors.length || schemaErrors.length) process.exit(1);
if (cases.length === 0) {
  console.error('No test cases found.');
  process.exit(1);
}

const asList = (value) =>
  Array.isArray(value)
    ? value.filter((item) => item !== null && item !== undefined && item !== '')
    : value === null || value === undefined || value === ''
      ? []
      : [value];
const text = (value) => (value === null || value === undefined ? '' : String(value));
const joinLines = (value) => asList(value).map(text).join('\n');
const numbered = (value) => asList(value).map((item, index) => `${index + 1}. ${text(item)}`).join('\n');

function flattenCase(testCase) {
  const source = testCase.source && typeof testCase.source === 'object' ? testCase.source : {};
  const automation = testCase.automation && typeof testCase.automation === 'object' ? testCase.automation : {};
  const evidence = testCase.evidence && typeof testCase.evidence === 'object' ? testCase.evidence : {};
  return {
    'ID': text(testCase.id),
    'Title': text(testCase.title),
    'Priority': text(testCase.priority),
    'Type': text(testCase.type),
    'Risk': text(testCase.risk),
    'Persona': text(testCase.persona),
    'Source Status': text(testCase.source_status),
    'Preconditions': joinLines(testCase.preconditions),
    'Steps': numbered(testCase.steps),
    'Expected Results': joinLines(testCase.expected),
    'Negative Cases': joinLines(testCase.negative_cases),
    'Data Needs': joinLines(testCase.data_needs),
    'Automation Recommended': automation.recommended === true ? 'yes' : automation.recommended === false ? 'no' : '',
    'Automation Target': text(automation.target),
    'Source Evidence': [...asList(source.docs), ...asList(source.code), ...asList(source.observed)].map(text).join('\n'),
    'Evidence Required': joinLines(evidence.required),
    'Mismatch': text(testCase.mismatch),
    'Human Expectation': text(testCase.human_expectation),
    'Assumptions': joinLines(testCase.assumptions),
    'Unknowns': joinLines(testCase.unknowns),
  };
}

const rows = cases.map(flattenCase);
const columns = Object.keys(rows[0]);

function toCsv() {
  // Defensive prefix against spreadsheet formula injection (OWASP CSV injection):
  // cell values starting with =, +, -, @, tab, or CR get a leading single quote.
  const guard = (value) => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);
  const escape = (value) => `"${guard(String(value)).replaceAll('"', '""')}"`;
  const lines = [columns.map(escape).join(',')];
  for (const row of rows) lines.push(columns.map((column) => escape(row[column])).join(','));
  return lines.join('\n');
}

function toMarkdown() {
  const MD_COLUMNS = ['ID', 'Title', 'Priority', 'Type', 'Source Status', 'Automation Target', 'Steps', 'Expected Results'];
  const cell = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>') || ' ';
  const lines = [
    `| ${MD_COLUMNS.join(' | ')} |`,
    `| ${MD_COLUMNS.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) lines.push(`| ${MD_COLUMNS.map((column) => cell(row[column])).join(' | ')} |`);
  return lines.join('\n');
}

const output = format === 'md' ? toMarkdown() : toCsv();

if (outPath) {
  const resolvedOut = path.resolve(outPath);
  const temporaryOut = path.join(
    path.dirname(resolvedOut),
    `.${path.basename(resolvedOut)}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    fs.writeFileSync(temporaryOut, `${output}\n`, { flag: 'wx' });
    fs.renameSync(temporaryOut, resolvedOut);
  } catch (error) {
    try {
      fs.unlinkSync(temporaryOut);
    } catch (cleanupError) {
      if (cleanupError.code !== 'ENOENT') {
        console.error(`Cannot clean temporary output file: ${cleanupError.message}`);
      }
    }
    console.error(`Cannot write output file: ${error.message}`);
    process.exit(2);
  }
  console.log(`Exported ${rows.length} case(s) from ${files.length} file(s) to ${resolvedOut} (${format}).`);
} else {
  console.log(output);
}
