#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { collectCaseFiles, loadCases } from './lib/yaml-testcases.mjs';

function usage() {
  console.log(
    'Usage: export-testcases.mjs <file-or-dir> [more files...] [--format csv|md] [--out <path>]\n' +
      'Converts schema test cases (references/testcase-schema.md) for handoff:\n' +
      '  csv  test-management import columns (TestRail/Xray/ZenTao-style)\n' +
      '  md   Markdown review table\n' +
      'Writes to stdout, or to --out <path>. Exit 2 on usage/path errors (including an unwritable --out),\n' +
      '1 when no cases are found or an input file fails to parse.',
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

const cases = [];
const parseErrors = [];
for (const file of files) {
  try {
    cases.push(...loadCases(file).filter((value) => value && typeof value === 'object'));
  } catch (error) {
    parseErrors.push(`${path.relative(process.cwd(), file)}: ${error.message}`);
  }
}

if (parseErrors.length) {
  console.error(parseErrors.map((message) => `parse error: ${message}`).join('\n'));
  process.exitCode = 1;
}
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
  try {
    fs.writeFileSync(resolvedOut, `${output}\n`);
  } catch (error) {
    console.error(`Cannot write output file: ${error.message}`);
    process.exit(2);
  }
  console.log(`Exported ${rows.length} case(s) from ${files.length - parseErrors.length} file(s) to ${resolvedOut} (${format}).`);
} else {
  console.log(output);
}
