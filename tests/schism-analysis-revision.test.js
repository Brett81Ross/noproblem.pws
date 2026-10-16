'use strict';

const assert = require('assert');
const revision = require('../analysis-revision');

function snap(overrides) {
  return {
    address: '123 main st',
    recordedAt: '2026-10-07T10:00:00Z',
    photoCount: 3,
    requestedServices: ['driveway_cleaning'],
    services: [{ serviceId: 'driveway_cleaning', label: 'Driveway', quantity: 800, quantityUnit: 'sq_ft', price: 144 }],
    total: 144,
    reviewStatus: 'field_ready',
    requiresHumanReview: false,
    crewReady: true,
    evidenceStrength: 'strong',
    nextBestAction: '',
    missingCount: 0,
    uncertainCount: 0,
    hazards: [],
    ...overrides
  };
}

assert.equal(revision.normalizeAddress(' 123 Main St., OKC '), '123 main st okc');

{
  const diff = revision.compareRevisions(
    snap(),
    snap({ photoCount: 4, total: 180, services: [{ serviceId: 'driveway_cleaning', label: 'Driveway', quantity: 1000, quantityUnit: 'sq_ft', price: 180 }] })
  );
  assert.equal(diff.severity, 'material');
  assert.equal(diff.evidenceChanged, true);
  assert.equal(diff.sameEvidenceMaterialDrift, false);
  assert.equal(diff.totalDelta, 36);
  assert.equal(diff.totalDeltaPct, 25);
  assert.equal(diff.servicesChanged.length, 1);
}

{
  const diff = revision.compareRevisions(
    snap(),
    snap({
      photoCount: 3,
      total: 180,
      services: [
        { serviceId: 'driveway_cleaning', label: 'Driveway', quantity: 800, quantityUnit: 'sq_ft', price: 144 },
        { serviceId: 'sidewalk_cleaning', label: 'Sidewalk', quantity: 200, quantityUnit: 'sq_ft', price: 36 }
      ]
    })
  );
  assert.equal(diff.critical, true);
  assert.equal(diff.sameEvidenceMaterialDrift, true);
  assert.equal(diff.servicesAdded.length, 1);
  assert.equal(diff.explanations[0].includes('consistency concern'), true);
}

{
  const diff = revision.compareRevisions(
    snap(),
    snap({
      photoCount: 4,
      reviewStatus: 'review_required',
      requiresHumanReview: true,
      crewReady: false,
      evidenceStrength: 'moderate',
      nextBestAction: 'Show the runoff path.',
      missingCount: 1,
      hazards: ['electrical outlet | protect']
    })
  );
  assert.equal(diff.critical, true);
  assert.equal(diff.review.statusChanged, true);
  assert.equal(diff.review.crewChanged, true);
  assert.equal(diff.hazardsAdded.length, 1);
}

{
  const diff = revision.compareRevisions(
    snap(),
    snap({ photoCount: 4, missingCount: 0, uncertainCount: 0, evidenceStrength: 'strong' })
  );
  assert.equal(diff.severity, 'none');
  assert.equal(diff.material, false);
}

{
  const matrix = {
    services: [{ serviceId: 'driveway_cleaning', label: 'Driveway', quantity: 800, quantityUnit: 'sq_ft', calculatedPrice: 144 }],
    hazards: [{ hazard: 'Outlet', action: 'Protect' }],
    evidenceReview: { missingEvidence: [], uncertainEvidence: [] },
    decisionSupport: {
      status: 'field_ready',
      crew: { ready: true },
      evidence: { strength: 'strong' },
      pricing: { estimatedTotal: 144 }
    }
  };
  const summary = revision.summarizeMatrix(matrix, { address: '123 Main St.', photoCount: 3 });
  assert.equal(summary.address, '123 main st');
  assert.equal(summary.total, 144);
  assert.equal(summary.crewReady, true);
  assert.equal(summary.hazards.length, 1);
}

console.log('Schism revision intelligence QA passed');
