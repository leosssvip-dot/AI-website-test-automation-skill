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
  surface: Object.freeze(['web', 'api', 'job', 'cli', 'library']),
  layer: Object.freeze([
    'unit',
    'component',
    'api',
    'route',
    'integration',
    'browser-runner',
    'browser-agent',
    'visual',
    'accessibility',
    'performance-smoke',
    'security-smoke',
    'manual',
  ]),
  disposition: Object.freeze([
    'automate-now',
    'automate-later',
    'browser-smoke',
    'manual',
    'provider-live',
    'exploratory',
    'human-logic-risk',
    'risk-note',
    'not-in-scope',
  ]),
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
  'surface',
  'layer',
  'disposition',
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
  'surface',
  'layer',
  'disposition',
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
  'surface',
  'layer',
  'disposition',
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
const LEGACY_AUTOMATION_PROJECTIONS = Object.freeze({
  'automate-now': Object.freeze({ recommended: true, targets: Object.freeze(['durable-regression', 'api-or-component']) }),
  'browser-smoke': Object.freeze({ recommended: true, targets: Object.freeze(['browser-agent-smoke']) }),
  'exploratory': Object.freeze({ recommended: false, targets: Object.freeze(['exploratory']) }),
  'manual': Object.freeze({ recommended: false, targets: Object.freeze(['manual']) }),
  'provider-live': Object.freeze({ recommended: false, targets: Object.freeze(['manual']) }),
  'automate-later': Object.freeze({ recommended: false, targets: Object.freeze(['not-automated-risk-note']) }),
  'human-logic-risk': Object.freeze({ recommended: false, targets: Object.freeze(['not-automated-risk-note']) }),
  'risk-note': Object.freeze({ recommended: false, targets: Object.freeze(['not-automated-risk-note']) }),
  'not-in-scope': Object.freeze({ recommended: false, targets: Object.freeze(['not-automated-risk-note']) }),
});

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
    if (!hasOwn(testCase, field) || testCase[field] === null ||
      (typeof testCase[field] === 'string' && testCase[field].trim() === '')) {
      errors.push(`missing required field: ${field}`);
    }
  }

  for (const field of STRING_FIELDS) validateOwnType(errors, testCase, field, (value) => typeof value === 'string', 'a string');
  for (const field of STRING_ARRAY_FIELDS) {
    validateOwnType(errors, testCase, field, isStringArray, 'an array of strings');
  }
  for (const field of ['steps', 'expected']) {
    if (hasOwn(testCase, field) && isStringArray(testCase[field]) && !hasNonEmptyTextEntry(testCase[field])) {
      errors.push(`${field} must contain at least one nonblank string`);
    }
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
    if (hasOwn(testCase.automation, 'target') && typeof testCase.automation.target !== 'string') {
      errors.push('automation.target must be a string');
    }
    if (hasOwn(testCase.automation, 'preferred_tools') && !isStringArray(testCase.automation.preferred_tools)) {
      errors.push('automation.preferred_tools must be an array of strings');
    }
  }

  if (isPlainObject(testCase.evidence) && hasOwn(testCase.evidence, 'required') && !isStringArray(testCase.evidence.required)) {
    errors.push('evidence.required must be an array of strings');
  }

  for (const field of ['priority', 'type', 'source_status', 'surface', 'layer', 'disposition']) {
    if (hasOwn(testCase, field) && typeof testCase[field] === 'string' && !ENUMS[field].includes(testCase[field])) {
      errors.push(`invalid ${field}: "${testCase[field]}" (allowed: ${ENUMS[field].join(', ')})`);
    }
  }
  if (
    isPlainObject(testCase.automation) &&
    hasOwn(testCase.automation, 'target') &&
    typeof testCase.automation.target === 'string' &&
    !ENUMS['automation.target'].includes(testCase.automation.target)
  ) {
    errors.push(
      `invalid automation.target: "${testCase.automation.target}" (allowed: ${ENUMS['automation.target'].join(', ')})`,
    );
  }

  const disposition = hasOwn(testCase, 'disposition') ? testCase.disposition : undefined;
  const automationTarget = isPlainObject(testCase.automation) ? testCase.automation.target : undefined;
  const legacyProjection = hasOwn(LEGACY_AUTOMATION_PROJECTIONS, disposition)
    ? LEGACY_AUTOMATION_PROJECTIONS[disposition]
    : undefined;
  if (
    legacyProjection &&
    isPlainObject(testCase.automation) &&
    hasOwn(testCase.automation, 'recommended') &&
    typeof testCase.automation.recommended === 'boolean' &&
    testCase.automation.recommended !== legacyProjection.recommended
  ) {
    errors.push(`disposition ${disposition} requires automation.recommended=${legacyProjection.recommended}`);
  }
  if (
    legacyProjection &&
    isPlainObject(testCase.automation) &&
    hasOwn(testCase.automation, 'target') &&
    typeof testCase.automation.target === 'string' &&
    !legacyProjection.targets.includes(testCase.automation.target)
  ) {
    errors.push(`disposition ${disposition} requires automation.target: ${legacyProjection.targets.join(', ')}`);
  }
  if (disposition === 'human-logic-risk' && testCase.logic_risk !== true) {
    errors.push('disposition human-logic-risk requires logic_risk: true');
  }
  if (testCase.logic_risk === true && !hasNonEmptyText(testCase.why_unreasonable)) {
    errors.push('logic_risk true requires non-empty why_unreasonable');
  }
  if (testCase.source_status === 'mismatch' && disposition === 'automate-now') {
    errors.push('source_status mismatch cannot use disposition automate-now');
  }
  if (testCase.source_status === 'mismatch' && automationTarget === 'durable-regression') {
    errors.push('source_status mismatch cannot use automation.target durable-regression');
  }
  if (testCase.logic_risk === true && disposition === 'automate-now') {
    errors.push('logic_risk true cannot use disposition automate-now');
  }
  if (testCase.logic_risk === true && automationTarget === 'durable-regression') {
    errors.push('logic_risk true cannot use automation.target durable-regression');
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
