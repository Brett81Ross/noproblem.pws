'use strict';

const assert = require('assert');
const { normalizeQuantity, normalizeServices } = require('../lib/matrix-quote-guardrails');

const rateCard = {
  services: {
    driveway_cleaning: { label: 'Driveway Surface Cleaning', unit: 'sq_ft', rate: 0.18 },
    rust_treatment: { label: 'Rust Treatment', unit: 'flat', rate: 125 },
    vehicle_wash: { label: 'Commercial / Fleet Vehicle Wash', unit: 'vehicle', rate: 125 }
  }
};

assert.strictEqual(normalizeQuantity('800.04', 'sq_ft'), 800);
assert.strictEqual(normalizeQuantity(-10, 'sq_ft'), null);
assert.strictEqual(normalizeQuantity('bad', 'sq_ft'), null);
assert.strictEqual(normalizeQuantity(2.4, 'vehicle'), 2);
assert.strictEqual(normalizeQuantity(undefined, 'flat'), 1);

{
  const result = normalizeServices({
    services: [{
      serviceId: 'driveway_cleaning',
      label: 'Do not trust model label',
      quantity: '800',
      quantityUnit: 'acre',
      estimatedTimeMinutes: '75',
      waterUsageGallons: 300,
      calculatedPrice: 999999
    }],
    requestedServices: ['driveway_cleaning'],
    rateCard,
    multiplier: 1.12
  });

  assert.strictEqual(result.issues.length, 0);
  assert.strictEqual(result.services.length, 1);
  assert.strictEqual(result.services[0].label, 'Driveway Surface Cleaning');
  assert.strictEqual(result.services[0].quantityUnit, 'sq_ft');
  assert.strictEqual(result.services[0].quantity, 800);
  assert.strictEqual(result.services[0].calculatedPrice, 161.28);
  assert.strictEqual(result.services[0].scopeOrigin, 'requested');
}

{
  const result = normalizeServices({
    services: [
      { serviceId: 'invented_magic_service', quantity: 1 },
      { serviceId: 'driveway_cleaning', quantity: 'not-a-number' },
      { serviceId: 'rust_treatment', quantity: null }
    ],
    requestedServices: [],
    rateCard,
    multiplier: 1
  });

  assert.strictEqual(result.services.length, 1);
  assert.strictEqual(result.services[0].serviceId, 'rust_treatment');
  assert.strictEqual(result.services[0].quantity, 1);
  assert.strictEqual(result.services[0].calculatedPrice, 125);
  assert.strictEqual(result.services[0].scopeOrigin, 'observed');
  assert.strictEqual(result.requiresReview, true);
  assert.strictEqual(result.issues.some(issue => issue.code === 'UNKNOWN_SERVICE'), true);
  assert.strictEqual(result.issues.some(issue => issue.code === 'INVALID_QUANTITY'), true);
}

console.log('Schism quote guardrails QA passed');
