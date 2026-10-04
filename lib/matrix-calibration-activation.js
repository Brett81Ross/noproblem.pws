'use strict';

const crypto = require('node:crypto');
const { MATRIX_CALIBRATION_ACCEPTANCE_VERSION } = require('./matrix-calibration-acceptance');

const MATRIX_CALIBRATION_ACTIVATION_VERSION = 'matrix-calibration-activation-2026-09-v1';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function sha256(value) {
  return crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
}

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`MATRIX_ACTIVATION_INVALID: ${field} is required.`);
  }
  return value.trim();
}

function activateValidatedCalibration(input = {}) {
  const validation = input.validation;
  if (!validation || typeof validation !== 'object') throw new Error('MATRIX_ACTIVATION_INVALID: validation is required.');
  if (validation.version !== MATRIX_CALIBRATION_ACCEPTANCE_VERSION) throw new Error('MATRIX_ACTIVATION_INVALID: unsupported validation version.');
  if (validation.status !== 'VALIDATED') throw new Error('MATRIX_ACTIVATION_INVALID: only VALIDATED calibration may activate.');
  if (validation.governance?.validatesOnly !== true || validation.governance?.appliesChange !== false || validation.governance?.requiresSeparateExplicitActivation !== true || validation.governance?.grantsRivetexNoMutationAuthority !== true) {
    throw new Error('MATRIX_ACTIVATION_INVALID: validation governance boundary is not intact.');
  }

  const matrixSystem = requireText(input.matrixSystem, 'matrixSystem');
  const currentRuleVersion = requireText(input.currentRuleVersion, 'currentRuleVersion');
  const activatedBy = requireText(input.activatedBy, 'activatedBy');
  const activationReason = requireText(input.activationReason, 'activationReason');

  if (validation.targetSystem !== matrixSystem) throw new Error('MATRIX_ACTIVATION_INVALID: validation targets a different system.');
  if (validation.observedCurrentRuleVersion !== currentRuleVersion) throw new Error('MATRIX_ACTIVATION_INVALID: current rule version changed after validation.');

  const proposedRuleVersion = requireText(validation.proposedRuleVersion, 'validation.proposedRuleVersion');
  if (proposedRuleVersion === currentRuleVersion) throw new Error('MATRIX_ACTIVATION_INVALID: proposed rule version must differ from current rule version.');
  if (!validation.change || typeof validation.change !== 'object' || Array.isArray(validation.change)) throw new Error('MATRIX_ACTIVATION_INVALID: validated change is required.');

  const activation = {
    version: MATRIX_CALIBRATION_ACTIVATION_VERSION,
    kind: 'matrix.calibration-activation',
    status: 'ACTIVE',
    targetSystem: matrixSystem,
    previousRuleVersion: currentRuleVersion,
    activeRuleVersion: proposedRuleVersion,
    sourceReleaseSha256: requireText(validation.releaseSha256, 'validation.releaseSha256'),
    change: Object.freeze({ ...validation.change }),
    activatedBy,
    activationReason,
    governance: Object.freeze({
      matrixOwnsActivationAuthority: true,
      rivetexMutationAuthority: false,
      activationRequiresValidatedRelease: true,
      activationIsExplicit: true
    })
  };

  return Object.freeze({ ...activation, sha256: sha256(activation) });
}

module.exports = {
  MATRIX_CALIBRATION_ACTIVATION_VERSION,
  activateValidatedCalibration,
  sha256
};
