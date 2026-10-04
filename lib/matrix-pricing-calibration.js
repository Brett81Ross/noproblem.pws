'use strict';

const { MATRIX_CALIBRATION_ACTIVATION_VERSION, sha256 } = require('./matrix-calibration-activation');

const MATRIX_PRICING_RULE_VERSION = 'pricing-v1';
const ALLOWED_CHANGE_KEYS = new Set(['minimumJobCents', 'serviceRateCents']);

function assertIntegerCents(value, field, maximum = 1000000) {
  if (!Number.isInteger(value) || value < 0 || value > maximum) {
    throw new Error(`MATRIX_PRICING_INVALID: ${field} must be integer cents between 0 and ${maximum}.`);
  }
}

function verifyActivation(activation) {
  if (!activation || typeof activation !== 'object') throw new Error('MATRIX_PRICING_INVALID: activation is required.');
  if (activation.version !== MATRIX_CALIBRATION_ACTIVATION_VERSION || activation.kind !== 'matrix.calibration-activation' || activation.status !== 'ACTIVE') {
    throw new Error('MATRIX_PRICING_INVALID: only an ACTIVE Matrix calibration activation may apply.');
  }
  if (activation.targetSystem !== 'matrix') throw new Error('MATRIX_PRICING_INVALID: activation targets a different system.');
  if (activation.governance?.matrixOwnsActivationAuthority !== true || activation.governance?.rivetexMutationAuthority !== false || activation.governance?.activationRequiresValidatedRelease !== true || activation.governance?.activationIsExplicit !== true) {
    throw new Error('MATRIX_PRICING_INVALID: activation governance boundary is not intact.');
  }
  const claimed = activation.sha256;
  if (typeof claimed !== 'string' || !claimed) throw new Error('MATRIX_PRICING_INVALID: activation SHA-256 is required.');
  const unsigned = { ...activation };
  delete unsigned.sha256;
  if (sha256(unsigned) !== claimed) throw new Error('MATRIX_PRICING_INVALID: activation SHA-256 integrity check failed.');
}

function compileActivePricingCalibration(input = {}) {
  const activation = input.activation;
  verifyActivation(activation);
  const currentRuleVersion = String(input.currentRuleVersion || '');
  if (activation.previousRuleVersion !== currentRuleVersion) {
    throw new Error('MATRIX_PRICING_INVALID: current pricing rule changed before application.');
  }

  const change = activation.change;
  if (!change || typeof change !== 'object' || Array.isArray(change)) throw new Error('MATRIX_PRICING_INVALID: activation change is required.');
  for (const key of Object.keys(change)) {
    if (!ALLOWED_CHANGE_KEYS.has(key)) throw new Error(`MATRIX_PRICING_INVALID: unsupported calibrated pricing field: ${key}`);
  }

  const compiled = { minimumJob: undefined, services: {} };
  if (Object.hasOwn(change, 'minimumJobCents')) {
    assertIntegerCents(change.minimumJobCents, 'minimumJobCents');
    compiled.minimumJob = change.minimumJobCents / 100;
  }

  if (Object.hasOwn(change, 'serviceRateCents')) {
    if (!change.serviceRateCents || typeof change.serviceRateCents !== 'object' || Array.isArray(change.serviceRateCents)) {
      throw new Error('MATRIX_PRICING_INVALID: serviceRateCents must be an object.');
    }
    for (const [serviceId, cents] of Object.entries(change.serviceRateCents)) {
      if (!/^[a-z0-9_]+$/.test(serviceId)) throw new Error('MATRIX_PRICING_INVALID: invalid serviceId.');
      assertIntegerCents(cents, `serviceRateCents.${serviceId}`);
      compiled.services[serviceId] = { rate: cents / 100 };
    }
  }

  return Object.freeze({
    activeRuleVersion: activation.activeRuleVersion,
    sourceActivationSha256: activation.sha256,
    minimumJob: compiled.minimumJob,
    services: Object.freeze(compiled.services)
  });
}

function applyCompiledCalibration(rateCard, compiled) {
  const next = JSON.parse(JSON.stringify(rateCard));
  if (compiled.minimumJob !== undefined) next.minimumJob = compiled.minimumJob;
  for (const [serviceId, patch] of Object.entries(compiled.services || {})) {
    if (!next.services?.[serviceId]) throw new Error(`MATRIX_PRICING_INVALID: unknown serviceId: ${serviceId}`);
    next.services[serviceId].rate = patch.rate;
  }
  return next;
}

module.exports = {
  MATRIX_PRICING_RULE_VERSION,
  compileActivePricingCalibration,
  applyCompiledCalibration
};
