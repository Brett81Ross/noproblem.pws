'use strict';

const crypto = require('node:crypto');

const MATRIX_CALIBRATION_ACCEPTANCE_VERSION = 'matrix-calibration-acceptance-2026-09-v1';
const RIVETEX_RELEASE_VERSION = 'mcx-calibration-release-2026-09-v1';

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
    throw new Error(`MATRIX_CALIBRATION_INVALID: ${field} is required.`);
  }
  return value.trim();
}

function validateRelease(release) {
  if (!release || typeof release !== 'object') throw new Error('MATRIX_CALIBRATION_INVALID: release is required.');
  if (release.version !== RIVETEX_RELEASE_VERSION) throw new Error('MATRIX_CALIBRATION_INVALID: unsupported release version.');
  if (release.kind !== 'medicine-creek-exterior.calibration-release') throw new Error('MATRIX_CALIBRATION_INVALID: unsupported release kind.');
  if (!release.target || typeof release.target !== 'object') throw new Error('MATRIX_CALIBRATION_INVALID: release target is required.');
  if (!release.change || typeof release.change !== 'object') throw new Error('MATRIX_CALIBRATION_INVALID: release change is required.');
  if (release.governance?.isInstructionOnly !== true || release.governance?.mutatesTarget !== false || release.governance?.requiresTargetSideValidation !== true || release.governance?.requiresExplicitTargetSideActivation !== true) {
    throw new Error('MATRIX_CALIBRATION_INVALID: release governance boundary is not intact.');
  }

  const claimed = requireText(release.sha256, 'release.sha256');
  const unsigned = { ...release };
  delete unsigned.sha256;
  if (sha256(unsigned) !== claimed) throw new Error('MATRIX_CALIBRATION_INVALID: release SHA-256 integrity check failed.');
  return claimed;
}

function evaluateMatrixCalibrationRelease(input = {}) {
  const release = input.release;
  const releaseSha256 = validateRelease(release);
  const matrixSystem = requireText(input.matrixSystem, 'matrixSystem');
  const currentRuleVersion = requireText(input.currentRuleVersion, 'currentRuleVersion');
  const validatedBy = requireText(input.validatedBy, 'validatedBy');

  if (release.target.system !== matrixSystem) {
    throw new Error('MATRIX_CALIBRATION_INVALID: release targets a different system.');
  }

  const expectedCurrent = requireText(release.target.currentRuleVersion, 'release.target.currentRuleVersion');
  const proposed = requireText(release.target.proposedRuleVersion, 'release.target.proposedRuleVersion');

  if (expectedCurrent !== currentRuleVersion) {
    return Object.freeze({
      version: MATRIX_CALIBRATION_ACCEPTANCE_VERSION,
      status: 'REJECTED',
      releaseSha256,
      targetSystem: matrixSystem,
      observedCurrentRuleVersion: currentRuleVersion,
      proposedRuleVersion: proposed,
      validatedBy,
      reason: 'CURRENT_RULE_VERSION_DRIFT',
      governance: Object.freeze({
        validatesOnly: true,
        appliesChange: false,
        requiresSeparateExplicitActivation: true,
        grantsRivetexNoMutationAuthority: true
      })
    });
  }

  return Object.freeze({
    version: MATRIX_CALIBRATION_ACCEPTANCE_VERSION,
    status: 'VALIDATED',
    releaseSha256,
    targetSystem: matrixSystem,
    observedCurrentRuleVersion: currentRuleVersion,
    proposedRuleVersion: proposed,
    validatedBy,
    change: Object.freeze({ ...release.change }),
    governance: Object.freeze({
      validatesOnly: true,
      appliesChange: false,
      requiresSeparateExplicitActivation: true,
      grantsRivetexNoMutationAuthority: true
    })
  });
}

module.exports = {
  MATRIX_CALIBRATION_ACCEPTANCE_VERSION,
  RIVETEX_RELEASE_VERSION,
  evaluateMatrixCalibrationRelease,
  sha256
};
