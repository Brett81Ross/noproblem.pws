'use strict';

const assert = require('node:assert/strict');
const { sha256 } = require('../lib/matrix-calibration-activation');
const {
  MATRIX_ACTIVE_CALIBRATION_ENV,
  loadTrustedActivePricingCalibration,
  parseTrustedActivation
} = require('../lib/matrix-active-calibration-vault');

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

assert.equal(loadTrustedActivePricingCalibration({ env: {} }), null);
assert.equal(parseTrustedActivation('   '), null);

const trusted = activation({
  minimumJobCents: 12999,
  serviceRateCents: { driveway_cleaning: 25 }
});

const compiled = loadTrustedActivePricingCalibration({
  env: { [MATRIX_ACTIVE_CALIBRATION_ENV]: JSON.stringify(trusted) }
});
assert.equal(compiled.activeRuleVersion, 'pricing-v2');
assert.equal(compiled.minimumJob, 129.99);
assert.equal(compiled.services.driveway_cleaning.rate, 0.25);
assert.equal(compiled.sourceActivationSha256, trusted.sha256);

assert.throws(() => loadTrustedActivePricingCalibration({
  env: { [MATRIX_ACTIVE_CALIBRATION_ENV]: '{bad-json' }
}), /trusted ACTIVE calibration is not valid JSON/);

const tampered = JSON.parse(JSON.stringify(trusted));
tampered.change.minimumJobCents = 1;
assert.throws(() => loadTrustedActivePricingCalibration({
  env: { [MATRIX_ACTIVE_CALIBRATION_ENV]: JSON.stringify(tampered) }
}), /integrity/);

assert.throws(() => loadTrustedActivePricingCalibration({
  env: { [MATRIX_ACTIVE_CALIBRATION_ENV]: JSON.stringify(activation({ minimumJobCents: 12999 }, { previousRuleVersion: 'pricing-old' })) }
}), /current pricing rule changed before application/);

const rejected = activation({ minimumJobCents: 12999 }, { status: 'REJECTED' });
assert.throws(() => loadTrustedActivePricingCalibration({
  env: { [MATRIX_ACTIVE_CALIBRATION_ENV]: JSON.stringify(rejected) }
}), /only an ACTIVE Matrix calibration activation may apply/);

const rivetexAttempt = {
  body: {
    activation: activation({ minimumJobCents: 1 })
  }
};
const noTrustedSource = loadTrustedActivePricingCalibration({ env: {}, request: rivetexAttempt });
assert.equal(noTrustedSource, null);

console.log('matrix active calibration vault: PASS');
