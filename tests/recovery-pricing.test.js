'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { priceServices } = require('../lib/recovery-pricing');
const rateCard = {
    services: { driveway_cleaning: { label: 'Driveway', unit: 'sq_ft', rate: 0.18 }, rust_treatment: { label: 'Rust', unit: 'flat', rate: 125 } },
    difficultyMultipliers: { low: 1, moderate: 1.12 }
};
function price(services, difficulty = 'low') { return priceServices(services, difficulty, rateCard); }
test('valid quantity and multiplier', () => {
    const result = price([{ serviceId: 'driveway_cleaning', quantity: 800 }], 'moderate');
    assert.equal(result.reviewReason, null);
    assert.equal(result.services[0].calculatedPrice, 161.28);
});
test('flat pricing ignores model-supplied quantity', () => {
    assert.equal(price([{ serviceId: 'rust_treatment', quantity: 999 }]).services[0].calculatedPrice, 125);
});
test('unknown service cannot be priced', () => {
    const result = price([{ serviceId: 'vehicle_wash', quantity: 1 }]);
    assert.equal(result.services[0].calculatedPrice, null);
    assert.ok(result.reviewReason);
});
for (const quantity of [0, -1, null, undefined, '100', NaN, Infinity, 1e308]) {
    test('invalid quantity fails closed: ' + String(quantity), () => {
        const result = price([{ serviceId: 'driveway_cleaning', quantity }]);
        assert.equal(result.services[0].calculatedPrice, null);
        assert.ok(result.reviewReason);
    });
}
test('unknown difficulty fails closed', () => {
    const result = price([{ serviceId: 'driveway_cleaning', quantity: 100 }], '__proto__');
    assert.equal(result.services[0].calculatedPrice, null);
    assert.ok(result.reviewReason);
});
test('missing difficulty fails closed', () => {
    assert.ok(price([{ serviceId: 'driveway_cleaning', quantity: 100 }], undefined).reviewReason === null);
    assert.ok(priceServices([{ serviceId: 'driveway_cleaning', quantity: 100 }], undefined, rateCard).reviewReason);
});
test('empty services cannot create a quote', () => assert.ok(price([]).reviewReason));
test('one invalid line blocks the entire estimate', () => {
    const result = price([{ serviceId: 'driveway_cleaning', quantity: 100 }, { serviceId: 'driveway_cleaning', quantity: -5 }]);
    assert.ok(result.reviewReason);
});
