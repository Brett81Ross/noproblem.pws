(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SchismReleaseContract = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA_VERSION = 2;
  var ACTIVE_STATUS = 'released';
  var EXCLUDED_SERVICE_IDS = Object.freeze({
    roof_soft_wash: true,
    gutter_cleaning: true,
    gutter_brightening: true
  });

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(function (item) {
      return stableStringify(item === undefined ? null : item);
    }).join(',') + ']';
    return '{' + Object.keys(value).filter(function (key) {
      return value[key] !== undefined;
    }).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stableStringify(value[key]);
    }).join(',') + '}';
  }

  function hashText(value) {
    var text = String(value || '');
    var hash = 2166136261;
    for (var index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return ('00000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function computeReleaseFingerprint(snapshot) {
    var payload = clone(snapshot || {});
    delete payload.integrityFingerprint;
    return 'fnv1a32:' + hashText(stableStringify(payload));
  }

  function selectedServicesByScopeIds(services, selectedScopeItemIds) {
    var selected = new Set(Array.isArray(selectedScopeItemIds) ? selectedScopeItemIds : []);
    return (Array.isArray(services) ? services : []).filter(function (service) {
      return service && typeof service.scopeItemId === 'string' && selected.has(service.scopeItemId);
    });
  }

  function validateRelease(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
      return { ok: false, code: 'release_missing', reason: 'No device release is available.' };
    }
    if (snapshot.schemaVersion !== SCHEMA_VERSION) {
      return { ok: false, code: 'schema_unsupported', reason: 'This device release uses an unsupported schema version.' };
    }
    if (typeof snapshot.releaseId !== 'string' || !snapshot.releaseId.trim()) {
      return { ok: false, code: 'release_id_missing', reason: 'The release ID is missing.' };
    }
    if (typeof snapshot.estimateId !== 'string' || !snapshot.estimateId.trim()) {
      return { ok: false, code: 'estimate_id_missing', reason: 'The estimate identity is missing.' };
    }
    if (!Number.isInteger(snapshot.estimateRevision) || snapshot.estimateRevision < 1) {
      return { ok: false, code: 'estimate_revision_invalid', reason: 'The estimate revision is invalid.' };
    }
    var expectedRevisionId = snapshot.estimateId + ':r' + snapshot.estimateRevision;
    if (snapshot.estimateRevisionId !== expectedRevisionId) {
      return { ok: false, code: 'estimate_revision_mismatch', reason: 'The release is not bound to the expected estimate revision.' };
    }
    if (typeof snapshot.releasedAt !== 'string' || Number.isNaN(Date.parse(snapshot.releasedAt))) {
      return { ok: false, code: 'released_at_invalid', reason: 'The release timestamp is invalid.' };
    }
    if (snapshot.deviceAuthority !== 'local') {
      return { ok: false, code: 'authority_invalid', reason: 'The device release authority marker is invalid.' };
    }

    var matrix = snapshot.matrixData;
    if (!matrix || typeof matrix !== 'object' || Array.isArray(matrix)) {
      return { ok: false, code: 'matrix_missing', reason: 'The released field plan is missing.' };
    }
    var matrixMeta = matrix.__schismEstimate;
    if (!matrixMeta || matrixMeta.estimateId !== snapshot.estimateId || matrixMeta.revision !== snapshot.estimateRevision) {
      return { ok: false, code: 'matrix_revision_mismatch', reason: 'The field plan does not match the released estimate revision.' };
    }
    if (matrix.requiresHumanReview === true) {
      return { ok: false, code: 'human_review_required', reason: matrix.humanReviewReason || 'Human review is still required.' };
    }
    if (!matrix.evidenceReview || matrix.evidenceReview.readyForEstimate !== true) {
      return { ok: false, code: 'evidence_not_ready', reason: 'Evidence review is not explicitly ready for release.' };
    }
    if (!Array.isArray(matrix.services) || !matrix.services.length) {
      return { ok: false, code: 'scope_missing', reason: 'The release contains no executable scope.' };
    }

    var ids = [];
    var seen = Object.create(null);
    for (var index = 0; index < matrix.services.length; index += 1) {
      var service = matrix.services[index];
      if (!service || typeof service.serviceId !== 'string' || !service.serviceId.trim()) {
        return { ok: false, code: 'service_id_missing', reason: 'A released scope item is missing its service ID.' };
      }
      if (EXCLUDED_SERVICE_IDS[service.serviceId]) {
        return { ok: false, code: 'excluded_service', reason: 'The release contains work outside the launch operating boundary.' };
      }
      if (typeof service.scopeItemId !== 'string' || !service.scopeItemId.trim()) {
        return { ok: false, code: 'scope_item_id_missing', reason: 'A released scope item is missing its immutable scope ID.' };
      }
      if (seen[service.scopeItemId]) {
        return { ok: false, code: 'scope_item_id_duplicate', reason: 'The release contains duplicate scope IDs.' };
      }
      seen[service.scopeItemId] = true;
      ids.push(service.scopeItemId);
    }

    if (!Array.isArray(snapshot.selectedScopeItemIds) || !snapshot.selectedScopeItemIds.length) {
      return { ok: false, code: 'selected_scope_missing', reason: 'The release does not identify the approved scope.' };
    }
    var selected = snapshot.selectedScopeItemIds.slice().sort();
    var releasedIds = ids.slice().sort();
    if (stableStringify(selected) !== stableStringify(releasedIds)) {
      return { ok: false, code: 'selected_scope_mismatch', reason: 'The approved scope IDs do not match the released field plan.' };
    }

    if (!Array.isArray(snapshot.evidence)) {
      return { ok: false, code: 'evidence_snapshot_missing', reason: 'The release evidence snapshot is missing.' };
    }

    if (typeof snapshot.integrityFingerprint !== 'string' || !snapshot.integrityFingerprint) {
      return { ok: false, code: 'integrity_missing', reason: 'The release integrity fingerprint is missing.' };
    }
    if (computeReleaseFingerprint(snapshot) !== snapshot.integrityFingerprint) {
      return { ok: false, code: 'integrity_mismatch', reason: 'The device release failed its integrity check.' };
    }

    if (!Number.isSafeInteger(snapshot.approvedTotalCents) || snapshot.approvedTotalCents < 0 ||
        snapshot.approvedTotal !== '$' + (snapshot.approvedTotalCents / 100).toFixed(2)) {
      return { ok: false, code: 'approved_total_invalid', reason: 'The approved total is missing or inconsistent.' };
    }
    // New approvals freeze line-item prices as well as their grand total.
    // The ledger is optional for prior schema-v2 device records, so previously
    // saved releases are still readable and subject to their existing checks.
    if (snapshot.approvedScopePrices !== undefined) {
      var prices = snapshot.approvedScopePrices;
      if (!Array.isArray(prices) || prices.length !== matrix.services.length) {
        return { ok: false, code: 'price_basis_missing', reason: 'The released line-item price ledger is incomplete.' };
      }
      var expectedPrices = Object.create(null);
      matrix.services.forEach(function (service) { expectedPrices[service.scopeItemId] = service.serviceId; });
      var seenPrices = Object.create(null);
      var priceSum = 0;
      for (var priceIndex = 0; priceIndex < prices.length; priceIndex += 1) {
        var line = prices[priceIndex];
        if (!line || typeof line.scopeItemId !== 'string' ||
            !Object.prototype.hasOwnProperty.call(expectedPrices, line.scopeItemId) ||
            seenPrices[line.scopeItemId] || line.serviceId !== expectedPrices[line.scopeItemId] ||
            !Number.isSafeInteger(line.priceCents) || line.priceCents < 0) {
          return { ok: false, code: 'price_basis_mismatch', reason: 'A released line-item price is invalid or assigned to the wrong service.' };
        }
        seenPrices[line.scopeItemId] = true;
        priceSum += line.priceCents;
        if (!Number.isSafeInteger(priceSum)) {
          return { ok: false, code: 'price_basis_mismatch', reason: 'Released line-item prices exceed the supported range.' };
        }
      }
      if (priceSum !== snapshot.approvedTotalCents) {
        return { ok: false, code: 'price_totals_mismatch', reason: 'Released line-item prices do not equal the approved total.' };
      }
    }
    var basis = snapshot.workBasis;
    if (!basis || !Array.isArray(basis.services) || basis.services.length !== matrix.services.length ||
        !Number.isFinite(basis.totalEstimatedMinutes) || !Number.isFinite(basis.totalWaterUsageGallons)) {
      return { ok: false, code: 'work_basis_missing', reason: 'The frozen work and water basis is incomplete.' };
    }
    var expectedMinutes = 0;
    var expectedWater = 0;
    for (var workIndex = 0; workIndex < matrix.services.length; workIndex += 1) {
      var item = matrix.services[workIndex];
      var frozen = basis.services[workIndex];
      if (!Number.isFinite(item.estimatedTimeMinutes) || item.estimatedTimeMinutes < 0 ||
          !Number.isFinite(item.waterUsageGallons) || item.waterUsageGallons < 0 ||
          !frozen || frozen.scopeItemId !== item.scopeItemId ||
          frozen.estimatedTimeMinutes !== item.estimatedTimeMinutes ||
          frozen.waterUsageGallons !== item.waterUsageGallons) {
        return { ok: false, code: 'work_basis_mismatch', reason: 'Released scope time or water differs from its frozen basis.' };
      }
      expectedMinutes += item.estimatedTimeMinutes;
      expectedWater += item.waterUsageGallons;
    }
    if (basis.totalEstimatedMinutes !== Math.round(expectedMinutes) ||
        basis.totalWaterUsageGallons !== Math.round(expectedWater) ||
        !matrix.fieldPlan ||
        matrix.fieldPlan.totalEstimatedMinutes !== basis.totalEstimatedMinutes ||
        matrix.fieldPlan.totalWaterUsageGallons !== basis.totalWaterUsageGallons) {
      return { ok: false, code: 'work_totals_mismatch', reason: 'Released time or water totals do not match approved scope.' };
    }

    if (snapshot.status !== ACTIVE_STATUS) {
      return {
        ok: false,
        code: snapshot.status === 'superseded' ? 'release_superseded' : 'release_not_active',
        reason: snapshot.status === 'superseded'
          ? (snapshot.supersededReason || 'The estimate changed after release. Re-release is required.')
          : 'The device release is not active.'
      };
    }

    return { ok: true, code: 'ok', reason: '' };
  }

  function markSuperseded(snapshot, reason, timestamp) {
    var next = clone(snapshot || {});
    next.status = 'superseded';
    next.supersededAt = timestamp || new Date().toISOString();
    next.supersededReason = String(reason || 'The estimate changed after release. Re-release is required.').slice(0, 240);
    next.integrityFingerprint = computeReleaseFingerprint(next);
    return next;
  }

  return Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION,
    ACTIVE_STATUS: ACTIVE_STATUS,
    EXCLUDED_SERVICE_IDS: EXCLUDED_SERVICE_IDS,
    stableStringify: stableStringify,
    hashText: hashText,
    computeReleaseFingerprint: computeReleaseFingerprint,
    selectedServicesByScopeIds: selectedServicesByScopeIds,
    validateRelease: validateRelease,
    markSuperseded: markSuperseded
  });
});
