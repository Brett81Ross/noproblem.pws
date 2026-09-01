import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const backup = require('../matrix-backup.js');

class MemoryStorage {
  constructor(seed = {}, failAt = 0) { this.map = new Map(Object.entries(seed)); this.failAt = failAt; this.writes = 0; }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.writes += 1; if (this.failAt && this.writes === this.failAt) throw new Error('simulated write failure'); this.map.set(key, String(value)); }
  removeItem(key) { this.writes += 1; if (this.failAt && this.writes === this.failAt) throw new Error('simulated write failure'); this.map.delete(key); }
}

const project = {
  savedAt: '2026-09-01T12:00:00.000Z', jobName: 'Jones driveway', jobAddress: '123 Main St',
  customerEmail: 'customer@example.com', customerPhone: '405-555-0123', siteNotes: 'Protect roses',
  location: { lat: 35.46, lon: -97.51, accuracy: 8 }, report: { services: [{ serviceId: 'driveway_cleaning', calculatedPrice: 149 }] },
  activeServiceIds: ['driveway_cleaning-0'], completedProof: ['perimeter'], quoteDiscountPercent: 5, quoteNotes: 'Call first'
};
const inventory = [
  { id: 'sh', qty: 8, min: 5, name: 'ignored metadata' },
  { id: 'gloves', qty: 3, min: 4 },
  { id: 'unknown-future', qty: 99, min: 1 }
];
const seed = {
  [backup.KEYS.project]: JSON.stringify(project),
  [backup.KEYS.settings]: JSON.stringify({ minimumJob: 119.99 }),
  [backup.KEYS.inventory]: JSON.stringify(inventory),
  [backup.KEYS.contact]: JSON.stringify({ email: 'customer@example.com', phone: '405-555-0123' })
};

const exported = backup.exportData(new MemoryStorage(seed), new Date('2026-09-01T13:00:00.000Z'));
assert.equal(exported.payload.schema, 'no-problem-matrix-backup-v1');
assert.equal(exported.payload.appId, 'noproblem');
assert.equal(exported.payload.version, 1);
assert.equal(exported.payload.data.project.customerEmail, 'customer@example.com');
assert.equal(exported.payload.data.inventory.length, 2, 'unknown inventory ids must not be exported');
assert.match(exported.text, /HttpOnly access cookies/);
assert.doesNotMatch(exported.text, /np_matrix_access/);

assert.throws(() => backup.parseBackup('{not-json'), /valid JSON/);
assert.throws(() => backup.parseBackup(JSON.stringify({ ...exported.payload, appId: 'other-app' })), /different app/);
assert.throws(() => backup.parseBackup(JSON.stringify({ ...exported.payload, schema: 'other-schema' })), /supported No Problem/);
assert.throws(() => backup.parseBackup(JSON.stringify({ ...exported.payload, version: 2 })), /version/);
assert.throws(() => backup.parseBackup(' '.repeat(backup.MAX_BYTES + 1)), /5 MB/);

const polluted = JSON.parse(exported.text);
polluted.data.project.report = JSON.parse('{"ok":true,"__proto__":{"polluted":"yes"},"constructor":{"prototype":{"polluted":"yes"}}}');
const cleanPolluted = backup.parseBackup(JSON.stringify(polluted));
assert.equal(cleanPolluted.data.project.report.ok, true);
assert.equal(Object.prototype.polluted, undefined);
assert.equal(Object.hasOwn(cleanPolluted.data.project.report, '__proto__'), false);
assert.equal(Object.hasOwn(cleanPolluted.data.project.report, 'constructor'), false);

const empty = new MemoryStorage();
backup.mergeIntoStorage(empty, exported.text);
assert.deepEqual(JSON.parse(empty.getItem(backup.KEYS.project)).jobName, 'Jones driveway');
assert.equal(JSON.parse(empty.getItem(backup.KEYS.settings)).minimumJob, 119.99);
assert.equal(JSON.parse(empty.getItem(backup.KEYS.inventory)).find(x => x.id === 'sh').qty, 8);
assert.equal(JSON.parse(empty.getItem(backup.KEYS.contact)).phone, '405-555-0123');

const currentProject = { ...project, jobName: 'Current device project', customerEmail: 'current@example.com' };
const current = new MemoryStorage({
  [backup.KEYS.project]: JSON.stringify(currentProject),
  [backup.KEYS.settings]: JSON.stringify({ minimumJob: 129.99 }),
  [backup.KEYS.inventory]: JSON.stringify([{ id: 'sh', qty: 2, min: 7 }, { id: 'gloves', qty: null, min: null }]),
  [backup.KEYS.contact]: JSON.stringify({ email: 'current@example.com', phone: '' })
});
backup.mergeIntoStorage(current, exported.text);
assert.equal(JSON.parse(current.getItem(backup.KEYS.project)).jobName, 'Current device project', 'current project must win');
assert.equal(JSON.parse(current.getItem(backup.KEYS.settings)).minimumJob, 129.99, 'current settings must win');
const mergedInventory = JSON.parse(current.getItem(backup.KEYS.inventory));
assert.equal(mergedInventory.find(x => x.id === 'sh').qty, 2, 'current inventory count must win');
assert.equal(mergedInventory.find(x => x.id === 'sh').min, 7, 'current inventory minimum must win');
assert.equal(mergedInventory.find(x => x.id === 'gloves').qty, 3, 'backup fills missing current inventory values');
const mergedContact = JSON.parse(current.getItem(backup.KEYS.contact));
assert.equal(mergedContact.email, 'current@example.com');
assert.equal(mergedContact.phone, '405-555-0123', 'backup fills blank current contact field');

const before = { ...seed };
const failing = new MemoryStorage(before, 3);
assert.throws(() => backup.mergeIntoStorage(failing, exported.text), /simulated write failure/);
for (const [key, value] of Object.entries(before)) assert.equal(failing.getItem(key), value, 'rollback must restore ' + key);

const roundTrip = new MemoryStorage();
const result = backup.mergeIntoStorage(roundTrip, backup.exportData(new MemoryStorage(seed)).text);
assert.equal(result.backup.appId, 'noproblem');
assert.equal(JSON.parse(roundTrip.getItem(backup.KEYS.project)).jobAddress, '123 Main St');

console.log('No Problem signing-cutover backup/restore QA: PASS');
