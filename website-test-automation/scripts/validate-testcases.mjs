#!/usr/bin/env node
import path from 'node:path';
import { parseCaseCliArguments } from './lib/cli-options.mjs';
import { validateCase } from './lib/testcase-schema.mjs';
import { collectCaseFiles, createCaseLoadBudget, loadCases } from './lib/yaml-testcases.mjs';

function usage() {
  console.log(
    'Usage: validate-testcases.mjs <file-or-dir> [more files...] [--format json|md]\n' +
      'Validates generated test-case YAML/JSON against references/testcase-schema.md.\n' +
      'Accepts a single mapping, a sequence of cases, multi-document YAML, or JSON.\n' +
      'YAML subset: no block scalars (`|`, `>`), anchors, or trailing comments.\n' +
      'Exit code 1 when any case has a schema error, 2 on usage/path errors.',
  );
}

const parsedArgs = parseCaseCliArguments(process.argv.slice(2), {
  formats: ['json', 'md'],
  defaultFormat: 'json',
});

if (parsedArgs.help) {
  usage();
  process.exit(0);
}
if (!parsedArgs.ok || parsedArgs.inputs.length === 0) {
  usage();
  process.exit(2);
}
const { format, inputs: inputArgs } = parsedArgs;

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
const loadBudget = createCaseLoadBudget();

if (files.length === 0) allErrors.push('no test case files found');

for (const file of files) {
  const relFile = path.relative(process.cwd(), file);
  let cases;
  try {
    cases = loadCases(file, loadBudget);
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
    const id = testCase && typeof testCase === 'object' && typeof testCase.id === 'string' ? testCase.id : '';
    const label = `${relFile}#${index}${id ? ` (${id})` : ''}`;
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
