export const ENUMS = Object.freeze({
  priority: Object.freeze(['P0', 'P1', 'P2', 'P3']),
  type: Object.freeze([
    'e2e',
    'api',
    'component',
    'visual',
    'accessibility',
    'performance',
    'security-smoke',
    'manual',
    'exploratory',
  ]),
  source_status: Object.freeze(['documented', 'inferred', 'observed', 'mismatch']),
  'automation.target': Object.freeze([
    'durable-regression',
    'browser-agent-smoke',
    'exploratory',
    'manual',
    'api-or-component',
    'not-automated-risk-note',
  ]),
});

export const CORE_FIELDS = Object.freeze([
  'id',
  'title',
  'source',
  'source_status',
  'type',
  'priority',
  'steps',
  'expected',
  'automation',
]);

export const SCHEMA_FIELDS = Object.freeze([
  'id',
  'title',
  'source',
  'source_status',
  'mismatch',
  'human_expectation',
  'why_unreasonable',
  'logic_risk',
  'suggested_product_fix',
  'type',
  'priority',
  'risk',
  'persona',
  'preconditions',
  'steps',
  'expected',
  'negative_cases',
  'data_needs',
  'automation',
  'evidence',
  'assumptions',
  'unknowns',
]);

const STRING_FIELDS = [
  'id',
  'title',
  'source_status',
  'type',
  'priority',
  'mismatch',
  'human_expectation',
  'why_unreasonable',
  'suggested_product_fix',
  'risk',
  'persona',
];
const STRING_ARRAY_FIELDS = [
  'preconditions',
  'steps',
  'expected',
  'negative_cases',
  'data_needs',
  'assumptions',
  'unknowns',
];
const SOURCE_FIELDS = ['docs', 'code', 'observed'];

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isStringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string');
const hasNonEmptyText = (value) => typeof value === 'string' && value.trim() !== '';
const hasNonEmptyTextEntry = (value) => isStringArray(value) && value.some(hasNonEmptyText);

export function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateOwnType(errors, object, field, predicate, expected) {
  if (hasOwn(object, field) && !predicate(object[field])) errors.push(`${field} must be ${expected}`);
}

function hasSourceEvidence(testCase) {
  if (!isPlainObject(testCase.source)) return false;
  return SOURCE_FIELDS.some((field) => hasOwn(testCase.source, field) && hasNonEmptyTextEntry(testCase.source[field]));
}

export function validateCase(testCase) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(testCase)) {
    return { errors: ['test case must be a plain object'], warnings };
  }

  for (const field of CORE_FIELDS) {
    if (!hasOwn(testCase, field) || testCase[field] === null || testCase[field] === '') {
      errors.push(`missing required field: ${field}`);
    }
  }

  for (const field of STRING_FIELDS) validateOwnType(errors, testCase, field, (value) => typeof value === 'string', 'a string');
  for (const field of STRING_ARRAY_FIELDS) {
    validateOwnType(errors, testCase, field, isStringArray, 'an array of strings');
  }
  validateOwnType(errors, testCase, 'logic_risk', (value) => typeof value === 'boolean', 'a boolean');
  validateOwnType(errors, testCase, 'source', isPlainObject, 'a plain object');
  validateOwnType(errors, testCase, 'automation', isPlainObject, 'a plain object');
  validateOwnType(errors, testCase, 'evidence', isPlainObject, 'a plain object');

  if (isPlainObject(testCase.source)) {
    for (const field of SOURCE_FIELDS) {
      if (!hasOwn(testCase.source, field)) errors.push(`missing required field: source.${field}`);
      else if (!isStringArray(testCase.source[field])) errors.push(`source.${field} must be an array of strings`);
    }
  }

  if (isPlainObject(testCase.automation)) {
    if (hasOwn(testCase.automation, 'recommended') && typeof testCase.automation.recommended !== 'boolean') {
      errors.push('automation.recommended must be a boolean');
    }
    if (hasOwn(testCase.automation, 'preferred_tools') && !isStringArray(testCase.automation.preferred_tools)) {
      errors.push('automation.preferred_tools must be an array of strings');
    }
  }

  if (isPlainObject(testCase.evidence) && hasOwn(testCase.evidence, 'required') && !isStringArray(testCase.evidence.required)) {
    errors.push('evidence.required must be an array of strings');
  }

  for (const field of ['priority', 'type', 'source_status']) {
    if (hasOwn(testCase, field) && !ENUMS[field].includes(testCase[field])) {
      errors.push(`invalid ${field}: "${testCase[field]}" (allowed: ${ENUMS[field].join(', ')})`);
    }
  }
  if (
    isPlainObject(testCase.automation) &&
    hasOwn(testCase.automation, 'target') &&
    !ENUMS['automation.target'].includes(testCase.automation.target)
  ) {
    errors.push(
      `invalid automation.target: "${testCase.automation.target}" (allowed: ${ENUMS['automation.target'].join(', ')})`,
    );
  }

  const priority = hasOwn(testCase, 'priority') ? testCase.priority : undefined;
  if (
    (priority === 'P0' || priority === 'P1') &&
    !hasSourceEvidence(testCase) &&
    !(hasOwn(testCase, 'unknowns') && hasNonEmptyTextEntry(testCase.unknowns))
  ) {
    errors.push(`${priority} case needs at least one source evidence entry or an explicit unknowns entry`);
  }

  const missingSchema = SCHEMA_FIELDS.filter((field) => !hasOwn(testCase, field));
  if (missingSchema.length) warnings.push(`missing schema field(s): ${missingSchema.join(', ')}`);

  if (testCase.source_status === 'mismatch') {
    if (!testCase.mismatch) warnings.push('source_status is mismatch but mismatch field is empty');
    if (isPlainObject(testCase.automation) && testCase.automation.target === 'durable-regression') {
      warnings.push('mismatch case recommends durable-regression; keep it manual/exploratory until the expectation is decided');
    }
  }

  if (
    Array.isArray(testCase.expected) &&
    testCase.expected.length === 1 &&
    /^(it\s+)?works?\.?$/i.test(String(testCase.expected[0]).trim())
  ) {
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

  if (
    isPlainObject(testCase.automation) &&
    testCase.automation.recommended === true &&
    !hasNonEmptyTextEntry(testCase.data_needs) &&
    !hasNonEmptyTextEntry(testCase.preconditions)
  ) {
    warnings.push('automation is recommended but no data_needs or preconditions are declared');
  }

  if (typeof testCase.id === 'string' && testCase.id !== '' && !/^TC-[A-Z0-9]+-\d+$/.test(testCase.id)) {
    warnings.push(`id "${testCase.id}" does not match TC-AREA-001 convention`);
  }

  return { errors, warnings };
}
