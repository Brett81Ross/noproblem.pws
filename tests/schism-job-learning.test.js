'use strict';

const assert = require('assert');
const learning = require('../job-learning');

const matrix = {
  services: [{
    serviceId: 'driveway_cleaning',
    label: 'Driveway Surface Cleaning',
    quantity: 800,
    quantityUnit: 'sq_ft',
    estimatedTimeMinutes: 60,
    waterUsageGallons: 250,
    calculatedPrice: 144
  }],
  fieldPlan: { totalEstimatedHours: '1 Hour' },
  decisionSupport: {
    evidence: { strength: 'strong' },
    crew: { ready: true },
    pricing: {
      estimatedTotal: 144,
      drivers: [{ serviceId: 'driveway_cleaning', rate: 0.18, finalPrice: 144 }]
    }
  }
};

const snapshot = learning.matrixSnapshot(matrix, {
  jobName: 'Test Driveway',
  jobAddress: '123 Main St',
  quotedTotal: 144,
  selectedServiceIds: ['driveway_cleaning']
});
assert.equal(snapshot.matrixEstimatedTotal, 144);
assert.equal(snapshot.quotedTotal, 144);
assert.equal(snapshot.estimatedMinutes, 60);
assert.equal(snapshot.estimatedWaterGallons, 250);
assert.equal(snapshot.manualPriceOverride, false);
assert.equal(snapshot.selectedServices[0].effectiveRate, 0.18);

const clean = learning.makeOutcome({
  snapshot,
  id: 'job-a',
  recordedAt: '2026-10-01T10:00:00Z',
  actualPrice: 180,
  actualMinutes: 75,
  actualWaterGallons: 300,
  scopeChanged: false,
  returnVisit: false
});
assert.equal(clean.eligibility.operationsLearning, true);
assert.equal(clean.eligibility.pricingCalibration, true);
assert.equal(clean.predicted.matrixPrice, 144);
assert.equal(clean.actual.price, 180);

const dirty = learning.makeOutcome({
  snapshot: { ...snapshot, manualPriceOverride: true },
  actualPrice: 180,
  actualMinutes: 75,
  scopeChanged: false,
  returnVisit: false
});
assert.equal(dirty.eligibility.operationsLearning, true);
assert.equal(dirty.eligibility.pricingCalibration, false);

const scopeChanged = learning.makeOutcome({
  snapshot,
  actualPrice: 180,
  actualMinutes: 75,
  scopeChanged: true,
  returnVisit: false
});
assert.equal(scopeChanged.eligibility.operationsLearning, false);
assert.equal(scopeChanged.eligibility.pricingCalibration, false);

const records = [
  learning.makeOutcome({ snapshot, actualPrice: 180, actualMinutes: 75, actualWaterGallons: 300, scopeChanged: false, returnVisit: false, id: '1' }),
  learning.makeOutcome({ snapshot, actualPrice: 176, actualMinutes: 72, actualWaterGallons: 290, scopeChanged: false, returnVisit: false, id: '2' }),
  learning.makeOutcome({ snapshot, actualPrice: 184, actualMinutes: 78, actualWaterGallons: 310, scopeChanged: false, returnVisit: false, id: '3' })
];

const analysis = learning.analyzeLearning(records);
assert.equal(analysis.completedJobs, 3);
assert.equal(analysis.pricingEligibleJobs, 3);
assert.equal(analysis.operationsEligibleJobs, 3);
assert.equal(analysis.calibrationCandidates.length, 1);
assert.equal(analysis.calibrationCandidates[0].serviceId, 'driveway_cleaning');
assert.equal(analysis.calibrationCandidates[0].candidateRate, 0.23);
assert.equal(analysis.calibrationRecommendation.status, 'ADVISORY_ONLY');
assert.equal(analysis.calibrationRecommendation.governance.mutatesPricing, false);
assert.equal(analysis.calibrationRecommendation.governance.writesCalibrationVault, false);
assert.equal(analysis.calibrationRecommendation.governance.requiresHumanApproval, true);
assert.equal(analysis.status, 'calibration_candidate');
assert.equal(analysis.matrixPriceBiasPct, 25);
assert.equal(analysis.timeBiasPct, 25);
assert.equal(analysis.waterBiasPct, 20);

const noCandidate = learning.analyzeLearning(records.slice(0, 2));
assert.equal(noCandidate.calibrationCandidates.length, 0);
assert.equal(noCandidate.status, 'collecting');

assert.throws(() => learning.makeOutcome({ snapshot, actualPrice: '', actualMinutes: 60 }), /Actual collected/);
assert.throws(() => learning.makeOutcome({ snapshot, actualPrice: 100, actualMinutes: 0 }), /crew time/);

console.log('Schism job learning QA passed');
