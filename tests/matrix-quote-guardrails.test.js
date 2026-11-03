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
assert.strictEqual(normalizeQuantity(1000000, 'sq_ft'), 1000000, 'maximum supported area stays valid');
assert.strictEqual(normalizeQuantity(1000001, 'sq_ft'), null, 'oversized area must not be silently capped');
assert.strictEqual(normalizeQuantity(10001, 'vehicle'), null, 'oversized fleet count must not be silently capped');

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

{
  const result=normalizeServices({
    services:[
      {serviceId:'driveway_cleaning',scopeItemId:'driveway_a',quantity:800,evidence:'Main concrete driveway'},
      {serviceId:'driveway_cleaning',scopeItemId:'driveway_a',quantity:800,evidence:'Main concrete driveway'},
      {serviceId:'driveway_cleaning',scopeItemId:'driveway_b',quantity:300,evidence:'Side driveway'}
    ],rateCard,multiplier:1
  });
  assert.strictEqual(result.services.length,2,'Duplicate scope must not be priced twice');
  assert.strictEqual(result.issues.some(issue=>issue.code==='DUPLICATE_SURFACE'),true);
  assert.strictEqual(result.requiresReview,true);
}
{
  const result=normalizeServices({
    services:[
      {serviceId:'driveway_cleaning',quantity:800,evidence:'Main driveway'},
      {serviceId:'driveway_cleaning',quantity:800,evidence:'Main driveway'},
      {serviceId:'driveway_cleaning',quantity:250,evidence:'Side driveway'}
    ],rateCard,multiplier:1
  });
  assert.strictEqual(result.services.length,2,'Identical evidence records must not double bill');
}

{
  const withMinimum={...rateCard,minimumJob:99.99};
  const small=normalizeServices({services:[{serviceId:'driveway_cleaning',quantity:100}],rateCard:withMinimum,multiplier:1});
  assert.strictEqual(small.services[0].calculatedPrice,18,'preserve approved unit rate');
  assert.strictEqual(small.requiresReview,true,'below-minimum job must not be field ready');
  assert(small.issues.some(issue=>issue.code==='BELOW_MINIMUM_JOB'));
  const large=normalizeServices({services:[{serviceId:'driveway_cleaning',quantity:800}],rateCard:withMinimum,multiplier:1.12});
  assert.strictEqual(large.services[0].calculatedPrice,161.28,'preserve difficulty multiplier');
  assert.strictEqual(large.requiresReview,false,'above minimum must remain releasable');
  const exact=normalizeServices({services:[{serviceId:'rust_treatment',quantity:1}],rateCard:{...rateCard,minimumJob:125},multiplier:1});
  assert.strictEqual(exact.requiresReview,false,'exact minimum must pass');
}
{
  const oversized=normalizeServices({services:[
    {serviceId:'driveway_cleaning',quantity:1500000,estimatedTimeMinutes:90,waterUsageGallons:120}
  ],rateCard,multiplier:1});
  assert.strictEqual(oversized.services.length,0,'oversized property must not generate a capped and underpriced quote');
  assert(oversized.issues.some(issue=>issue.code==='INVALID_QUANTITY'));
  assert(oversized.issues.some(issue=>issue.code==='NO_EXECUTABLE_SCOPE'));
  assert.strictEqual(oversized.requiresReview,true);
}
{
  const empty=normalizeServices({services:[],rateCard,multiplier:1});
  assert.strictEqual(empty.services.length,0);
  assert(empty.issues.some(issue=>issue.code==='NO_EXECUTABLE_SCOPE'),
    'an empty AI scope must not be shown as field ready');
  assert.strictEqual(empty.requiresReview,true);
}
console.log('Schism quote guardrails QA passed');
