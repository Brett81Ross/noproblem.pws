'use strict';

const assert = require('node:assert/strict');
const { sha256 } = require('../lib/matrix-calibration-activation');
const { compileActivePricingCalibration, applyCompiledCalibration } = require('../lib/matrix-pricing-calibration');

function activation(change, overrides = {}) {
  const unsigned = {
    version: 'matrix-calibration-activation-2026-09-v1',
    kind: 'matrix.calibration-activation',
    status: 'ACTIVE',
    targetSystem: 'matrix',
    previousRuleVersion: 'pricing-v1',
    activeRuleVersion: 'pricing-v2',
    sourceReleaseSha256: 'a'.repeat(64),
    change,
    activatedBy: 'matrix-owner',
    activationReason: 'Approved calibration.',
    governance: {
      matrixOwnsActivationAuthority: true,
      rivetexMutationAuthority: false,
      activationRequiresValidatedRelease: true,
      activationIsExplicit: true
    },
    ...overrides
  };
  return { ...unsigned, sha256: sha256(unsigned) };
}

const compiled = compileActivePricingCalibration({
  activation: activation({ minimumJobCents: 12999, serviceRateCents: { driveway_cleaning: 25 } }),
  currentRuleVersion: 'pricing-v1'
});
assert.equal(compiled.minimumJob, 129.99);
assert.equal(compiled.services.driveway_cleaning.rate, 0.25);

const base = { minimumJob: 99.99, services: { driveway_cleaning: { rate: 0.18 }, house_wash: { rate: 0.22 } } };
const applied = applyCompiledCalibration(base, compiled);
assert.equal(applied.minimumJob, 129.99);
assert.equal(applied.services.driveway_cleaning.rate, 0.25);
assert.equal(applied.services.house_wash.rate, 0.22);
assert.equal(base.minimumJob, 99.99);

assert.throws(() => compileActivePricingCalibration({
  activation: activation({ arbitraryDiscountPercent: 90 }),
  currentRuleVersion: 'pricing-v1'
}), /unsupported calibrated pricing field/);

assert.throws(() => compileActivePricingCalibration({
  activation: activation({ minimumJobCents: 129.99 }),
  currentRuleVersion: 'pricing-v1'
}), /integer cents/);

assert.throws(() => compileActivePricingCalibration({
  activation: activation({ minimumJobCents: 12999 }, { previousRuleVersion: 'pricing-old' }),
  currentRuleVersion: 'pricing-v1'
}), /changed before application/);

const tampered = activation({ minimumJobCents: 12999 });
tampered.change.minimumJobCents = 1;
assert.throws(() => compileActivePricingCalibration({
  activation: tampered,
  currentRuleVersion: 'pricing-v1'
}), /integrity/);

assert.throws(() => applyCompiledCalibration(base, {
  activeRuleVersion: 'pricing-v2',
  services: { imaginary_service: { rate: 0.01 } }
}), /unknown serviceId/);

console.log('matrix pricing calibration: PASS');
