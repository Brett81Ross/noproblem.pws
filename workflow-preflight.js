(function (root, factory) {
  'use strict';

  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  root.SchismPreflight = api;
  if (root.document) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { api.initBrowser(); });
    } else {
      api.initBrowser();
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function cleanText(value, max) {
    return typeof value === 'string' ? value.trim().slice(0, max || 400) : '';
  }

  function cleanIds(values) {
    return Array.from(new Set((Array.isArray(values) ? values : [])
      .filter(function (value) { return typeof value === 'string' && /^[a-z0-9_]+$/.test(value); })));
  }

  function evaluatePreflight(input) {
    input = input && typeof input === 'object' ? input : {};

    var address = cleanText(input.address, 180);
    var customer = cleanText(input.customer, 120);
    var selectedServices = cleanIds(input.selectedServices);
    var photoCount = Math.max(0, Number(input.photoCount) || 0);
    var buildingLevel = input.buildingLevel === 'multiple' ? 'multiple' : 'one';
    var matrix = input.matrix && typeof input.matrix === 'object' ? input.matrix : null;
    var decision = matrix && matrix.decisionSupport && typeof matrix.decisionSupport === 'object'
      ? matrix.decisionSupport
      : null;

    var blockers = [];
    var advisories = [];

    if (!customer) advisories.push('Customer/project name is blank.');
    if (buildingLevel === 'multiple') {
      advisories.push('Multiple levels exceed the launch field-execution boundary and will remain review-bound.');
    }
    if (photoCount > 0 && photoCount < 3) {
      advisories.push('Evidence is thin; this should be treated as a preliminary quote until the property is confirmed on site.');
    }

    (Array.isArray(input.learningAdvisories) ? input.learningAdvisories : []).slice(0, 2).forEach(function (signal) {
      var message = cleanText(signal && signal.message, 420);
      if (message) advisories.push(message);
    });

    if (!address) {
      blockers.push('Property address is required before SchismMatrix can anchor the job.');
      return {
        version: 1,
        state: 'property_required',
        stateLabel: 'Property Needed',
        summary: 'Anchor the job to the property first.',
        nextAction: { id: 'address', label: 'Add Property Address', target: 'jobAddress' },
        blockers,
        advisories,
        readiness: 'not_ready'
      };
    }

    if (!selectedServices.length) {
      blockers.push('Select at least one service so SchismMatrix does not invent the requested scope.');
      return {
        version: 1,
        state: 'scope_required',
        stateLabel: 'Scope Needed',
        summary: 'Tell SchismMatrix what work is actually being considered.',
        nextAction: { id: 'scope', label: 'Select Service Scope', target: 'scopeCard' },
        blockers,
        advisories,
        readiness: 'not_ready'
      };
    }

    if (photoCount < 1) {
      blockers.push('At least one property image is required before analysis.');
      return {
        version: 1,
        state: 'evidence_required',
        stateLabel: 'Evidence Needed',
        summary: 'Capture the property before asking the Matrix to estimate it.',
        nextAction: { id: 'capture', label: 'Start Property Walk', target: 'evidenceCard' },
        blockers,
        advisories,
        readiness: 'not_ready'
      };
    }

    if (!matrix) {
      return {
        version: 1,
        state: buildingLevel === 'multiple' ? 'analysis_review_bound' : 'analysis_ready',
        stateLabel: buildingLevel === 'multiple' ? 'Analyze for Review' : 'Ready to Analyze',
        summary: buildingLevel === 'multiple'
          ? 'The evidence package is ready for analysis, but this job will remain locked for manual review because it exceeds the launch access boundary.'
          : 'The minimum job package is complete. Run the Matrix review.',
        nextAction: { id: 'analyze', label: buildingLevel === 'multiple' ? 'Analyze for Manual Review' : 'Review Estimate', target: 'processTrigger' },
        blockers: buildingLevel === 'multiple' ? ['Field execution cannot be released automatically for multiple-level scope.'] : [],
        advisories,
        readiness: buildingLevel === 'multiple' ? 'review_bound' : 'analysis_ready'
      };
    }

    var status = decision && cleanText(decision.status, 40);
    var nextBest = decision && decision.nextBestAction && typeof decision.nextBestAction === 'object'
      ? decision.nextBestAction
      : null;
    var integrityIssues = decision && decision.quoteIntegrity && Array.isArray(decision.quoteIntegrity.issues)
      ? decision.quoteIntegrity.issues
      : [];

    if (matrix.requiresHumanReview === true || status === 'blocked' || status === 'review_required' || integrityIssues.length) {
      if (nextBest && cleanText(nextBest.prompt, 220)) {
        blockers.push(cleanText(nextBest.prompt, 220));
      } else if (cleanText(matrix.humanReviewReason, 360)) {
        blockers.push(cleanText(matrix.humanReviewReason, 360));
      } else {
        blockers.push('Manual review is required before this quote can be released.');
      }

      integrityIssues.slice(0, 2).forEach(function (issue) {
        var message = cleanText(issue && issue.message, 300);
        if (message && !blockers.includes(message)) blockers.push(message);
      });

      return {
        version: 1,
        state: nextBest ? 'evidence_followup' : 'manual_review',
        stateLabel: nextBest ? 'One More Look' : 'Review Locked',
        summary: nextBest
          ? 'SchismMatrix found a material uncertainty. Capture the requested evidence before crew handoff.'
          : 'The quote is analyzed, but a review lock still needs to be resolved.',
        nextAction: nextBest
          ? { id: 'followup', label: 'Capture Requested Evidence', target: 'evidenceFollowup' }
          : { id: 'review', label: 'Review Locked Quote', target: 'resultsSection' },
        blockers,
        advisories,
        readiness: 'review_required',
        nextBestAction: nextBest
      };
    }

    if (decision && decision.crew && decision.crew.ready === true) {
      return {
        version: 1,
        state: 'crew_ready',
        stateLabel: 'Field Ready',
        summary: 'The current evidence and quote are cleared for crew handoff within the launch boundary.',
        nextAction: { id: 'crew', label: 'Open Crew Command', target: 'crewCommandPanel' },
        blockers: [],
        advisories,
        readiness: 'field_ready'
      };
    }

    return {
      version: 1,
      state: 'review_quote',
      stateLabel: 'Review Quote',
      summary: 'Analysis is complete. Review the scope, price, safety notes, and release state before handoff.',
      nextAction: { id: 'review', label: 'Review Estimate', target: 'resultsSection' },
      blockers: [],
      advisories,
      readiness: 'review_pending'
    };
  }

  function snapshotBrowserState() {
    if (typeof document === 'undefined') return {};

    var runtime = typeof window !== 'undefined' && window.SchismRuntime && typeof window.SchismRuntime.snapshot === 'function'
      ? window.SchismRuntime.snapshot()
      : null;

    var selectedServices = Array.prototype.map.call(
      document.querySelectorAll('#scopeGrid [data-service][aria-pressed="true"]'),
      function (button) { return button.getAttribute('data-service'); }
    ).filter(Boolean);

    var photoCount = document.querySelectorAll('#evidenceGrid .evidence-slot.has-photo').length;
    var matrix = runtime && runtime.matrix ? runtime.matrix : null;
    var learningAdvisories = [];
    if (typeof window !== 'undefined' && window.SchismJobLearning &&
        typeof window.SchismJobLearning.currentBrowserAnalysis === 'function' &&
        typeof window.SchismJobLearning.buildServiceAdvisories === 'function') {
      learningAdvisories = window.SchismJobLearning.buildServiceAdvisories(
        selectedServices,
        window.SchismJobLearning.currentBrowserAnalysis()
      );
    }

    return {
      customer: document.getElementById('jobName') && document.getElementById('jobName').value,
      address: document.getElementById('jobAddress') && document.getElementById('jobAddress').value,
      selectedServices,
      photoCount,
      buildingLevel: document.body.getAttribute('data-building-level') === 'multiple' ? 'multiple' : 'one',
      matrix,
      learningAdvisories
    };
  }

  function ensureStyles() {
    if (document.getElementById('schismPreflightStyles')) return;
    var style = document.createElement('style');
    style.id = 'schismPreflightStyles';
    style.textContent = [
      '.schism-preflight{margin:0 0 14px;padding:15px;border:1px solid rgba(93,235,245,.22);border-radius:16px;background:linear-gradient(145deg,rgba(7,30,39,.97),rgba(3,13,21,.98));box-shadow:0 16px 30px rgba(0,0,0,.14)}',
      '.schism-preflight[data-readiness="field_ready"]{border-color:rgba(117,245,163,.28)}.schism-preflight[data-readiness="review_required"],.schism-preflight[data-readiness="review_bound"]{border-color:rgba(214,176,107,.32)}',
      '.schism-preflight-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.schism-preflight-kicker{color:#62edf6;font-size:8px;font-weight:950;letter-spacing:.13em;text-transform:uppercase}.schism-preflight h3{margin:5px 0 0;color:#effcff;font-size:17px}.schism-preflight-badge{padding:6px 9px;border:1px solid rgba(93,235,245,.24);border-radius:999px;color:#bffaff;background:rgba(93,235,245,.06);font-size:8px;font-weight:950;letter-spacing:.07em;text-transform:uppercase}',
      '.schism-preflight-summary{margin:9px 0 0;color:#9bb5be;font-size:10px;line-height:1.5}.schism-preflight-list{display:grid;gap:6px;margin-top:10px}.schism-preflight-item{padding:8px 10px;border:1px solid rgba(93,235,245,.1);border-radius:10px;color:#a9c1c9;background:rgba(1,12,18,.46);font-size:9px;line-height:1.45}.schism-preflight-item.blocker{border-color:rgba(214,176,107,.22);color:#d8c08c}.schism-preflight-item.advisory:before{content:"Note · ";color:#64dce6;font-weight:900}.schism-preflight-item.blocker:before{content:"Blocker · ";font-weight:900}',
      '.schism-preflight-action{width:100%;min-height:43px;margin-top:11px;border:1px solid rgba(93,235,245,.35);border-radius:11px;color:#03151b;background:linear-gradient(135deg,#a6faff,#55dce9);font-size:9px;font-weight:950;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}.schism-preflight[data-readiness="field_ready"] .schism-preflight-action{border-color:rgba(117,245,163,.35);background:linear-gradient(135deg,#bdffce,#75f5a3)}',
      '.schism-preflight-pulse{animation:schismPreflightPulse .75s ease}@keyframes schismPreflightPulse{0%,100%{box-shadow:none}45%{box-shadow:0 0 0 4px rgba(93,235,245,.14)}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureMount() {
    var mission = document.getElementById('missionCard');
    if (!mission || !mission.parentNode) return null;
    var existing = document.getElementById('schismPreflight');
    if (existing) return existing;

    var section = document.createElement('section');
    section.id = 'schismPreflight';
    section.className = 'schism-preflight';
    mission.parentNode.insertBefore(section, mission);
    return section;
  }

  function pulseTarget(target) {
    if (!target) return;
    target.classList.remove('schism-preflight-pulse');
    void target.offsetWidth;
    target.classList.add('schism-preflight-pulse');
    setTimeout(function () { target.classList.remove('schism-preflight-pulse'); }, 900);
  }

  function act(result) {
    if (!result || !result.nextAction) return;
    var action = result.nextAction.id;
    var targetId = result.nextAction.target;

    if (action === 'address') {
      var address = document.getElementById('jobAddress');
      if (address) {
        address.scrollIntoView({ behavior: 'smooth', block: 'center' });
        address.focus();
        pulseTarget(address);
      }
      return;
    }

    if (action === 'scope') {
      var scope = document.getElementById('scopeCard');
      if (scope) {
        scope.scrollIntoView({ behavior: 'smooth', block: 'start' });
        pulseTarget(scope);
      }
      return;
    }

    if (action === 'capture') {
      var evidence = document.getElementById('evidenceCard');
      if (evidence) evidence.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window.SchismWalkaround && typeof window.SchismWalkaround.open === 'function') {
        window.SchismWalkaround.open();
      } else {
        var camera = document.getElementById('cameraInput');
        if (camera) camera.click();
      }
      return;
    }

    if (action === 'analyze') {
      if (typeof window.submitJobForAnalysis === 'function') {
        window.submitJobForAnalysis();
      } else {
        var analyze = document.getElementById('processTrigger');
        if (analyze) analyze.click();
      }
      return;
    }

    if (action === 'followup') {
      var followup = document.getElementById('evidenceFollowup');
      var evidenceCard = document.getElementById('evidenceCard');
      if (evidenceCard) evidenceCard.style.display = '';
      if (followup) {
        followup.classList.add('open');
        followup.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pulseTarget(followup);
      } else if (evidenceCard) {
        evidenceCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }

    if (action === 'crew' && window.SchismDashboard && typeof window.SchismDashboard.selectCrew === 'function') {
      window.SchismDashboard.selectCrew();
      return;
    }

    var target = document.getElementById(targetId);
    if (target) {
      target.style.display = '';
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      pulseTarget(target);
    }
  }

  function renderBrowser() {
    if (typeof document === 'undefined') return;
    var mount = ensureMount();
    if (!mount) return;

    var result = evaluatePreflight(snapshotBrowserState());
    mount.setAttribute('data-state', result.state);
    mount.setAttribute('data-readiness', result.readiness);

    var list = [];
    result.blockers.slice(0, 3).forEach(function (item) {
      list.push('<div class="schism-preflight-item blocker">' + escapeHtml(item) + '</div>');
    });
    result.advisories.slice(0, 2).forEach(function (item) {
      list.push('<div class="schism-preflight-item advisory">' + escapeHtml(item) + '</div>');
    });

    mount.innerHTML =
      '<div class="schism-preflight-head"><div><div class="schism-preflight-kicker">Matrix Next Move</div><h3>' +
      escapeHtml(result.summary) + '</h3></div><span class="schism-preflight-badge">' +
      escapeHtml(result.stateLabel) + '</span></div>' +
      '<div class="schism-preflight-summary">Property → Scope → Evidence → Analyze → Resolve Review → Crew</div>' +
      (list.length ? '<div class="schism-preflight-list">' + list.join('') + '</div>' : '') +
      '<button class="schism-preflight-action" id="schismPreflightAction" type="button">' +
      escapeHtml(result.nextAction.label) + '</button>';

    var button = document.getElementById('schismPreflightAction');
    if (button) button.addEventListener('click', function () { act(result); });

    window.__schismPreflightState = result;
    document.dispatchEvent(new CustomEvent('schism:preflight-changed', { detail: result }));
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character];
    });
  }

  function bindChangeSources() {
    ['jobName', 'jobAddress'].forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('input', renderBrowser);
      input.addEventListener('change', renderBrowser);
    });

    var scope = document.getElementById('scopeGrid');
    if (scope) scope.addEventListener('click', function () { setTimeout(renderBrowser, 0); });

    var evidence = document.getElementById('evidenceGrid');
    if (evidence && typeof MutationObserver === 'function') {
      new MutationObserver(renderBrowser).observe(evidence, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    }

    document.addEventListener('schism:decision-support-changed', renderBrowser);
    document.addEventListener('schism:workspace-changed', renderBrowser);
    document.addEventListener('schism:release-state-changed', renderBrowser);
    document.addEventListener('schism:job-learning-changed', renderBrowser);

    if (typeof MutationObserver === 'function') {
      new MutationObserver(renderBrowser).observe(document.body, { attributes: true, attributeFilter: ['data-building-level'] });
    }
  }

  function initBrowser() {
    if (typeof document === 'undefined') return;
    ensureStyles();
    ensureMount();
    bindChangeSources();
    renderBrowser();
  }

  return {
    evaluatePreflight,
    snapshotBrowserState,
    initBrowser,
    render: renderBrowser,
    act
  };
});
