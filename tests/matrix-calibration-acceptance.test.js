'use strict';

const assert = require('node:assert/strict');
const {
  evaluateMatrixCalibrationRelease,
  sha256
} = require('../lib/matrix-calibration-acceptance');

function release(overrides = {}) {
  const unsigned = {
    version: 'mcx-calibration-release-2026-09-v1',
    kind: 'medicine-creek-exterior.calibration-release',
    target: {
      system: 'matrix',
      ruleFamily: 'pricing',
      currentRuleVersion: 'pricing-v1',
      proposedRuleVersion: 'pricing-v2'
    },
    change: { minimumJobCents: 12999 },
    governance: {
      isInstructionOnly: true,
      mutatesTarget: false,
      requiresTargetSideValidation: true,
      requiresExplicitTargetSideActivation: true
    },
    ...overrides
  };
  return { ...unsigned, sha256: sha256(unsigned) };
}

const valid = evaluateMatrixCalibrationRelease({
  release: release(),
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v1',
  validatedBy: 'matrix-owner'
});
assert.equal(valid.status, 'VALIDATED');
assert.equal(valid.governance.appliesChange, false);
assert.equal(valid.governance.requiresSeparateExplicitActivation, true);
assert.equal(valid.change.minimumJobCents, 12999);

const drift = evaluateMatrixCalibrationRelease({
  release: release(),
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v9',
  validatedBy: 'matrix-owner'
});
assert.equal(drift.status, 'REJECTED');
assert.equal(drift.reason, 'CURRENT_RULE_VERSION_DRIFT');

assert.throws(() => evaluateMatrixCalibrationRelease({
  release: { ...release(), change: { minimumJobCents: 1 } },
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v1',
  validatedBy: 'matrix-owner'
}), /integrity/);

assert.throws(() => evaluateMatrixCalibrationRelease({
  release: release(),
  matrixSystem: 'different-system',
  currentRuleVersion: 'pricing-v1',
  validatedBy: 'matrix-owner'
}), /different system/);

const weak = release({ governance: {
  isInstructionOnly: false,
  mutatesTarget: true,
  requiresTargetSideValidation: false,
  requiresExplicitTargetSideActivation: false
}});
assert.throws(() => evaluateMatrixCalibrationRelease({
  release: weak,
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v1',
  validatedBy: 'matrix-owner'
}), /governance boundary/);

console.log('matrix calibration acceptance: PASS');
