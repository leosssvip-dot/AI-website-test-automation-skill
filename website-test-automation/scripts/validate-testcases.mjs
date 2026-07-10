#!/usr/bin/env node
import path from 'node:path';
import { validateCase } from './lib/testcase-schema.mjs';
import { collectCaseFiles, loadCases } from './lib/yaml-testcases.mjs';

function usage() {
  console.log(
    'Usage: validate-testcases.mjs <file-or-dir> [more files...] [--format json|md]\n' +
      'Validates generated test-case YAML/JSON against references/testcase-schema.md.\n' +
      'Accepts a single mapping, a sequence of cases, multi-document YAML, or JSON.\n' +
      'YAML subset: no block scalars (`|`, `>`), anchors, or trailing comments.\n' +
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

let files;
try {
  files = collectCaseFiles(inputArgs);
} catch (error) {
  console.error(error.message);
  process.exit(2);
}

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
