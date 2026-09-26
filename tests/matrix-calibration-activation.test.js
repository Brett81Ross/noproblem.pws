'use strict';

const assert = require('node:assert/strict');
const { activateValidatedCalibration } = require('../lib/matrix-calibration-activation');

function validation(overrides = {}) {
  return {
    version: 'matrix-calibration-acceptance-2026-09-v1',
    status: 'VALIDATED',
    releaseSha256: 'a'.repeat(64),
    targetSystem: 'matrix',
    observedCurrentRuleVersion: 'pricing-v1',
    proposedRuleVersion: 'pricing-v2',
    change: { minimumJobCents: 12999 },
    validatedBy: 'matrix-owner',
    governance: {
      validatesOnly: true,
      appliesChange: false,
      requiresSeparateExplicitActivation: true,
      grantsRivetexNoMutationAuthority: true
    },
    ...overrides
  };
}

const active = activateValidatedCalibration({
  validation: validation(),
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v1',
  activatedBy: 'matrix-owner',
  activationReason: 'Approved after governed calibration review.'
});
assert.equal(active.status, 'ACTIVE');
assert.equal(active.previousRuleVersion, 'pricing-v1');
assert.equal(active.activeRuleVersion, 'pricing-v2');
assert.equal(active.change.minimumJobCents, 12999);
assert.equal(active.governance.matrixOwnsActivationAuthority, true);
assert.equal(active.governance.rivetexMutationAuthority, false);
assert.match(active.sha256, /^[a-f0-9]{64}$/);

assert.throws(() => activateValidatedCalibration({
  validation: validation({ status: 'REJECTED' }),
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v1',
  activatedBy: 'matrix-owner',
  activationReason: 'Should fail.'
}), /only VALIDATED/);

assert.throws(() => activateValidatedCalibration({
  validation: validation(),
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v9',
  activatedBy: 'matrix-owner',
  activationReason: 'Should fail.'
}), /changed after validation/);

assert.throws(() => activateValidatedCalibration({
  validation: validation({ governance: {
    validatesOnly: false,
    appliesChange: true,
    requiresSeparateExplicitActivation: false,
    grantsRivetexNoMutationAuthority: false
  }}),
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v1',
  activatedBy: 'matrix-owner',
  activationReason: 'Should fail.'
}), /governance boundary/);

assert.throws(() => activateValidatedCalibration({
  validation: validation({ proposedRuleVersion: 'pricing-v1' }),
  matrixSystem: 'matrix',
  currentRuleVersion: 'pricing-v1',
  activatedBy: 'matrix-owner',
  activationReason: 'Should fail.'
}), /must differ/);

console.log('matrix calibration activation: PASS');
