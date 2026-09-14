const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'coverage']);
const textExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.html', '.json', '.mjs', '.cjs']);

function filesUnder(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (textExtensions.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

test('client-shipped source contains no hard-coded admin PIN credential', () => {
  const offenders = [];
  for (const file of filesUnder(root)) {
    if (file.includes(`${path.sep}tests${path.sep}`)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/ADMIN_PIN\s*=|adminPin\s*=|admin_pin\s*=/i.test(source)) {
      offenders.push(path.relative(root, file));
    }
  }
  assert.deepEqual(offenders, [], `Hard-coded admin credential found in: ${offenders.join(', ')}`);
});

test('legacy default admin PIN 1234 is not shipped as an authorization credential', () => {
  const offenders = [];
  for (const file of filesUnder(root)) {
    if (file.includes(`${path.sep}tests${path.sep}`)) continue;
    const source = fs.readFileSync(file, 'utf8');
    if (/(ADMIN|STAFF|TECHNICIAN)[^\n]{0,80}["'`]1234["'`]|["'`]1234["'`][^\n]{0,80}(ADMIN|STAFF|TECHNICIAN)/i.test(source)) {
      offenders.push(path.relative(root, file));
    }
  }
  assert.deepEqual(offenders, [], `Legacy admin PIN credential found in: ${offenders.join(', ')}`);
});