(function (root, factory) {
  'use strict';

  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  root.SchismRevisionIntelligence = api;
  if (root.document) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { api.initBrowser(); });
    } else {
      api.initBrowser();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SESSION_KEY = 'schismmatrix_revision_history_v1';
  var MAX_HISTORY = 12;
  var currentRevision = null;

  function cleanText(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max || 400) : '';
  }

  function finiteNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' && !value.trim()) return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function round(value, places) {
    var factor = Math.pow(10, places || 0);
    return Math.round(((Number(value) || 0) + Number.EPSILON) * factor) / factor;
  }

  function normalizeAddress(value) {
    return cleanText(value, 220)
      .toLowerCase()
      .replace(/[^a-z0-9\s#-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeService(service) {
    if (!service || typeof service !== 'object') return null;
    var serviceId = cleanText(service.serviceId, 80);
    if (!serviceId) return null;
    return {
      serviceId,
      label: cleanText(service.label, 120) || serviceId,
      quantity: finiteNumber(service.quantity),
      quantityUnit: cleanText(service.quantityUnit, 40),
      price: finiteNumber(service.calculatedPrice)
    };
  }

  function hazardKey(hazard) {
    if (!hazard) return '';
    if (typeof hazard === 'string') return cleanText(hazard, 220).toLowerCase();
    return [
      cleanText(hazard.hazard || hazard.label || hazard.type, 140),
      cleanText(hazard.action || hazard.mitigation, 180)
    ].filter(Boolean).join(' | ').toLowerCase();
  }

  function summarizeMatrix(matrix, meta) {
    matrix = matrix && typeof matrix === 'object' ? matrix : {};
    meta = meta && typeof meta === 'object' ? meta : {};
    var decision = matrix.decisionSupport && typeof matrix.decisionSupport === 'object'
      ? matrix.decisionSupport
      : {};
    var services = (Array.isArray(matrix.services) ? matrix.services : []).map(normalizeService).filter(Boolean);
    var total = finiteNumber(decision.pricing && decision.pricing.estimatedTotal);
    if (total === null) {
      total = services.reduce(function (sum, service) {
        return sum + (finiteNumber(service.price) || 0);
      }, 0);
    }

    var hazards = (Array.isArray(matrix.hazards) ? matrix.hazards : [])
      .map(hazardKey)
      .filter(Boolean);

    var review = matrix.evidenceReview && typeof matrix.evidenceReview === 'object'
      ? matrix.evidenceReview
      : {};
    var nextBest = decision.nextBestAction && typeof decision.nextBestAction === 'object'
      ? cleanText(decision.nextBestAction.prompt, 260)
      : '';

    return {
      address: normalizeAddress(meta.address),
      recordedAt: cleanText(meta.recordedAt, 80) || new Date().toISOString(),
      photoCount: Math.max(0, Number(meta.photoCount) || 0),
      requestedServices: Array.isArray(meta.requestedServices) ? meta.requestedServices.filter(Boolean) : [],
      services,
      total: round(total || 0, 2),
      reviewStatus: cleanText(decision.status, 50) || (matrix.requiresHumanReview ? 'review_required' : 'unknown'),
      requiresHumanReview: matrix.requiresHumanReview === true,
      crewReady: Boolean(decision.crew && decision.crew.ready),
      evidenceStrength: cleanText(decision.evidence && decision.evidence.strength, 40) || 'unknown',
      nextBestAction: nextBest,
      missingCount: Array.isArray(review.missingEvidence) ? review.missingEvidence.length : 0,
      uncertainCount: Array.isArray(review.uncertainEvidence) ? review.uncertainEvidence.length : 0,
      hazards
    };
  }

  function compareRevisions(previous, current) {
    if (!previous || !current) return null;

    var previousServices = {};
    var currentServices = {};
    previous.services.forEach(function (service) { previousServices[service.serviceId] = service; });
    current.services.forEach(function (service) { currentServices[service.serviceId] = service; });

    var added = Object.keys(currentServices).filter(function (id) { return !previousServices[id]; });
    var removed = Object.keys(previousServices).filter(function (id) { return !currentServices[id]; });
    var changed = Object.keys(currentServices).filter(function (id) {
      var before = previousServices[id];
      var after = currentServices[id];
      if (!before || !after) return false;
      var priceDelta = Math.abs((finiteNumber(after.price) || 0) - (finiteNumber(before.price) || 0));
      var qtyBefore = finiteNumber(before.quantity);
      var qtyAfter = finiteNumber(after.quantity);
      var qtyChanged = qtyBefore !== qtyAfter && !(qtyBefore === null && qtyAfter === null);
      return priceDelta >= 0.01 || qtyChanged || before.quantityUnit !== after.quantityUnit;
    }).map(function (id) {
      var before = previousServices[id];
      var after = currentServices[id];
      return {
        serviceId: id,
        label: after.label || before.label || id,
        previousPrice: round(finiteNumber(before.price) || 0, 2),
        currentPrice: round(finiteNumber(after.price) || 0, 2),
        priceDelta: round((finiteNumber(after.price) || 0) - (finiteNumber(before.price) || 0), 2),
        previousQuantity: finiteNumber(before.quantity),
        currentQuantity: finiteNumber(after.quantity),
        quantityUnit: after.quantityUnit || before.quantityUnit || ''
      };
    });

    var previousHazards = new Set(previous.hazards || []);
    var currentHazards = new Set(current.hazards || []);
    var hazardsAdded = Array.from(currentHazards).filter(function (key) { return !previousHazards.has(key); });
    var hazardsRemoved = Array.from(previousHazards).filter(function (key) { return !currentHazards.has(key); });

    var totalDelta = round((current.total || 0) - (previous.total || 0), 2);
    var totalDeltaPct = previous.total > 0 ? round((totalDelta / previous.total) * 100, 1) : null;
    var photoDelta = current.photoCount - previous.photoCount;
    var evidenceChanged = photoDelta !== 0;
    var statusChanged = previous.reviewStatus !== current.reviewStatus;
    var crewChanged = previous.crewReady !== current.crewReady;
    var evidenceStrengthChanged = previous.evidenceStrength !== current.evidenceStrength;
    var nextBestChanged = previous.nextBestAction !== current.nextBestAction;
    var reviewLoadDelta = (current.missingCount + current.uncertainCount) - (previous.missingCount + previous.uncertainCount);

    var explanations = [];
    if (added.length) explanations.push(added.length + ' service' + (added.length === 1 ? '' : 's') + ' added.');
    if (removed.length) explanations.push(removed.length + ' service' + (removed.length === 1 ? '' : 's') + ' removed.');
    if (totalDelta !== 0) explanations.push('Matrix estimate changed ' + (totalDelta > 0 ? '+' : '') + '$' + Math.abs(totalDelta).toFixed(2) + (totalDeltaPct === null ? '.' : ' (' + (totalDeltaPct > 0 ? '+' : '') + totalDeltaPct.toFixed(1) + '%).'));
    if (hazardsAdded.length) explanations.push(hazardsAdded.length + ' new hazard' + (hazardsAdded.length === 1 ? '' : 's') + ' identified.');
    if (statusChanged) explanations.push('Review state changed from ' + previous.reviewStatus.replace(/_/g, ' ') + ' to ' + current.reviewStatus.replace(/_/g, ' ') + '.');
    if (evidenceStrengthChanged) explanations.push('Evidence strength changed from ' + previous.evidenceStrength + ' to ' + current.evidenceStrength + '.');
    if (reviewLoadDelta < 0) explanations.push(Math.abs(reviewLoadDelta) + ' evidence uncertainty item' + (Math.abs(reviewLoadDelta) === 1 ? '' : 's') + ' resolved.');
    if (reviewLoadDelta > 0) explanations.push(reviewLoadDelta + ' new evidence uncertainty item' + (reviewLoadDelta === 1 ? '' : 's') + ' appeared.');

    var materialPriceChange = totalDeltaPct !== null && Math.abs(totalDeltaPct) >= 10;
    var sameEvidenceMaterialDrift = !evidenceChanged && (added.length > 0 || removed.length > 0 || materialPriceChange || statusChanged || crewChanged);
    var critical = (previous.crewReady && !current.crewReady) || hazardsAdded.length > 0 || (previous.requiresHumanReview === false && current.requiresHumanReview === true) || sameEvidenceMaterialDrift;
    var material = critical || added.length > 0 || removed.length > 0 || materialPriceChange || statusChanged || crewChanged;

    var severity = critical ? 'critical' : material ? 'material' : (changed.length || hazardsRemoved.length || nextBestChanged || evidenceStrengthChanged ? 'minor' : 'none');

    if (sameEvidenceMaterialDrift) {
      explanations.unshift('Analysis changed materially without a new photo-count signal. Treat this as a consistency concern and review before release.');
    }

    return {
      version: 1,
      severity,
      material,
      critical,
      sameEvidenceMaterialDrift,
      evidenceChanged,
      photoDelta,
      totalDelta,
      totalDeltaPct,
      servicesAdded: added.map(function (id) { return currentServices[id]; }),
      servicesRemoved: removed.map(function (id) { return previousServices[id]; }),
      servicesChanged: changed,
      hazardsAdded,
      hazardsRemoved,
      review: {
        previousStatus: previous.reviewStatus,
        currentStatus: current.reviewStatus,
        statusChanged,
        previousCrewReady: previous.crewReady,
        currentCrewReady: current.crewReady,
        crewChanged,
        previousEvidenceStrength: previous.evidenceStrength,
        currentEvidenceStrength: current.evidenceStrength,
        evidenceStrengthChanged,
        nextBestChanged,
        reviewLoadDelta
      },
      explanations
    };
  }

  function readSession() {
    if (typeof window === 'undefined' || !window.sessionStorage) return [];
    try {
      var raw = window.sessionStorage.getItem(SESSION_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeSession(history) {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
    } catch (error) {}
  }

  function findPrevious(address, history) {
    var normalized = normalizeAddress(address);
    if (!normalized) return history[0] || null;
    return history.find(function (item) { return item && item.address === normalized; }) || null;
  }

  function capture(matrix, meta) {
    meta = meta && typeof meta === 'object' ? meta : {};
    var current = summarizeMatrix(matrix, meta);
    var history = readSession();
    var previous = findPrevious(meta.address, history);
    currentRevision = previous ? compareRevisions(previous, current) : null;
    var next = [current].concat(history.filter(function (item) {
      return !(item && current.address && item.address === current.address);
    })).slice(0, MAX_HISTORY);
    writeSession(next);

    if (typeof document !== 'undefined') {
      renderBrowser();
      document.dispatchEvent(new CustomEvent('schism:revision-changed', { detail: currentRevision }));
    }

    return currentRevision;
  }

  function seed(matrix, meta) {
    meta = meta && typeof meta === 'object' ? meta : {};
    var current = summarizeMatrix(matrix, meta);
    var history = readSession();
    var next = [current].concat(history.filter(function (item) {
      return !(item && current.address && item.address === current.address);
    })).slice(0, MAX_HISTORY);
    writeSession(next);
    currentRevision = null;
    if (typeof document !== 'undefined') renderBrowser();
    return current;
  }

  function getCurrentRevision() {
    return currentRevision;
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character];
    });
  }

  function money(value) {
    var number = finiteNumber(value);
    if (number === null) return '—';
    return (number > 0 ? '+' : number < 0 ? '−' : '') + '$' + Math.abs(number).toFixed(2);
  }

  function ensureStyles() {
    if (document.getElementById('schismRevisionStyles')) return;
    var style = document.createElement('style');
    style.id = 'schismRevisionStyles';
    style.textContent = [
      '.schism-revision{display:none;margin:0 0 14px;padding:15px;border:1px solid rgba(93,235,245,.18);border-radius:15px;background:linear-gradient(145deg,rgba(6,26,35,.96),rgba(3,13,21,.98))}.schism-revision.is-visible{display:block}.schism-revision[data-severity="material"]{border-color:rgba(99,211,225,.34)}.schism-revision[data-severity="critical"]{border-color:rgba(214,176,107,.38)}',
      '.schism-revision-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.schism-revision-kicker{color:#63eaf4;font-size:8px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.schism-revision h3{margin:5px 0 0;color:#effcff;font-size:16px}.schism-revision-badge{padding:6px 9px;border:1px solid rgba(93,235,245,.22);border-radius:999px;color:#bdf9ff;background:rgba(93,235,245,.055);font-size:8px;font-weight:950;text-transform:uppercase}.schism-revision[data-severity="critical"] .schism-revision-badge{border-color:rgba(214,176,107,.3);color:#e5c98e;background:rgba(214,176,107,.055)}',
      '.schism-revision-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:11px}.schism-revision-stat{padding:9px;border:1px solid rgba(93,235,245,.1);border-radius:10px;background:rgba(1,12,19,.58)}.schism-revision-stat span{display:block;color:#728f99;font-size:8px;font-weight:900;text-transform:uppercase}.schism-revision-stat strong{display:block;margin-top:4px;color:#effcff;font-size:11px}',
      '.schism-revision-list{display:grid;gap:6px;margin-top:10px}.schism-revision-item{padding:8px 10px;border:1px solid rgba(93,235,245,.09);border-radius:9px;color:#a9c0c8;background:rgba(1,12,18,.48);font-size:9px;line-height:1.45}.schism-revision-item.alert{border-color:rgba(214,176,107,.2);color:#dac493}.schism-revision-note{margin-top:9px;color:#718b94;font-size:8px;line-height:1.45}',
      '@media(max-width:560px){.schism-revision-grid{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureMount() {
    var results = document.getElementById('resultsMount');
    if (!results) return null;
    var existing = document.getElementById('schismRevisionWatch');
    if (existing) return existing;
    var section = document.createElement('section');
    section.id = 'schismRevisionWatch';
    section.className = 'schism-revision';
    results.insertBefore(section, results.firstChild);
    return section;
  }

  function renderBrowser() {
    if (typeof document === 'undefined') return;
    ensureStyles();
    var mount = ensureMount();
    if (!mount) return;

    var revision = currentRevision;
    if (!revision || revision.severity === 'none') {
      mount.classList.remove('is-visible');
      mount.innerHTML = '';
      return;
    }

    mount.classList.add('is-visible');
    mount.setAttribute('data-severity', revision.severity);

    var serviceDelta = revision.servicesAdded.length - revision.servicesRemoved.length;
    var reviewLabel = revision.review.statusChanged
      ? revision.review.previousStatus.replace(/_/g, ' ') + ' → ' + revision.review.currentStatus.replace(/_/g, ' ')
      : revision.review.currentStatus.replace(/_/g, ' ');

    var items = revision.explanations.slice(0, 5).map(function (message, index) {
      return '<div class="schism-revision-item' + (revision.critical && index === 0 ? ' alert' : '') + '">' + escapeHtml(message) + '</div>';
    }).join('');

    mount.innerHTML =
      '<div class="schism-revision-head"><div><div class="schism-revision-kicker">Revision Watch</div><h3>What changed after re-analysis</h3></div><span class="schism-revision-badge">' +
      escapeHtml(revision.severity) + '</span></div>' +
      '<div class="schism-revision-grid">' +
        '<div class="schism-revision-stat"><span>Estimate delta</span><strong>' + escapeHtml(money(revision.totalDelta)) + (revision.totalDeltaPct === null ? '' : ' · ' + escapeHtml((revision.totalDeltaPct > 0 ? '+' : '') + revision.totalDeltaPct.toFixed(1) + '%')) + '</strong></div>' +
        '<div class="schism-revision-stat"><span>Scope delta</span><strong>' + escapeHtml((serviceDelta > 0 ? '+' : '') + String(serviceDelta)) + ' services</strong></div>' +
        '<div class="schism-revision-stat"><span>Review state</span><strong>' + escapeHtml(reviewLabel) + '</strong></div>' +
      '</div>' +
      (items ? '<div class="schism-revision-list">' + items + '</div>' : '') +
      '<div class="schism-revision-note">Revision Watch is advisory only. A material change never edits pricing or approval state by itself.</div>';
  }

  function initBrowser() {
    if (typeof document === 'undefined') return;
    ensureStyles();
    ensureMount();
    document.addEventListener('schism:workspace-changed', renderBrowser);
    renderBrowser();
  }

  return {
    SESSION_KEY,
    MAX_HISTORY,
    normalizeAddress,
    summarizeMatrix,
    compareRevisions,
    capture,
    seed,
    getCurrentRevision,
    initBrowser,
    render: renderBrowser
  };
});
