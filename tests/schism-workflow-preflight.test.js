'use strict';

const assert = require('assert');
const { evaluatePreflight } = require('../workflow-preflight');

function base(overrides) {
  return {
    customer: 'Ada',
    address: '123 Main St',
    selectedServices: ['driveway_cleaning'],
    photoCount: 3,
    buildingLevel: 'one',
    matrix: null,
    ...overrides
  };
}

{
  const result = evaluatePreflight(base({ address: '' }));
  assert.equal(result.state, 'property_required');
  assert.equal(result.nextAction.id, 'address');
  assert.equal(result.readiness, 'not_ready');
}

{
  const result = evaluatePreflight(base({ selectedServices: [] }));
  assert.equal(result.state, 'scope_required');
  assert.equal(result.nextAction.id, 'scope');
  assert.equal(result.blockers.some(item => /invent/i.test(item)), true);
}

{
  const result = evaluatePreflight(base({ photoCount: 0 }));
  assert.equal(result.state, 'evidence_required');
  assert.equal(result.nextAction.id, 'capture');
}

{
  const result = evaluatePreflight(base({ photoCount: 1 }));
  assert.equal(result.state, 'analysis_ready');
  assert.equal(result.nextAction.id, 'analyze');
  assert.equal(result.advisories.some(item => /thin/i.test(item)), true);
}

{
  const result = evaluatePreflight(base({
    learningAdvisories: [{
      type: 'pricing_history',
      serviceId: 'driveway_cleaning',
      message: 'Driveway Surface Cleaning has a repeated historical Matrix-price bias of +18.0% across 4 clean jobs. Pricing is unchanged; review the advisory calibration before release.'
    }]
  }));
  assert.equal(result.state, 'analysis_ready');
  assert.equal(result.advisories.some(item => /historical Matrix-price bias/i.test(item)), true);
  assert.equal(result.blockers.length, 0);
}

{
  const result = evaluatePreflight(base({ buildingLevel: 'multiple' }));
  assert.equal(result.state, 'analysis_review_bound');
  assert.equal(result.readiness, 'review_bound');
  assert.equal(result.nextAction.id, 'analyze');
}

{
  const result = evaluatePreflight(base({
    matrix: {
      requiresHumanReview: true,
      humanReviewReason: 'Runoff is still unknown.',
      decisionSupport: {
        status: 'review_required',
        nextBestAction: {
          category: 'runoff',
          prompt: 'Show me where wash water would naturally run.',
          reason: 'Runoff path is unknown.',
          priority: 'high'
        },
        quoteIntegrity: { issues: [] },
        crew: { ready: false }
      }
    }
  }));
  assert.equal(result.state, 'evidence_followup');
  assert.equal(result.nextAction.id, 'followup');
  assert.equal(result.blockers[0], 'Show me where wash water would naturally run.');
}

{
  const result = evaluatePreflight(base({
    matrix: {
      requiresHumanReview: true,
      humanReviewReason: 'Quantity failed validation.',
      decisionSupport: {
        status: 'review_required',
        nextBestAction: null,
        quoteIntegrity: {
          issues: [{ code: 'INVALID_QUANTITY', message: 'Driveway needs a usable quantity before it can be priced.' }]
        },
        crew: { ready: false }
      }
    }
  }));
  assert.equal(result.state, 'manual_review');
  assert.equal(result.nextAction.id, 'review');
  assert.equal(result.blockers.some(item => /usable quantity/i.test(item)), true);
}

{
  const result = evaluatePreflight(base({
    matrix: {
      requiresHumanReview: false,
      decisionSupport: {
        status: 'field_ready',
        quoteIntegrity: { issues: [] },
        crew: { ready: true }
      }
    }
  }));
  assert.equal(result.state, 'crew_ready');
  assert.equal(result.readiness, 'field_ready');
  assert.equal(result.nextAction.id, 'crew');
}

{
  const result = evaluatePreflight(base({
    matrix: {
      requiresHumanReview: false,
      decisionSupport: {
        status: 'field_ready',
        quoteIntegrity: { issues: [] },
        crew: { ready: false }
      }
    }
  }));
  assert.equal(result.state, 'review_quote');
  assert.equal(result.nextAction.id, 'review');
}

console.log('Schism workflow preflight QA passed');
