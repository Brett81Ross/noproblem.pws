(function () {
  'use strict';

  var PHOTO_TARGETS = {
    house_wash: 4,
    driveway_cleaning: 2,
    sidewalk_cleaning: 2,
    patio_cleaning: 2,
    deck_cleaning: 2,
    fence_cleaning: 2,
    retaining_wall: 2,
    dumpster_pad: 2,
    oil_treatment: 2,
    roof_soft_wash: 3,
    memorial_cleaning: 2,
    vehicle_wash: 2,
    aircraft_exterior_wash: 3,
    custom_area: 2
  };

  var FIELD_RULES = {
    house_wash: [['surfaceMaterial', 'exterior material']],
    driveway_cleaning: [['lengthFeet', 'length'], ['widthFeet', 'width']],
    sidewalk_cleaning: [['lengthFeet', 'total length'], ['widthFeet', 'width']],
    patio_cleaning: [['lengthFeet', 'length'], ['widthFeet', 'width']],
    deck_cleaning: [['lengthFeet', 'length'], ['widthFeet', 'width'], ['material', 'material']],
    fence_cleaning: [['linearFeet', 'total fence length'], ['material', 'material'], ['sides', 'side or sides to clean']],
    retaining_wall: [['lengthFeet', 'length'], ['heightFeet', 'average height']],
    dumpster_pad: [['containerCount', 'container count'], ['padSize', 'pad size']],
    roof_soft_wash: [['roofMaterial', 'roof material']],
    memorial_cleaning: [['markerCount', 'marker count'], ['material', 'stone material']],
    vehicle_wash: [['vehicleCount', 'vehicle count'], ['vehicleTypes', 'vehicle types']],
    aircraft_exterior_wash: [['aircraftCount', 'aircraft count'], ['aircraftType', 'aircraft type'], ['facilityApproval', 'facility approval']],
    custom_area: [['areaName', 'area name'], ['dimensions', 'dimensions or quantity']]
  };

  var renderQueued = false;
  var decoratingResults = false;

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function installStyles() {
    if (document.getElementById('npAccuracyReviewStyles')) return;
    var style = document.createElement('style');
    style.id = 'npAccuracyReviewStyles';
    style.textContent = [
      '.np-accuracy-check{margin:0 0 14px;padding:14px;border:1px solid rgba(171,255,79,.24);border-radius:16px;background:linear-gradient(145deg,rgba(11,35,31,.92),rgba(12,13,30,.94));box-shadow:0 12px 34px rgba(0,0,0,.16)}',
      '.np-accuracy-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.np-accuracy-head h3{margin:0;color:#f2fcff;font-size:17px}.np-accuracy-head p{margin:5px 0 0;color:#8ba8b2;font-size:11px;line-height:1.45}',
      '.np-accuracy-score{display:grid;min-width:58px;height:58px;place-items:center;border:1px solid rgba(171,255,79,.35);border-radius:50%;color:#caff8b;background:rgba(171,255,79,.08);font-size:18px;font-weight:950}.np-accuracy-score span{font-size:8px}',
      '.np-accuracy-meter{height:7px;margin:12px 0 10px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.07)}.np-accuracy-meter span{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#ffc857,#64e6ef 58%,#abff4f)}',
      '.np-accuracy-status{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.np-accuracy-status strong{color:#e9fbff;font-size:12px}.np-accuracy-status span{color:#8eaab4;font-size:9px;text-align:right}',
      '.np-accuracy-list{display:grid;gap:7px}.np-accuracy-item{display:grid;grid-template-columns:1fr auto;align-items:center;gap:9px;padding:9px 10px;border:1px solid rgba(255,200,87,.18);border-radius:11px;background:rgba(2,14,21,.64)}.np-accuracy-item.is-critical{border-color:rgba(255,132,112,.3)}.np-accuracy-item strong{display:block;color:#dff8ff;font-size:10px}.np-accuracy-item span{display:block;margin-top:3px;color:#7f9da8;font-size:9px;line-height:1.35}',
      '.np-accuracy-fix{min-height:36px;padding:7px 10px;border:1px solid rgba(101,226,240,.3);border-radius:9px;color:#061119;background:linear-gradient(135deg,#9af7ff,#61dce9);font-size:9px;font-weight:950}.np-accuracy-clear{padding:10px;border:1px solid rgba(171,255,79,.2);border-radius:11px;color:#caff8b;background:rgba(171,255,79,.06);font-size:10px;font-weight:850}.np-accuracy-foot{margin:8px 0 0;color:#698994;font-size:8px;text-align:center}',
      '.np-quote-review{margin:14px 0;padding:14px;border:1px solid rgba(155,124,255,.28);border-radius:16px;background:linear-gradient(145deg,rgba(12,35,43,.92),rgba(22,13,42,.94))}.np-quote-review h3{margin:0;color:#f5fbff;font-size:18px}.np-quote-review>p{margin:5px 0 12px;color:#8ba6b0;font-size:10px;line-height:1.45}',
      '.np-quote-review-grid{display:grid;grid-template-columns:minmax(0,160px) 1fr;gap:9px}.np-review-field{display:grid;gap:5px;color:#b7d2da;font-size:9px;font-weight:900;letter-spacing:.04em;text-transform:uppercase}.np-review-field input,.np-review-field textarea{width:100%;box-sizing:border-box;border:1px solid rgba(103,224,238,.24);border-radius:10px;padding:10px;color:#effcff;background:#031018;font-size:16px}.np-review-field textarea{min-height:70px;resize:vertical}.np-review-help{margin:9px 0 0;color:#748f99;font-size:8px}',
      '.np-service-editor{margin:-2px 0 8px;border:1px solid rgba(100,226,240,.16);border-radius:0 0 13px 13px;background:rgba(2,14,21,.68)}.np-service-editor summary{padding:10px 12px;color:#aeeef5;font-size:9px;font-weight:900;cursor:pointer;list-style:none}.np-service-editor summary::-webkit-details-marker{display:none}.np-service-editor summary:after{float:right;content:"＋"}.np-service-editor[open] summary:after{content:"−"}',
      '.np-service-editor-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 11px 11px}.np-service-editor .np-review-field:last-child{grid-column:1/-1}.np-service-editor .np-review-field textarea{min-height:64px}',
      '@media(max-width:540px){.np-quote-review-grid,.np-service-editor-grid{grid-template-columns:1fr}.np-service-editor .np-review-field:last-child{grid-column:auto}.np-accuracy-head h3,.np-quote-review h3{font-size:16px}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function getQuickState() {
    return window.NPQuickQuote && typeof window.NPQuickQuote.getState === 'function'
      ? window.NPQuickQuote.getState()
      : null;
  }

  function buildAccuracy(state) {
    var issues = [];
    var score = 100;
    var ids = state.selectedServiceIds || [];
    var counts = state.photoCounts || {};
    var measurements = state.measurements || {};

    if (!ids.length) {
      issues.push({ critical: true, title: 'Choose at least one service', detail: 'The Matrix needs to know what the customer wants priced.', action: 'services' });
      score -= 35;
    }
    if (!state.photoCount) {
      issues.push({ critical: true, title: 'Add one clear property photo', detail: 'A quote cannot be verified without visible evidence.', action: 'property_overview' });
      score -= 40;
    }

    ids.forEach(function (id) {
      var title = state.guideTitles[id] || id.replace(/_/g, ' ');
      var photoCount = Number(counts[id]) || 0;
      var target = PHOTO_TARGETS[id] || 2;
      if (!photoCount) {
        issues.push({ critical: true, title: 'Photograph ' + title, detail: 'This selected service has no tagged photo yet.', action: id });
        score -= 18;
      } else if (photoCount < target) {
        issues.push({ critical: false, title: 'Strengthen ' + title, detail: 'Add ' + (target - photoCount) + ' more useful view' + (target - photoCount === 1 ? '' : 's') + ' for a tighter estimate.', action: id });
        score -= 6;
      }

      var rules = FIELD_RULES[id] || [];
      var values = measurements[id] || {};
      var missing = rules.filter(function (rule) { return !String(values[rule[0]] || '').trim(); }).map(function (rule) { return rule[1]; });
      if (missing.length) {
        issues.push({ critical: false, title: 'Confirm ' + title + ' details', detail: 'Missing ' + missing.join(', ') + '. Add what you know; photos can handle the rest.', action: id });
        score -= Math.min(12, 4 + (missing.length * 2));
      }
    });

    score = Math.max(0, Math.min(100, score));
    return { score: score, issues: issues };
  }

  function renderAccuracy() {
    var state = getQuickState();
    var planner = document.getElementById('npPhotoPlanner');
    if (!state || !planner) return;
    var panel = document.getElementById('npAccuracyCheck');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'npAccuracyCheck';
      panel.className = 'np-accuracy-check';
      planner.insertAdjacentElement('afterend', panel);
    }
    var result = buildAccuracy(state);
    var criticalCount = result.issues.filter(function (item) { return item.critical; }).length;
    var suggestionCount = result.issues.length - criticalCount;
    var headline = criticalCount ? criticalCount + ' quick fix' + (criticalCount === 1 ? '' : 'es') + ' needed' : suggestionCount ? 'Ready to scan' : 'Strong evidence set';
    var subline = criticalCount ? 'Fix the red items for a dependable quote.' : suggestionCount ? suggestionCount + ' optional accuracy suggestion' + (suggestionCount === 1 ? '' : 's') : 'Nothing important appears to be missing.';
    var list = result.issues.length ? result.issues.map(function (item) {
      return '<div class="np-accuracy-item' + (item.critical ? ' is-critical' : '') + '"><div><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.detail) + '</span></div><button class="np-accuracy-fix" type="button" data-accuracy-action="' + escapeHtml(item.action) + '">Fix</button></div>';
    }).join('') : '<div class="np-accuracy-clear">✓ Selected services have enough evidence to produce a strong photo-based estimate.</div>';
    panel.innerHTML = '<div class="np-accuracy-head"><div><h3>Accuracy Check</h3><p>Only flags details that could meaningfully change the quote.</p></div><div class="np-accuracy-score">' + result.score + '<span>%</span></div></div><div class="np-accuracy-meter"><span style="width:' + result.score + '%"></span></div><div class="np-accuracy-status"><strong>' + escapeHtml(headline) + '</strong><span>' + escapeHtml(subline) + '</span></div><div class="np-accuracy-list">' + list + '</div><p class="np-accuracy-foot">Suggestions never block the scan. Use your judgment when a view or measurement does not apply.</p>';
  }

  function handleAccuracyClick(event) {
    var button = event.target.closest('[data-accuracy-action]');
    if (!button) return;
    var action = button.getAttribute('data-accuracy-action');
    if (action === 'services') {
      var scope = document.getElementById('scopeGrid');
      if (scope) scope.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (window.NPQuickQuote && typeof window.NPQuickQuote.openGuide === 'function') window.NPQuickQuote.openGuide(action);
  }

  function quoteState() {
    return window.NPMatrixQuote && typeof window.NPMatrixQuote.getState === 'function'
      ? window.NPMatrixQuote.getState()
      : null;
  }

  function serviceEditor(service) {
    return '<details class="np-service-editor" data-editor-for="' + escapeHtml(service.id) + '"><summary>Edit quantity, time, price, or description</summary><div class="np-service-editor-grid">' +
      '<label class="np-review-field">Quantity<input type="number" min="0" step="0.1" inputmode="decimal" data-quote-service="' + escapeHtml(service.id) + '" data-quote-field="quantity" value="' + escapeHtml(service.quantity) + '"></label>' +
      '<label class="np-review-field">Unit<input type="text" maxlength="40" data-quote-service="' + escapeHtml(service.id) + '" data-quote-field="quantityUnit" value="' + escapeHtml(String(service.quantityUnit || '').replace(/_/g, ' ')) + '"></label>' +
      '<label class="np-review-field">Estimated minutes<input type="number" min="0" step="5" inputmode="numeric" data-quote-service="' + escapeHtml(service.id) + '" data-quote-field="estimatedTimeMinutes" value="' + escapeHtml(service.estimatedTimeMinutes) + '"></label>' +
      '<label class="np-review-field">Line price ($)<input type="number" min="0" step="0.01" inputmode="decimal" data-quote-service="' + escapeHtml(service.id) + '" data-quote-field="calculatedPrice" value="' + escapeHtml(Number(service.calculatedPrice || 0).toFixed(2)) + '"></label>' +
      '<label class="np-review-field">Customer description<textarea maxlength="320" data-quote-service="' + escapeHtml(service.id) + '" data-quote-field="reason">' + escapeHtml(service.reason || '') + '</textarea></label>' +
      '</div></details>';
  }

  function decorateQuoteResults() {
    if (decoratingResults) return;
    var mount = document.getElementById('resultsMount');
    var total = mount && mount.querySelector('.quote-total');
    var state = quoteState();
    if (!mount || !total || !state || mount.querySelector('#npQuoteReview')) return;
    decoratingResults = true;
    try {
      var review = document.createElement('section');
      review.id = 'npQuoteReview';
      review.className = 'np-quote-review';
      review.innerHTML = '<h3>Review Before Sending</h3><p>Tap a service card to include or remove it. Open its editor to correct the AI quantity, time, price, or wording.</p><div class="np-quote-review-grid"><label class="np-review-field">Discount (%)<input id="npQuoteDiscount" type="number" min="0" max="100" step="1" inputmode="decimal" value="' + escapeHtml(state.discountPercent) + '"></label><label class="np-review-field">Customer quote notes<textarea id="npQuoteNotes" maxlength="700" placeholder="Optional customer-facing notes, exclusions, or scheduling details">' + escapeHtml(state.quoteNotes || '') + '</textarea></label></div><p class="np-review-help">The minimum service charge still applies after discounts. Your edits carry into Copy, Email, Save Project, and the customer PDF.</p>';
      total.parentNode.insertBefore(review, total);

      var serviceMap = {};
      (state.services || []).forEach(function (service) { serviceMap[service.id] = service; });
      Array.prototype.forEach.call(mount.querySelectorAll('[data-toggle-service]'), function (card) {
        var service = serviceMap[card.getAttribute('data-toggle-service')];
        if (service) card.insertAdjacentHTML('afterend', serviceEditor(service));
      });
    } finally {
      decoratingResults = false;
    }
  }

  function handleQuoteChange(event) {
    if (!window.NPMatrixQuote) return;
    if (event.target.id === 'npQuoteDiscount') {
      window.NPMatrixQuote.setDiscount(event.target.value);
      return;
    }
    if (event.target.id === 'npQuoteNotes') {
      window.NPMatrixQuote.setNotes(event.target.value);
      return;
    }
    var id = event.target.getAttribute('data-quote-service');
    var field = event.target.getAttribute('data-quote-field');
    if (!id || !field) return;
    var patch = {};
    patch[field] = event.target.value;
    window.NPMatrixQuote.updateService(id, patch);
  }

  function handleQuoteInput(event) {
    if (event.target.id === 'npQuoteNotes' && window.NPMatrixQuote) window.NPMatrixQuote.setNotes(event.target.value);
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      renderAccuracy();
      decorateQuoteResults();
    });
  }

  function observeResults() {
    var mount = document.getElementById('resultsMount');
    if (!mount || typeof MutationObserver !== 'function') return;
    new MutationObserver(queueRender).observe(mount, { childList: true, subtree: true });
  }

  function init() {
    installStyles();
    document.addEventListener('np:quote-evidence-changed', queueRender);
    document.addEventListener('click', handleAccuracyClick);
    document.addEventListener('change', handleQuoteChange);
    document.addEventListener('input', handleQuoteInput);
    observeResults();
    queueRender();
  }

  init();
})();
