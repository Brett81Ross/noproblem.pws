(function () {
  'use strict';

  var STORAGE_KEY = 'no-problem-matrix-inventory-v1';

  var DEFAULT_ITEMS = [
    { id: 'sh', category: 'Chemicals', name: 'Sodium Hypochlorite (SH)', unit: 'gal', min: 5 },
    { id: 'surfactant', category: 'Chemicals', name: 'Surfactant', unit: 'gal', min: 1 },
    { id: 'degreaser', category: 'Chemicals', name: 'Degreaser', unit: 'gal', min: 1 },
    { id: 'rust-remover', category: 'Chemicals', name: 'Rust Remover', unit: 'gal', min: 1 },
    { id: 'oil-treatment', category: 'Chemicals', name: 'Oil / Stain Treatment', unit: 'gal', min: 1 },

    { id: 'surface-cleaner', category: 'Equipment', name: 'Surface Cleaner', unit: 'unit', min: 1 },
    { id: 'pressure-washer', category: 'Equipment', name: 'Pressure Washer', unit: 'unit', min: 1 },
    { id: 'spray-gun', category: 'Equipment', name: 'Spray Gun / Wand', unit: 'unit', min: 2 },
    { id: 'hp-hose', category: 'Equipment', name: 'High-Pressure Hose', unit: 'hose', min: 2 },
    { id: 'nozzle-set', category: 'Equipment', name: 'Nozzle / Tip Set', unit: 'set', min: 2 },
    { id: 'injector', category: 'Equipment', name: 'Downstream Injector', unit: 'unit', min: 2 },
    { id: 'hose-reel', category: 'Equipment', name: 'Hose Reel', unit: 'unit', min: 1 },

    { id: 'glasses', category: 'PPE & Safety', name: 'Safety Glasses', unit: 'pair', min: 2 },
    { id: 'gloves', category: 'PPE & Safety', name: 'Chemical Gloves', unit: 'pair', min: 4 },
    { id: 'hearing', category: 'PPE & Safety', name: 'Hearing Protection', unit: 'set', min: 2 },
    { id: 'vest', category: 'PPE & Safety', name: 'High-Visibility Vest', unit: 'vest', min: 2 },

    { id: 'oring-kit', category: 'Consumables', name: 'O-Ring Kit', unit: 'kit', min: 2 },
    { id: 'quick-connect', category: 'Consumables', name: 'Quick-Connect Fittings', unit: 'fitting', min: 4 },
    { id: 'thread-tape', category: 'Consumables', name: 'Thread Seal Tape', unit: 'roll', min: 2 },
    { id: 'contractor-bags', category: 'Consumables', name: 'Contractor Bags', unit: 'bag', min: 10 }
  ];

  var state = {
    items: [],
    open: false
  };

  function cloneDefaults() {
    return DEFAULT_ITEMS.map(function (item) {
      return Object.assign({}, item, { qty: null });
    });
  }

  function loadItems() {
    var defaults = cloneDefaults();
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(saved)) return defaults;
      return defaults.map(function (base) {
        var match = saved.find(function (item) { return item && item.id === base.id; });
        if (!match) return base;
        var qty = match.qty === null || match.qty === undefined ? null : Math.max(0, Number(match.qty) || 0);
        var min = Math.max(0, Number(match.min));
        return Object.assign({}, base, {
          qty: qty,
          min: Number.isFinite(min) ? min : base.min
        });
      });
    } catch (error) {
      return defaults;
    }
  }

  function saveItems() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch (error) {}
  }

  function statusFor(item) {
    if (item.qty === null) return { key: 'unknown', label: 'Not counted' };
    if (item.qty <= 0) return { key: 'out', label: 'Out' };
    if (item.qty <= item.min) return { key: 'low', label: 'Low' };
    return { key: 'good', label: 'Good' };
  }

  function installStyles() {
    if (document.getElementById('supplyMatrixStyles')) return;
    var style = document.createElement('style');
    style.id = 'supplyMatrixStyles';
    style.textContent = [
      '.mode-switch.supply-enabled{grid-template-columns:repeat(3,minmax(0,1fr))}',
      '.supply-matrix-panel{display:none;margin-bottom:16px}',
      '.supply-matrix-panel.is-visible{display:block}',
      '.supply-card{position:relative;overflow:hidden;border:1px solid rgba(126,239,255,.16);border-radius:22px;background:linear-gradient(145deg,rgba(18,42,53,.94),rgba(6,16,23,.95));box-shadow:0 24px 70px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.035)}',
      '.supply-card:before{position:absolute;top:0;left:23px;width:76px;height:2px;background:#58efff;box-shadow:0 0 18px #58efff;content:""}',
      '.supply-inner{padding:20px}',
      '.supply-kicker{margin:0 0 6px;color:#58efff;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}',
      '.supply-title{margin:0 0 7px;color:#edfaff;font-size:clamp(22px,5vw,29px);letter-spacing:-.045em;line-height:1.05}',
      '.supply-copy{margin:0 0 16px;color:#8ca8b6;font-size:13px;line-height:1.5}',
      '.supply-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:14px}',
      '.supply-summary-card{padding:12px;border:1px solid rgba(126,239,255,.12);border-radius:13px;background:rgba(1,11,16,.42)}',
      '.supply-summary-card span{display:block;color:#7696a1;font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}',
      '.supply-summary-card strong{display:block;margin-top:4px;color:#e7fbff;font-size:19px;letter-spacing:-.04em}',
      '.supply-summary-card.low strong{color:#ffcf9c}',
      '.supply-summary-card.out strong{color:#ff9e9e}',
      '.supply-restock{margin-bottom:16px;padding:13px;border:1px solid rgba(255,173,93,.19);border-radius:14px;background:rgba(255,164,80,.06)}',
      '.supply-restock-head{display:flex;align-items:center;justify-content:space-between;gap:10px}',
      '.supply-restock-head strong{color:#ffd3a7;font-size:12px}',
      '.supply-restock-head button{padding:7px 9px;border:1px solid rgba(255,173,93,.28);border-radius:9px;color:#ffd3a7;background:transparent;cursor:pointer;font-size:9px;font-weight:900;text-transform:uppercase}',
      '.supply-restock-list{display:grid;gap:6px;margin-top:10px}',
      '.supply-restock-item{display:flex;justify-content:space-between;gap:12px;color:#a9bbc0;font-size:10px}',
      '.supply-restock-item b{color:#eefcff}',
      '.supply-category{margin:18px 0 8px;color:#d7f6fb;font-size:11px;font-weight:950;letter-spacing:.09em;text-transform:uppercase}',
      '.supply-list{display:grid;gap:9px}',
      '.supply-item{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:13px;border:1px solid rgba(126,239,255,.12);border-radius:14px;background:rgba(2,14,20,.48)}',
      '.supply-item-main{min-width:0}',
      '.supply-item-top{display:flex;flex-wrap:wrap;align-items:center;gap:7px}',
      '.supply-item-name{color:#ecfdff;font-size:12px;font-weight:900}',
      '.supply-status{padding:3px 6px;border-radius:999px;font-size:8px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}',
      '.supply-status.unknown{color:#a5c1c9;background:rgba(135,166,175,.1)}',
      '.supply-status.good{color:#d7ffa6;background:rgba(187,255,105,.1)}',
      '.supply-status.low{color:#ffd3a7;background:rgba(255,173,93,.1)}',
      '.supply-status.out{color:#ffc1c1;background:rgba(255,115,115,.11)}',
      '.supply-item-meta{margin-top:5px;color:#7797a2;font-size:9px;font-weight:700}',
      '.supply-controls{display:flex;align-items:center;gap:7px}',
      '.supply-step{display:grid;width:31px;height:31px;place-items:center;border:1px solid rgba(126,239,255,.2);border-radius:9px;color:#c8f7ff;background:rgba(3,18,25,.72);cursor:pointer;font-size:17px;font-weight:800}',
      '.supply-qty{min-width:42px;text-align:center;color:#f0feff;font-size:14px;font-weight:950}',
      '.supply-qty small{display:block;margin-top:1px;color:#6f8f99;font-size:8px;font-weight:800}',
      '.supply-note{margin-top:15px;color:#6f8f99;font-size:9px;line-height:1.45;text-align:center}',
      '@media(max-width:410px){.supply-inner{padding:17px}.supply-summary{grid-template-columns:1fr 1fr}.supply-summary-card:first-child{grid-column:1/-1}.supply-item{grid-template-columns:1fr}.supply-controls{justify-content:flex-start}.mode-switch.supply-enabled .mode-button{padding:9px 4px;font-size:10px;letter-spacing:.03em}}'
    ].join('');
    document.head.appendChild(style);
  }

  function createPanel() {
    if (document.getElementById('supplyMatrixPanel')) return;
    var nav = document.querySelector('.mode-switch');
    if (!nav) return;

    nav.classList.add('supply-enabled');

    var button = document.createElement('button');
    button.className = 'mode-button';
    button.id = 'inventoryModeButton';
    button.type = 'button';
    button.setAttribute('data-mode', 'inventory');
    button.textContent = 'Supply Matrix';
    button.addEventListener('click', openInventory);
    nav.appendChild(button);

    var quoteButton = document.getElementById('quoteModeButton');
    var crewButton = document.getElementById('crewModeButton');
    if (quoteButton) {
      quoteButton.textContent = 'Quote Matrix';
      quoteButton.addEventListener('click', closeInventory);
    }
    if (crewButton) crewButton.addEventListener('click', closeInventory);

    var panel = document.createElement('section');
    panel.id = 'supplyMatrixPanel';
    panel.className = 'supply-matrix-panel';
    panel.setAttribute('aria-live', 'polite');
    nav.insertAdjacentElement('afterend', panel);
    render();
  }

  function openInventory() {
    state.open = true;
    var panel = document.getElementById('supplyMatrixPanel');
    var button = document.getElementById('inventoryModeButton');
    var quoteButton = document.getElementById('quoteModeButton');
    var crewButton = document.getElementById('crewModeButton');
    if (panel) panel.classList.add('is-visible');
    if (button) button.classList.add('is-active');
    if (quoteButton) quoteButton.classList.remove('is-active');
    if (crewButton) crewButton.classList.remove('is-active');
    setEstimatorVisibility(false);
    render();
    setTimeout(function () {
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 30);
  }

  function closeInventory() {
    if (!state.open) return;
    state.open = false;
    var panel = document.getElementById('supplyMatrixPanel');
    var button = document.getElementById('inventoryModeButton');
    if (panel) panel.classList.remove('is-visible');
    if (button) button.classList.remove('is-active');
    setEstimatorVisibility(true);
  }

  function setEstimatorVisibility(visible) {
    ['missionCard', 'evidenceCard'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = visible ? '' : 'none';
    });
    var results = document.getElementById('resultsSection');
    if (results) results.style.display = visible ? '' : 'none';
  }

  function adjust(id, delta) {
    var item = state.items.find(function (entry) { return entry.id === id; });
    if (!item) return;
    var current = item.qty === null ? 0 : Number(item.qty) || 0;
    item.qty = Math.max(0, current + delta);
    saveItems();
    render();
  }

  function restockItems() {
    return state.items.filter(function (item) {
      return item.qty !== null && item.qty <= item.min;
    });
  }

  function copyRestockList() {
    var list = restockItems();
    var text = list.length ? ['NO PROBLEM — SUPPLY MATRIX RESTOCK LIST', ''].concat(list.map(function (item) {
      var target = Math.max(item.min + 1, item.min * 2);
      var needed = Math.max(1, target - item.qty);
      return '- ' + item.name + ': buy ' + needed + ' ' + item.unit + (needed === 1 ? '' : 's') + ' (on hand ' + item.qty + ')';
    })).join('\n') : 'Supply Matrix restock list is clear.';

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        flashButton('Restock list copied');
      }).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (error) {}
    document.body.removeChild(area);
    flashButton('Restock list copied');
  }

  function flashButton(message) {
    var button = document.getElementById('copyRestockButton');
    if (!button) return;
    var old = button.textContent;
    button.textContent = message;
    setTimeout(function () { button.textContent = old; }, 1600);
  }

  function render() {
    var panel = document.getElementById('supplyMatrixPanel');
    if (!panel) return;

    var statuses = state.items.map(statusFor);
    var counted = state.items.filter(function (item) { return item.qty !== null; }).length;
    var low = statuses.filter(function (status) { return status.key === 'low'; }).length;
    var out = statuses.filter(function (status) { return status.key === 'out'; }).length;
    var restock = restockItems();

    var categories = ['Chemicals', 'Equipment', 'PPE & Safety', 'Consumables'];
    var categoryHtml = categories.map(function (category) {
      var rows = state.items.filter(function (item) { return item.category === category; }).map(function (item) {
        var status = statusFor(item);
        var qtyLabel = item.qty === null ? '—' : String(item.qty);
        return [
          '<div class="supply-item">',
          '<div class="supply-item-main">',
          '<div class="supply-item-top"><span class="supply-item-name">', escapeHtml(item.name), '</span><span class="supply-status ', status.key, '">', status.label, '</span></div>',
          '<div class="supply-item-meta">Minimum stock: ', escapeHtml(String(item.min)), ' ', escapeHtml(item.unit), item.min === 1 ? '' : 's', '</div>',
          '</div>',
          '<div class="supply-controls">',
          '<button class="supply-step" type="button" data-stock-id="', escapeHtml(item.id), '" data-delta="-1" aria-label="Decrease ', escapeHtml(item.name), '">−</button>',
          '<div class="supply-qty">', qtyLabel, '<small>', escapeHtml(item.unit), '</small></div>',
          '<button class="supply-step" type="button" data-stock-id="', escapeHtml(item.id), '" data-delta="1" aria-label="Increase ', escapeHtml(item.name), '">+</button>',
          '</div>',
          '</div>'
        ].join('');
      }).join('');
      return '<div class="supply-category">' + escapeHtml(category) + '</div><div class="supply-list">' + rows + '</div>';
    }).join('');

    var restockHtml = restock.length ? restock.map(function (item) {
      var status = statusFor(item);
      return '<div class="supply-restock-item"><b>' + escapeHtml(item.name) + '</b><span>' + escapeHtml(status.label) + ' · ' + escapeHtml(String(item.qty)) + ' ' + escapeHtml(item.unit) + '</span></div>';
    }).join('') : '<div class="supply-restock-item"><b>Nothing on the restock list.</b><span>All counted items are above minimum.</span></div>';

    panel.innerHTML = [
      '<div class="supply-card"><div class="supply-inner">',
      '<p class="supply-kicker">Inventory command</p>',
      '<h2 class="supply-title">Supply Matrix™</h2>',
      '<p class="supply-copy">Track chemicals, equipment, PPE, and consumables from the same app. Tap + or − as stock changes and the Matrix builds your restock list automatically.</p>',
      '<div class="supply-summary">',
      '<div class="supply-summary-card"><span>Counted</span><strong>', counted, '/', state.items.length, '</strong></div>',
      '<div class="supply-summary-card low"><span>Low stock</span><strong>', low, '</strong></div>',
      '<div class="supply-summary-card out"><span>Out</span><strong>', out, '</strong></div>',
      '</div>',
      '<div class="supply-restock"><div class="supply-restock-head"><strong>Restock List</strong><button id="copyRestockButton" type="button">Copy list</button></div><div class="supply-restock-list">', restockHtml, '</div></div>',
      categoryHtml,
      '<p class="supply-note">Counts are stored on this device. Items you have not counted yet show “Not counted” instead of guessing your stock.</p>',
      '</div></div>'
    ].join('');

    Array.prototype.forEach.call(panel.querySelectorAll('[data-stock-id]'), function (button) {
      button.addEventListener('click', function () {
        adjust(button.getAttribute('data-stock-id'), Number(button.getAttribute('data-delta')) || 0);
      });
    });

    var copyButton = document.getElementById('copyRestockButton');
    if (copyButton) copyButton.addEventListener('click', copyRestockList);
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  state.items = loadItems();
  installStyles();
  createPanel();
}());
