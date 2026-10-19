'use strict';

const assert = require('assert');
const { buildMatrixDecisionSupport } = require('../lib/matrix-decision-support');

const rateCard = {
  minimumJob: 99.99,
  services: {
    driveway_cleaning: { label: 'Driveway Surface Cleaning', unit: 'sq_ft', rate: 0.18 },
    sidewalk_cleaning: { label: 'Sidewalk Surface Cleaning', unit: 'sq_ft', rate: 0.16 }
  }
};

{
  const result = buildMatrixDecisionSupport({
    scanData: {
      services: [{ serviceId: 'driveway_cleaning', label: 'Driveway Surface Cleaning', quantity: 800, quantityUnit: 'sq_ft', calculatedPrice: 161.28 }],
      hazards: [],
      evidenceReview: { readyForEstimate: true, missingEvidence: [], uncertainEvidence: [], confirmedCategories: ['material', 'condition'] },
      requiresHumanReview: false
    },
    requestedServices: ['driveway_cleaning'],
    evidenceMeta: [{ source: 'walkaround_manual_capture' }, { source: 'operator_upload' }],
    photoCount: 2,
    satelliteMeasurements: [{ label: 'Driveway' }],
    rateCard,
    difficulty: 'moderate',
    multiplier: 1.12
  });
  assert.strictEqual(result.status, 'field_ready');
  assert.strictEqual(result.evidence.strength, 'strong');
  assert.strictEqual(result.crew.ready, true);
  assert.strictEqual(result.nextBestAction, null);
  assert.strictEqual(result.scope.requestedNotQuoted.length, 0);
  assert.strictEqual(result.pricing.drivers[0].serviceId, 'driveway_cleaning');
  assert.strictEqual(result.pricing.estimatedTotal, 161.28);
}

{
  const result = buildMatrixDecisionSupport({
    scanData: {
      services: [{ serviceId: 'driveway_cleaning', quantity: 400, quantityUnit: 'sq_ft', calculatedPrice: 72 }],
      hazards: [{ hazard: 'Outlet', action: 'Protect it' }],
      evidenceReview: {
        readyForEstimate: false,
        missingEvidence: [
          { category: 'access', prompt: 'Show me the side gate.', reason: 'Access width is unknown.', priority: 'medium' },
          { category: 'runoff', prompt: 'Show me where wash water would naturally run.', reason: 'Runoff path is unknown.', priority: 'high' }
        ],
        uncertainEvidence: []
      },
      requiresHumanReview: true,
      humanReviewReason: 'Runoff still needs confirmation.'
    },
    requestedServices: ['driveway_cleaning', 'sidewalk_cleaning'],
    evidenceMeta: [{ source: 'walkaround_sampled_frame' }],
    photoCount: 1,
    rateCard,
    difficulty: 'low',
    multiplier: 1
  });
  assert.strictEqual(result.status, 'review_required');
  assert.strictEqual(result.evidence.strength, 'limited');
  assert.strictEqual(result.nextBestAction.category, 'runoff');
  assert.strictEqual(result.nextBestAction.priority, 'high');
  assert.deepStrictEqual(result.scope.requestedNotQuoted, ['sidewalk_cleaning']);
  assert.strictEqual(result.crew.ready, false);
  assert.strictEqual(result.safety.hazardCount, 1);
  assert.strictEqual(result.pricing.minimumApplied, true);
  assert.strictEqual(result.pricing.estimatedTotal, 99.99);
}

{
  const result = buildMatrixDecisionSupport({
    scanData: {
      services: [{ serviceId: 'driveway_cleaning', quantity: 500, quantityUnit: 'sq_ft', calculatedPrice: 90 }],
      evidenceReview: { readyForEstimate: true, missingEvidence: [], uncertainEvidence: [] },
      requiresHumanReview: false
    },
    requestedServices: ['driveway_cleaning'],
    elevatedScopeRequested: true,
    rateCard,
    difficulty: 'low',
    multiplier: 1
  });
  assert.strictEqual(result.status, 'blocked');
  assert.strictEqual(result.crew.ready, false);
  assert.strictEqual(result.safety.launchBoundaryExceeded, true);
}

{
  const result = buildMatrixDecisionSupport({
    scanData: {
      services: [
        { serviceId: 'driveway_cleaning', quantity: 1000, quantityUnit: 'sq_ft', calculatedPrice: 180 },
        { serviceId: 'sidewalk_cleaning', quantity: 100, quantityUnit: 'sq_ft', calculatedPrice: 16 }
      ],
      evidenceReview: { readyForEstimate: true, missingEvidence: [], uncertainEvidence: [] },
      requiresHumanReview: false
    },
    requestedServices: ['driveway_cleaning'],
    evidenceMeta: [{ source: 'operator_upload' }],
    photoCount: 1,
    rateCard,
    difficulty: 'low',
    multiplier: 1
  });
  assert.deepStrictEqual(result.scope.additionalObserved, ['sidewalk_cleaning']);
  assert.strictEqual(result.recommendedActions.some(item => item.category === 'additional_scope'), true);
  assert.strictEqual(result.pricing.drivers[0].serviceId, 'driveway_cleaning');
}

console.log('Schism decision support QA passed');
