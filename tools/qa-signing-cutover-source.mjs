import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const backup = read('matrix-backup.js');
const settings = read('settings.js');
const inventory = read('inventory.js');
const enhancements = read('enhancements.js');
const shell = read('api/shell.js');

function requireMarker(text, marker, label) {
  if (!text.includes(marker)) throw new Error(`${label}: missing ${marker}`);
}
function forbid(text, marker, label) {
  if (text.includes(marker)) throw new Error(`${label}: forbidden ${marker}`);
}

for (const key of [
  'no-problem-matrix-last-project',
  'no-problem-matrix-settings-v1',
  'no-problem-matrix-inventory-v1',
  'np_matrix_customer_contact'
]) requireMarker(backup, key, 'backup storage contract');

requireMarker(inventory, "no-problem-matrix-inventory-v1", 'inventory production contract');
requireMarker(enhancements, "np_matrix_customer_contact", 'contact production contract');
forbid(enhancements, 'np_matrix_building_level', 'automatic access parity');
forbid(enhancements, 'data-building-level', 'automatic access parity');
requireMarker(enhancements, 'Automatic access check:', 'automatic access parity');
requireMarker(enhancements, "detection: 'automatic'", 'automatic access parity');
requireMarker(enhancements, 'elevatedAccessIncluded: false', 'automatic access parity');

requireMarker(settings, 'Back up Matrix data', 'backup UI');
requireMarker(settings, 'Restore / merge backup', 'backup UI');
requireMarker(settings, 'no-problem-pre-import-', 'pre-import backup');
requireMarker(settings, 'engine.mergeIntoStorage(localStorage, text)', 'restore call');
if (settings.indexOf('no-problem-pre-import-') > settings.indexOf('engine.mergeIntoStorage(localStorage, text)')) {
  throw new Error('pre-import backup must be created before restore writes');
}
requireMarker(settings, '5 MB safety limit', 'restore safety limit');
requireMarker(settings, 'customer contact details', 'sensitive data warning');
requireMarker(settings, 'removeLegacyServiceWorker()', 'service-worker removal parity');

requireMarker(shell, '/matrix-backup.js', 'shell backup engine');
requireMarker(shell, '/settings.js', 'shell settings');
if (shell.indexOf("if (!html.includes('/matrix-backup.js'))") > shell.indexOf("if (!html.includes('/settings.js'))")) {
  throw new Error('backup engine must be injected before settings.js');
}

requireMarker(backup, "SCHEMA = 'no-problem-matrix-backup-v1'", 'backup schema');
requireMarker(backup, 'MAX_BYTES = 5 * 1024 * 1024', 'backup limit');
requireMarker(backup, "BLOCKED_KEYS = new Set(['__proto__', 'prototype', 'constructor'])", 'prototype sanitization');
forbid(backup, 'localStorage.clear(', 'non-destructive recovery');
forbid(settings, 'localStorage.clear(', 'non-destructive recovery UI');
forbid(backup, 'np_matrix_access', 'entitlement cookie exclusion');

console.log('No Problem signing-cutover source QA: PASS');
