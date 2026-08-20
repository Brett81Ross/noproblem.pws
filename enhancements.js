(function () {
  'use strict';

  var STORAGE_KEY = 'np_matrix_building_level';
  var CONTACT_STORAGE_KEY = 'np_matrix_customer_contact';
  var ONE_STORY = 'one';
  var MULTIPLE_LEVELS = 'multiple';
  var noticeTimer = null;

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

  function createCustomerFields() {
    var missionFields = document.querySelector('.mission-fields');
    if (!missionFields || document.getElementById('customerContactFields')) return null;

    var fields = document.createElement('div');
    fields.className = 'customer-fields';
    fields.id = 'customerContactFields';
    fields.innerHTML = [
      '<label class="field-label">',
      '  Customer email',
      '  <input class="text-field" id="customerEmail" type="email" inputmode="email" autocomplete="email" maxlength="120" placeholder="customer@example.com">',
      '</label>',
      '<label class="field-label">',
      '  Customer phone number',
      '  <input class="text-field" id="customerPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="30" placeholder="(405) 555-0123">',
      '</label>',
      '<p class="customer-contact-note">Used only for the customer quote, PDF, and email recipient. Contact details are not sent to the photo-analysis service.</p>'
    ].join('');

    missionFields.insertAdjacentElement('afterend', fields);
    return fields;
  }

  function readCustomerContact() {
    var contact = { email: '', phone: '' };

    try {
      var savedProject = JSON.parse(localStorage.getItem('no-problem-matrix-last-project') || 'null');
      if (savedProject) {
        contact.email = savedProject.customerEmail || '';
        contact.phone = savedProject.customerPhone || '';
      }
    } catch (error) {
      contact = { email: '', phone: '' };
    }

    if (!contact.email && !contact.phone) {
      try {
        var savedContact = JSON.parse(localStorage.getItem(CONTACT_STORAGE_KEY) || 'null');
        if (savedContact) {
          contact.email = savedContact.email || '';
          contact.phone = savedContact.phone || '';
        }
      } catch (error) {
        contact = { email: '', phone: '' };
      }
    }

    return contact;
  }

  function saveCustomerContact() {
    var email = document.getElementById('customerEmail');
    var phone = document.getElementById('customerPhone');
    if (!email || !phone) return;

    try {
      localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify({
        email: email.value.trim(),
        phone: phone.value.trim()
      }));
    } catch (error) {
      // Fields remain usable when private browsing blocks storage.
    }
  }

  function restoreCustomerContact() {
    var contact = readCustomerContact();
    var email = document.getElementById('customerEmail');
    var phone = document.getElementById('customerPhone');
    if (email) email.value = contact.email;
    if (phone) phone.value = contact.phone;
  }

  function addCustomerContactEvents() {
    ['customerEmail', 'customerPhone'].forEach(function (id) {
      var field = document.getElementById(id);
      if (field) field.addEventListener('input', saveCustomerContact);
    });
  }

  function showNotice(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    clearTimeout(noticeTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    noticeTimer = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2800);
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
    var roofWash = document.querySelector('[data-service="roof_soft_wash"]');

    document.body.setAttribute('data-building-level', normalized);
    saveLevel(normalized);

    Array.prototype.forEach.call(document.querySelectorAll('button[data-building-level]'), function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-building-level') === normalized));
    });

    if (houseWash) houseWash.textContent = 'House wash';

    if (normalized === MULTIPLE_LEVELS) {
      if (note) note.textContent = 'Plans and quotes include multi-level exterior washing, roof soft washing, and the access equipment needed for the job.';
      if (boundary) boundary.innerHTML = '<strong>Operating boundary:</strong> multi-level exterior and roof soft washing are enabled. Use professional extension equipment, lifts, or approved access methods.';
    } else {
      if (roofWash && roofWash.getAttribute('aria-pressed') === 'true') roofWash.click();
      if (note) note.textContent = 'Plans and quotes are limited to ground-level and one-story exterior washing.';
      if (boundary) boundary.innerHTML = '<strong>Operating boundary:</strong> one-story mode is selected. Ground-level and one-story exterior washing are included. Roof cleaning remains excluded.';
    }

    updateHouseWashLabels(normalized, document.getElementById('resultsMount') || document);
  }

  function addSelectorEvents() {
    Array.prototype.forEach.call(document.querySelectorAll('button[data-building-level]'), function (button) {
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
            ? 'BUILDING HEIGHT: Multiple levels. Roof soft washing is available in this mode. Include roof cleaning when requested or clearly supported by the photos, plus safe access equipment, setup time, labor, chemical treatment, and height-related difficulty in the plan and quote. Never use high pressure on roofing materials.'
            : 'BUILDING HEIGHT: One story. Keep the plan and quote to ground-level and one-story exterior washing. Do not include roof cleaning.';

          payload.buildingScope = {
            level: level,
            label: levelLabel(level),
            roofCleaningIncluded: level === MULTIPLE_LEVELS
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

  function pdfSafeText(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/™/g, '(TM)')
      .replace(/©/g, '(C)')
      .replace(/[–—]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/•/g, '-')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function wrapPdfLine(value, maximumLength) {
    var text = pdfSafeText(value);
    if (!text) return [''];

    var words = text.split(' ');
    var lines = [];
    var current = '';

    words.forEach(function (word) {
      while (word.length > maximumLength) {
        if (current) {
          lines.push(current);
          current = '';
        }
        lines.push(word.slice(0, maximumLength));
        word = word.slice(maximumLength);
      }

      var next = current ? current + ' ' + word : word;
      if (next.length > maximumLength && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) lines.push(current);
    return lines.length ? lines : [''];
  }

  function pdfEscape(value) {
    return pdfSafeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  function createPdfBlob(sourceLines) {
    var wrappedLines = [];
    sourceLines.forEach(function (line) {
      wrapPdfLine(line, 82).forEach(function (wrapped) {
        wrappedLines.push(wrapped);
      });
    });

    var linesPerPage = 46;
    var pages = [];
    for (var index = 0; index < wrappedLines.length; index += linesPerPage) {
      pages.push(wrappedLines.slice(index, index + linesPerPage));
    }
    if (!pages.length) pages.push(['Customer quote']);

    var fontObjectNumber = 3 + (pages.length * 2);
    var objects = [];
    var pageReferences = [];

    objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';

    pages.forEach(function (pageLines, pageIndex) {
      var pageObjectNumber = 3 + (pageIndex * 2);
      var contentObjectNumber = pageObjectNumber + 1;
      pageReferences.push(pageObjectNumber + ' 0 R');

      var commands = [
        'BT',
        '/F1 10 Tf',
        '52 748 Td',
        '14 TL'
      ];
      pageLines.forEach(function (line) {
        commands.push('(' + pdfEscape(line) + ') Tj');
        commands.push('T*');
      });
      commands.push('ET');

      var stream = commands.join('\n');
      objects[pageObjectNumber] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ' + fontObjectNumber + ' 0 R >> >> /Contents ' + contentObjectNumber + ' 0 R >>';
      objects[contentObjectNumber] = '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream';
    });

    objects[2] = '<< /Type /Pages /Kids [' + pageReferences.join(' ') + '] /Count ' + pages.length + ' >>';
    objects[fontObjectNumber] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

    var pdf = '%PDF-1.4\n%NPWM\n';
    var offsets = [0];
    for (var objectNumber = 1; objectNumber < objects.length; objectNumber += 1) {
      offsets[objectNumber] = pdf.length;
      pdf += objectNumber + ' 0 obj\n' + objects[objectNumber] + '\nendobj\n';
    }

    var xrefOffset = pdf.length;
    pdf += 'xref\n0 ' + objects.length + '\n';
    pdf += '0000000000 65535 f \n';
    for (var offsetIndex = 1; offsetIndex < objects.length; offsetIndex += 1) {
      pdf += String(offsets[offsetIndex]).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += 'trailer\n<< /Size ' + objects.length + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';

    return new Blob([pdf], { type: 'application/pdf' });
  }

  function quotePdfLines() {
    var jobName = document.getElementById('jobName');
    var jobAddress = document.getElementById('jobAddress');
    var customerEmail = document.getElementById('customerEmail');
    var customerPhone = document.getElementById('customerPhone');
    var resultTitle = document.querySelector('.result-title');
    var resultSummary = document.querySelector('.result-summary');
    var total = document.querySelector('.quote-total strong');
    var selectedServices = document.querySelectorAll('.quoted-service[aria-pressed="true"]');
    var level = document.body.getAttribute('data-building-level') === MULTIPLE_LEVELS ? 'Multiple levels' : 'One story';
    var lines = [
      'NO PROBLEM PRESSURE WASHING SOLUTIONS LLC',
      'NO PROBLEM PRESSURE WASHING MATRIX(TM)',
      'CUSTOMER QUOTE',
      '',
      'Prepared: ' + new Date().toLocaleDateString('en-US'),
      jobName && jobName.value.trim() ? 'Project: ' + jobName.value.trim() : 'Project: Pressure washing service',
      jobAddress && jobAddress.value.trim() ? 'Property: ' + jobAddress.value.trim() : '',
      customerEmail && customerEmail.value.trim() ? 'Customer email: ' + customerEmail.value.trim() : '',
      customerPhone && customerPhone.value.trim() ? 'Customer phone: ' + customerPhone.value.trim() : '',
      'Building height: ' + level,
      '',
      'QUOTE SUMMARY',
      resultTitle ? resultTitle.textContent.trim() : '',
      resultSummary ? resultSummary.textContent.trim() : '',
      '',
      'SELECTED SERVICES'
    ].filter(function (line, index, array) {
      return line || (index > 0 && array[index - 1] !== '');
    });

    Array.prototype.forEach.call(selectedServices, function (service, index) {
      var name = service.querySelector('.service-name');
      var price = service.querySelector('.service-price');
      var meta = service.querySelector('.service-meta');
      var reason = service.querySelector('.service-reason');
      lines.push((index + 1) + '. ' + (name ? name.textContent.trim() : 'Service') + (price ? ' - ' + price.textContent.trim() : ''));
      if (meta) lines.push('   ' + meta.textContent.replace(/\s+/g, ' ').trim());
      if (reason) lines.push('   ' + reason.textContent.trim());
    });

    if (!selectedServices.length) lines.push('No services selected.');

    lines.push('');
    lines.push('SELECTED PLAN TOTAL: ' + (total ? total.textContent.trim() : 'To be confirmed'));
    lines.push('');
    lines.push('Estimate is photo-based. Final measurements, access, safety conditions, and scope are confirmed on site before work begins.');
    lines.push(level === 'Multiple levels'
      ? 'Multi-level exterior washing and selected roof soft washing are included with safe professional access equipment.'
      : 'Ground-level and one-story exterior washing are included. Roof cleaning is not included.');
    lines.push('');
    lines.push('No Problem Pressure Washing Matrix(TM)');
    lines.push('Cactus Byte Studios(TM) | All Rights Reserved');

    return lines;
  }

  function pdfFileName() {
    var jobName = document.getElementById('jobName');
    var base = jobName && jobName.value.trim() ? jobName.value.trim() : 'customer-quote';
    var safeBase = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'customer-quote';
    return 'no-problem-' + safeBase + '.pdf';
  }

  function downloadQuotePdf() {
    if (!document.querySelector('.quote-total')) {
      showNotice('Finish a quote before downloading the customer PDF.');
      return;
    }

    var blob = createPdfBlob(quotePdfLines());
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = pdfFileName();
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    showNotice('Customer quote PDF downloaded.');
  }

  function ensurePdfButton() {
    var quoteActions = document.querySelector('.quote-actions');
    if (!quoteActions || document.getElementById('downloadQuotePdfButton')) return;

    var button = document.createElement('button');
    button.className = 'button pdf-download-button';
    button.id = 'downloadQuotePdfButton';
    button.type = 'button';
    button.textContent = 'Download customer PDF';
    button.addEventListener('click', downloadQuotePdf);
    quoteActions.appendChild(button);
  }

  function observeResults() {
    var resultsMount = document.getElementById('resultsMount');
    if (!resultsMount || typeof MutationObserver !== 'function') return;

    var observer = new MutationObserver(function () {
      updateHouseWashLabels(document.body.getAttribute('data-building-level'), resultsMount);
      ensurePdfButton();
    });
    observer.observe(resultsMount, { childList: true, subtree: true });
    ensurePdfButton();
  }

  function init() {
    createCustomerFields();
    restoreCustomerContact();
    addCustomerContactEvents();
    createHeightSelector();
    addSelectorEvents();
    applyLevel(readSavedLevel());
    patchAnalysisRequest();
    observeResults();
  }

  init();
})();
