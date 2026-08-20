(function () {
  'use strict';

  var STORAGE_KEY = 'np_matrix_building_level';
  var ONE_STORY = 'one';
  var MULTIPLE_LEVELS = 'multiple';

  function readSavedLevel() {
    try {
      return localStorage.getItem(STORAGE_KEY) === MULTIPLE_LEVELS ? MULTIPLE_LEVELS : ONE_STORY;
    } catch (error) {
      return ONE_STORY;
    }
  }

  function saveLevel(level) {
    try {
      localStorage.setItem(STORAGE_KEY, level);
    } catch (error) {
      // The selector still works when private browsing blocks storage.
    }
  }

  function levelLabel(level) {
    return level === MULTIPLE_LEVELS ? 'Multiple levels' : 'One story';
  }

  function updateHouseWashLabels(level, root) {
    var scope = root || document;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    var node;
    var replacement = level === MULTIPLE_LEVELS ? 'Multi-Level House Soft Wash' : 'One-Story House Soft Wash';

    while ((node = walker.nextNode())) {
      if (/One-Story House Soft Wash|Multi-Level House Soft Wash/i.test(node.nodeValue || '')) {
        node.nodeValue = node.nodeValue.replace(/One-Story House Soft Wash|Multi-Level House Soft Wash/gi, replacement);
      }
    }
  }

  function createHeightSelector() {
    var scopeGrid = document.getElementById('scopeGrid');
    if (!scopeGrid || document.getElementById('buildingHeightField')) return null;

    var field = document.createElement('div');
    field.className = 'building-height-field';
    field.id = 'buildingHeightField';
    field.innerHTML = [
      '<span class="building-height-label" id="buildingHeightLabel">Building height</span>',
      '<div class="building-height-switch" role="group" aria-labelledby="buildingHeightLabel">',
      '  <button class="building-height-option" type="button" data-building-level="one" aria-pressed="true">One story</button>',
      '  <button class="building-height-option" type="button" data-building-level="multiple" aria-pressed="false">Multiple levels</button>',
      '</div>',
      '<p class="building-height-note" id="buildingHeightNote"></p>'
    ].join('');

    scopeGrid.parentNode.insertBefore(field, scopeGrid);
    return field;
  }

  function applyLevel(level) {
    var normalized = level === MULTIPLE_LEVELS ? MULTIPLE_LEVELS : ONE_STORY;
    var note = document.getElementById('buildingHeightNote');
    var boundary = document.querySelector('.scope-boundary span:last-child');
    var houseWash = document.querySelector('[data-service="house_wash"]');

    document.body.setAttribute('data-building-level', normalized);
    saveLevel(normalized);

    Array.prototype.forEach.call(document.querySelectorAll('[data-building-level]'), function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-building-level') === normalized));
    });

    if (houseWash) houseWash.textContent = 'House wash';

    if (normalized === MULTIPLE_LEVELS) {
      if (note) note.textContent = 'Plans and quotes include multi-level exterior washing and the access equipment needed for the job.';
      if (boundary) boundary.innerHTML = '<strong>Operating boundary:</strong> multi-level exterior washing is enabled. Use professional extension equipment, lifts, or approved access methods. Roof cleaning remains excluded.';
    } else {
      if (note) note.textContent = 'Plans and quotes are limited to ground-level and one-story exterior washing.';
      if (boundary) boundary.innerHTML = '<strong>Operating boundary:</strong> one-story mode is selected. Ground-level and one-story exterior washing are included. Roof cleaning remains excluded.';
    }

    updateHouseWashLabels(normalized, document.getElementById('resultsMount') || document);
  }

  function addSelectorEvents() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-building-level]'), function (button) {
      button.addEventListener('click', function () {
        applyLevel(button.getAttribute('data-building-level'));
      });
    });
  }

  function patchAnalysisRequest() {
    if (window.__npBuildingFetchPatched || typeof window.fetch !== 'function') return;

    var originalFetch = window.fetch.bind(window);
    window.__npBuildingFetchPatched = true;
    window.fetch = function (resource, options) {
      var url = typeof resource === 'string' ? resource : resource && resource.url;
      var requestOptions = options;

      if (url && /\/api\/analyze(?:\?|$)/.test(url) && options && typeof options.body === 'string') {
        try {
          var payload = JSON.parse(options.body);
          var level = document.body.getAttribute('data-building-level') === MULTIPLE_LEVELS ? MULTIPLE_LEVELS : ONE_STORY;
          var scopeInstruction = level === MULTIPLE_LEVELS
            ? 'BUILDING HEIGHT: Multiple levels. Include upper-level exterior washing, safe access equipment, setup time, labor, and height-related difficulty in the plan and quote. Do not include roof cleaning.'
            : 'BUILDING HEIGHT: One story. Keep the plan and quote to ground-level and one-story exterior washing. Do not include roof cleaning.';

          payload.buildingScope = {
            level: level,
            label: levelLabel(level),
            roofCleaningIncluded: false
          };
          payload.settings = Object.assign({}, payload.settings || {}, { buildingLevel: level });
          payload.job = Object.assign({}, payload.job || {}, { buildingLevel: level });
          payload.siteNotes = scopeInstruction + (payload.siteNotes ? '\n\n' + payload.siteNotes : '');
          requestOptions = Object.assign({}, options, { body: JSON.stringify(payload) });
        } catch (error) {
          requestOptions = options;
        }
      }

      return originalFetch(resource, requestOptions);
    };
  }

  function observeResults() {
    var resultsMount = document.getElementById('resultsMount');
    if (!resultsMount || typeof MutationObserver !== 'function') return;

    var observer = new MutationObserver(function () {
      updateHouseWashLabels(document.body.getAttribute('data-building-level'), resultsMount);
    });
    observer.observe(resultsMount, { childList: true, subtree: true });
  }

  function init() {
    createHeightSelector();
    addSelectorEvents();
    applyLevel(readSavedLevel());
    patchAnalysisRequest();
    observeResults();
  }

  init();
})();
