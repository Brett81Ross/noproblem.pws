'use strict';

const assert = require('node:assert/strict');
const { buildEffectiveRateCard } = require('../lib/matrix-effective-rate-card');

const DEFAULT = {
  minimumJob: 199,
  services: {
    driveway_cleaning: { unit: 'sq_ft', rate: 0.18 },
    rust_treatment: { unit: 'flat', rate: 125 }
  }
};
const cloneDefaultRateCard = () => JSON.parse(JSON.stringify(DEFAULT));
const sanitizeRate = (value, fallback, minimum, maximum) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
};

const unchanged = buildEffectiveRateCard({ cloneDefaultRateCard, sanitizeRate });
assert.deepEqual(unchanged, DEFAULT);

const owner = buildEffectiveRateCard({
  cloneDefaultRateCard,
  sanitizeRate,
  ownerSettings: {
    minimumJob: 99.99,
    services: { driveway_cleaning: { rate: 0.25 } }
  }
});
assert.equal(owner.minimumJob, 99.99);
assert.equal(owner.services.driveway_cleaning.rate, 0.25);
assert.equal(owner.services.rust_treatment.rate, 125);

let calibrationCalled = false;
const calibrated = buildEffectiveRateCard({
  cloneDefaultRateCard,
  sanitizeRate,
  compiledCalibration: { minimumJob: 129.99, services: { driveway_cleaning: { rate: 0.30 } } },
  applyCompiledCalibration(rateCard, compiled) {
    calibrationCalled = true;
    const next = JSON.parse(JSON.stringify(rateCard));
    next.minimumJob = compiled.minimumJob;
    next.services.driveway_cleaning.rate = compiled.services.driveway_cleaning.rate;
    return next;
  },
  ownerSettings: {
    minimumJob: 149.99,
    services: { driveway_cleaning: { rate: 0.35 } }
  }
});
assert.equal(calibrationCalled, true);
assert.equal(calibrated.minimumJob, 149.99);
assert.equal(calibrated.services.driveway_cleaning.rate, 0.35);

console.log('matrix effective rate card: PASS');
