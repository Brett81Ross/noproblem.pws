(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NPMatrixBackup = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA = 'no-problem-matrix-backup-v1';
  var APP_ID = 'noproblem';
  var APP_NAME = 'No Problem Pressure Washing Matrix';
  var VERSION = 1;
  var MAX_BYTES = 5 * 1024 * 1024;
  var MAX_DEPTH = 24;
  var MAX_ARRAY_ITEMS = 5000;

  var KEYS = Object.freeze({
    project: 'no-problem-matrix-last-project',
    settings: 'no-problem-matrix-settings-v1',
    inventory: 'no-problem-matrix-inventory-v1',
    contact: 'np_matrix_customer_contact'
  });

  var INVENTORY_IDS = new Set([
    'sh', 'surfactant', 'degreaser', 'rust-remover', 'oil-treatment',
    'surface-cleaner', 'pressure-washer', 'spray-gun', 'hp-hose', 'nozzle-set',
    'injector', 'hose-reel', 'glasses', 'gloves', 'hearing', 'vest',
    'oring-kit', 'quick-connect', 'thread-tape', 'contractor-bags'
  ]);

  var BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

  function byteLength(text) {
    var value = String(text || '');
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(value).length;
    if (typeof Buffer !== 'undefined') return Buffer.byteLength(value, 'utf8');
    return unescape(encodeURIComponent(value)).length;
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }

  function sanitizeJson(value, depth) {
    depth = depth || 0;
    if (depth > MAX_DEPTH) throw new Error('Backup contains data nested too deeply.');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_ITEMS) throw new Error('Backup contains an oversized array.');
      return value.map(function (item) { return sanitizeJson(item, depth + 1); });
    }
    if (!isPlainObject(value)) throw new Error('Backup contains an unsupported value.');
    var output = Object.create(null);
    Object.keys(value).forEach(function (key) {
      if (BLOCKED_KEYS.has(key)) return;
      output[key] = sanitizeJson(value[key], depth + 1);
    });
    return output;
  }

  function stableClone(value) {
    if (Array.isArray(value)) return value.map(stableClone);
    if (value && typeof value === 'object') {
      var output = {};
      Object.keys(value).sort().forEach(function (key) { output[key] = stableClone(value[key]); });
      return output;
    }
    return value;
  }

  function stableStringify(value) {
    return JSON.stringify(stableClone(value), null, 2);
  }

  function parseStored(storage, key) {
    var raw = storage.getItem(key);
    if (!raw) return null;
    try { return sanitizeJson(JSON.parse(raw)); } catch (error) { return null; }
  }

  function sanitizeSettings(value) {
    if (!isPlainObject(value)) return null;
    var minimum = Number(value.minimumJob);
    return Number.isFinite(minimum) && minimum >= 0 && minimum <= 10000
      ? { minimumJob: Math.round((minimum + Number.EPSILON) * 100) / 100 }
      : null;
  }

  function cleanText(value, limit) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, limit);
  }

  function sanitizeContact(value) {
    if (!isPlainObject(value)) return null;
    var email = cleanText(value.email, 120);
    var phone = cleanText(value.phone, 30);
    if (!email && !phone) return null;
    return { email: email, phone: phone };
  }

  function sanitizeInventory(value) {
    if (!Array.isArray(value)) return [];
    var seen = new Set();
    var output = [];
    value.forEach(function (item) {
      if (!isPlainObject(item)) return;
      var id = typeof item.id === 'string' ? item.id : '';
      if (!INVENTORY_IDS.has(id) || seen.has(id)) return;
      seen.add(id);
      var qty = item.qty === null || item.qty === undefined ? null : Number(item.qty);
      var min = item.min === null || item.min === undefined ? null : Number(item.min);
      output.push({
        id: id,
        qty: qty === null || !Number.isFinite(qty) ? null : Math.max(0, qty),
        min: min === null || !Number.isFinite(min) ? null : Math.max(0, min)
      });
    });
    return output;
  }

  function sanitizeStringArray(value, maxItems, maxLength) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, maxItems).filter(function (item) { return typeof item === 'string'; })
      .map(function (item) { return item.slice(0, maxLength); });
  }

  function sanitizeLocation(value) {
    if (!isPlainObject(value)) return null;
    var lat = Number(value.lat);
    var lon = Number(value.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    var output = { lat: lat, lon: lon };
    var accuracy = Number(value.accuracy);
    if (Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100000) output.accuracy = accuracy;
    return output;
  }

  function sanitizeProject(value) {
    if (!isPlainObject(value)) return null;
    if (!value.report || !isPlainObject(value.report)) return null;
    var output = {
      savedAt: cleanText(value.savedAt, 64),
      jobName: cleanText(value.jobName, 60),
      jobAddress: cleanText(value.jobAddress, 150),
      customerEmail: cleanText(value.customerEmail, 120),
      customerPhone: cleanText(value.customerPhone, 30),
      siteNotes: cleanText(value.siteNotes, 700),
      location: sanitizeLocation(value.location),
      report: sanitizeJson(value.report),
      activeServiceIds: sanitizeStringArray(value.activeServiceIds, 500, 160),
      completedProof: sanitizeStringArray(value.completedProof, 500, 160),
      quoteDiscountPercent: Math.max(0, Math.min(100, Number(value.quoteDiscountPercent) || 0)),
      quoteNotes: cleanText(value.quoteNotes, 700)
    };
    return output;
  }

  function exportData(storage, now) {
    if (!storage || typeof storage.getItem !== 'function') throw new Error('Storage is unavailable.');
    var payload = {
      schema: SCHEMA,
      appId: APP_ID,
      app: APP_NAME,
      version: VERSION,
      exportedAt: (now instanceof Date ? now : new Date()).toISOString(),
      data: {
        project: sanitizeProject(parseStored(storage, KEYS.project)),
        settings: sanitizeSettings(parseStored(storage, KEYS.settings)),
        inventory: sanitizeInventory(parseStored(storage, KEYS.inventory)),
        contact: sanitizeContact(parseStored(storage, KEYS.contact))
      },
      exclusions: [
        'HttpOnly access cookies, paid credits, lifetime entitlement state, staged photos, caches, service workers, and session state are intentionally excluded.'
      ]
    };
    var text = stableStringify(payload);
    if (byteLength(text) > MAX_BYTES) throw new Error('Backup is larger than the 5 MB safety limit.');
    return { payload: payload, text: text };
  }

  function parseBackup(input) {
    var text = typeof input === 'string' ? input : stableStringify(input);
    if (byteLength(text) > MAX_BYTES) throw new Error('Backup is larger than the 5 MB safety limit.');
    var parsed;
    try { parsed = typeof input === 'string' ? JSON.parse(input) : input; }
    catch (error) { throw new Error('Backup is not valid JSON.'); }
    parsed = sanitizeJson(parsed);
    if (!parsed || parsed.schema !== SCHEMA) throw new Error('This is not a supported No Problem Matrix backup.');
    if (parsed.appId !== APP_ID) throw new Error('Backup belongs to a different app.');
    if (!Number.isInteger(parsed.version) || parsed.version < 1 || parsed.version > VERSION) throw new Error('Backup version is not supported by this app version.');
    if (!isPlainObject(parsed.data)) throw new Error('Backup data is missing.');
    return {
      schema: SCHEMA,
      appId: APP_ID,
      app: APP_NAME,
      version: parsed.version,
      exportedAt: cleanText(parsed.exportedAt, 64),
      data: {
        project: sanitizeProject(parsed.data.project),
        settings: sanitizeSettings(parsed.data.settings),
        inventory: sanitizeInventory(parsed.data.inventory),
        contact: sanitizeContact(parsed.data.contact)
      }
    };
  }

  function chooseProject(current, backup) {
    return current || backup || null;
  }

  function mergeSettings(current, backup) {
    return current || backup || null;
  }

  function mergeContact(current, backup) {
    if (!current) return backup || null;
    if (!backup) return current;
    return {
      email: current.email || backup.email || '',
      phone: current.phone || backup.phone || ''
    };
  }

  function mergeInventory(current, backup) {
    var currentMap = new Map((current || []).map(function (item) { return [item.id, item]; }));
    var backupMap = new Map((backup || []).map(function (item) { return [item.id, item]; }));
    var ids = [];
    INVENTORY_IDS.forEach(function (id) { if (currentMap.has(id) || backupMap.has(id)) ids.push(id); });
    return ids.map(function (id) {
      var a = currentMap.get(id) || {};
      var b = backupMap.get(id) || {};
      return {
        id: id,
        qty: a.qty !== null && a.qty !== undefined ? a.qty : (b.qty !== undefined ? b.qty : null),
        min: a.min !== null && a.min !== undefined ? a.min : (b.min !== undefined ? b.min : null)
      };
    });
  }

  function serializeOrNull(value) {
    return value === null || value === undefined ? null : JSON.stringify(value);
  }

  function restoreRaw(storage, key, raw) {
    if (raw === null || raw === undefined) storage.removeItem(key);
    else storage.setItem(key, raw);
  }

  function mergeIntoStorage(storage, input) {
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') {
      throw new Error('Storage is unavailable.');
    }
    var backup = parseBackup(input);
    var before = {};
    Object.keys(KEYS).forEach(function (name) { before[name] = storage.getItem(KEYS[name]); });

    var current = {
      project: sanitizeProject(parseStored(storage, KEYS.project)),
      settings: sanitizeSettings(parseStored(storage, KEYS.settings)),
      inventory: sanitizeInventory(parseStored(storage, KEYS.inventory)),
      contact: sanitizeContact(parseStored(storage, KEYS.contact))
    };
    var merged = {
      project: chooseProject(current.project, backup.data.project),
      settings: mergeSettings(current.settings, backup.data.settings),
      inventory: mergeInventory(current.inventory, backup.data.inventory),
      contact: mergeContact(current.contact, backup.data.contact)
    };

    var writes = [
      ['project', KEYS.project, serializeOrNull(merged.project)],
      ['settings', KEYS.settings, serializeOrNull(merged.settings)],
      ['inventory', KEYS.inventory, merged.inventory.length ? JSON.stringify(merged.inventory) : null],
      ['contact', KEYS.contact, serializeOrNull(merged.contact)]
    ];

    try {
      writes.forEach(function (entry) { restoreRaw(storage, entry[1], entry[2]); });
    } catch (error) {
      try {
        writes.slice().reverse().forEach(function (entry) { restoreRaw(storage, entry[1], before[entry[0]]); });
      } catch (rollbackError) {
        var combined = new Error('Restore failed and storage rollback also failed. Do not clear the app; use the pre-import backup.');
        combined.cause = error;
        throw combined;
      }
      throw error;
    }

    return { merged: merged, backup: backup };
  }

  return Object.freeze({
    SCHEMA: SCHEMA,
    APP_ID: APP_ID,
    VERSION: VERSION,
    MAX_BYTES: MAX_BYTES,
    KEYS: KEYS,
    byteLength: byteLength,
    stableStringify: stableStringify,
    exportData: exportData,
    parseBackup: parseBackup,
    mergeIntoStorage: mergeIntoStorage
  });
}));
