const assert = require('assert');
const release = require('../schism-release-contract');

function baseSnapshot() {
  const snapshot = {
    schemaVersion: 2,
    releaseId: 'release_test_1',
    status: 'released',
    deviceAuthority: 'local',
    releasedAt: '2026-10-12T13:00:00.000Z',
    estimateId: 'estimate_test_1',
    estimateRevision: 2,
    estimateRevisionId: 'estimate_test_1:r2',
    jobName: 'Test property',
    jobAddress: '123 Test St',
    approvedTotal: '$325.00',
    approvedTotalCents: 32500,
    workBasis: {services:[{scopeItemId:'scope_house',estimatedTimeMinutes:60,waterUsageGallons:120},{scopeItemId:'scope_driveway',estimatedTimeMinutes:45,waterUsageGallons:90}],totalEstimatedMinutes:105,totalWaterUsageGallons:210},
    selectedScopeItemIds: ['scope_driveway', 'scope_house'],
    evidence: [
      { evidenceId: 'ev_1', kind: 'photo', source: 'operator_upload', capturedAt: '2026-10-12T12:00:00.000Z' }
    ],
    matrixData: {
      __schismEstimate: { estimateId: 'estimate_test_1', revision: 2, createdAt: '2026-10-12T12:00:00.000Z', updatedAt: '2026-10-12T12:30:00.000Z', jobKey: 'test property|123 test st' },
      requiresHumanReview: false,
      evidenceReview: { readyForEstimate: true, missingEvidence: [], uncertainEvidence: [] },
      services: [
        { scopeItemId: 'scope_house', serviceId: 'house_wash', calculatedPrice: 200, estimatedTimeMinutes: 60, waterUsageGallons:120 },
        { scopeItemId: 'scope_driveway', serviceId: 'driveway_cleaning', calculatedPrice: 125, estimatedTimeMinutes: 45, waterUsageGallons:90 }
      ],
      fieldPlan: { totalEstimatedMinutes:105,totalWaterUsageGallons:210,totalEstimatedHours: '1.8 Hours', crewSizeRecommended: 1, difficulty: 'moderate' }
    }
  };
  snapshot.integrityFingerprint = release.computeReleaseFingerprint(snapshot);
  return snapshot;
}

{
  const snapshot = baseSnapshot();
  assert.equal(release.validateRelease(snapshot).ok, true, 'valid release should pass');
}

{
  const services = baseSnapshot().matrixData.services.slice().reverse();
  const selected = release.selectedServicesByScopeIds(services, ['scope_driveway']);
  assert.equal(selected.length, 1, 'ID-based selection should return one service');
  assert.equal(selected[0].serviceId, 'driveway_cleaning', 'service reorder must not change selected scope');
}

{
  const snapshot = baseSnapshot();
  snapshot.schemaVersion = 99;
  snapshot.integrityFingerprint = release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code, 'schema_unsupported', 'unknown schema must fail closed');
}

{
  const snapshot = baseSnapshot();
  snapshot.matrixData.requiresHumanReview = true;
  snapshot.matrixData.humanReviewReason = 'Manual review required';
  snapshot.integrityFingerprint = release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code, 'human_review_required', 'human review must block restore');
}

{
  const snapshot = baseSnapshot();
  snapshot.matrixData.evidenceReview.readyForEstimate = false;
  snapshot.integrityFingerprint = release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code, 'evidence_not_ready', 'evidence uncertainty must block restore');
}

{
  const snapshot = baseSnapshot();
  snapshot.approvedTotal = '$9999.00';
  assert.equal(release.validateRelease(snapshot).code, 'integrity_mismatch', 'tampered local release must fail its fingerprint');
}

{
  const snapshot = baseSnapshot();
  delete snapshot.matrixData.services[0].scopeItemId;
  snapshot.integrityFingerprint = release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code, 'scope_item_id_missing', 'scope items without immutable IDs must fail');
}

{
  const snapshot = baseSnapshot();
  snapshot.matrixData.services[0].serviceId = 'roof_soft_wash';
  snapshot.integrityFingerprint = release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code, 'excluded_service', 'excluded launch work must never restore as field ready');
}

{
  const snapshot = baseSnapshot();
  const superseded = release.markSuperseded(snapshot, 'Scope changed after release', '2026-10-12T14:00:00.000Z');
  assert.equal(release.computeReleaseFingerprint(superseded), superseded.integrityFingerprint, 'superseded release fingerprint should be internally consistent');
  assert.equal(release.validateRelease(superseded).code, 'release_superseded', 'superseded release must require re-release');
}

{
  const snapshot = baseSnapshot();
  snapshot.selectedScopeItemIds = ['scope_house'];
  snapshot.integrityFingerprint = release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code, 'selected_scope_mismatch', 'released matrix must exactly match approved scope IDs');
}


{
  const snapshot = baseSnapshot();
  snapshot.matrixData.__schismEstimate.revision = 3;
  snapshot.integrityFingerprint = release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code, 'matrix_revision_mismatch', 'matrix revision must match released revision');
}

{
  const snapshot=baseSnapshot();
  snapshot.status='unknown';
  snapshot.integrityFingerprint=release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code,'release_not_active','unknown status must fail closed');
}
{
  const snapshot=baseSnapshot();
  delete snapshot.status;
  snapshot.integrityFingerprint=release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code,'release_not_active','missing status must fail closed');
}
{
  const snapshot=baseSnapshot();
  snapshot.workBasis.services[0].waterUsageGallons=999;
  snapshot.integrityFingerprint=release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code,'work_basis_mismatch','frozen water drift must be blocked');
}
{
  const snapshot=baseSnapshot();
  snapshot.approvedTotalCents=32501;
  snapshot.integrityFingerprint=release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code,'approved_total_invalid','approved price inconsistency must block');
}
{
  const snapshot=baseSnapshot();
  snapshot.matrixData.services[1].estimatedTimeMinutes=undefined;
  snapshot.integrityFingerprint=release.computeReleaseFingerprint(snapshot);
  assert.equal(release.validateRelease(snapshot).code,'work_basis_mismatch','missing time must block');
}
console.log('Schism release contract QA passed');
