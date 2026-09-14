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

function productionRuntimeFiles() {
  return filesUnder(root).filter((file) => {
    const rel = path.relative(root, file);
    return !rel.startsWith(`tests${path.sep}`) && rel !== 'index.html';
  });
}

test('production runtime source contains no hard-coded admin PIN credential', () => {
  const offenders = [];
  const assignmentPattern = /^\s*(?:const|let|var)\s+(?:ADMIN_PIN|adminPin|admin_pin)\s*=\s*["'`]/im;
  for (const file of productionRuntimeFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    if (assignmentPattern.test(source)) offenders.push(path.relative(root, file));
  }
  assert.deepEqual(offenders, [], `Hard-coded admin credential found in runtime source: ${offenders.join(', ')}`);
});

test('legacy index is not the production-served index route', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const indexRoute = vercel.routes.find((route) => route.src === '/index.html');
  assert.equal(indexRoute?.dest, '/api/demo-shell');
});

test('production demo shell strips the legacy PIN and defaults to technician mode', () => {
  const source = fs.readFileSync(path.join(root, 'api', 'demo-shell.js'), 'utf8');
  assert.match(source, /replace\(\/\\s\*const ADMIN_PIN/);
  assert.match(source, /let isTechMode = true/);
  assert.match(source, /setAppMode\('tech'\)/);
  assert.match(source, /fetch\('\/api\/admin-auth'/);
});

test('admin authorization is verified against server environment and signed session state', () => {
  const source = fs.readFileSync(path.join(root, 'api', 'admin-auth.js'), 'utf8');
  const auth = fs.readFileSync(path.join(root, 'api', '_auth.js'), 'utf8');
  assert.match(source, /process\.env\.NP_ADMIN_PIN/);
  assert.match(source, /safeEqualString/);
  assert.match(auth, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(auth, /timingSafeEqual/);
});

test('entitlement activation secret is not hard-coded in repository runtime source', () => {
  const offenders = [];
  for (const file of productionRuntimeFiles()) {
    const source = fs.readFileSync(file, 'utf8');
    if (/const\s+ACTIVATION_TOKEN\s*=\s*["'`][^"'`]+["'`]/.test(source)) offenders.push(path.relative(root, file));
  }
  assert.deepEqual(offenders, [], `Hard-coded activation secret found in: ${offenders.join(', ')}`);
  const unlock = fs.readFileSync(path.join(root, 'api', 'unlock.js'), 'utf8');
  assert.match(unlock, /process\.env\.NP_ACTIVATION_TOKEN/);
});

test('analysis route enforces server-side pricing authority', () => {
  const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  const analyzeRoute = vercel.routes.find((route) => route.src === '/api/analyze');
  assert.equal(analyzeRoute?.dest, '/api/secure-analyze');
  const source = fs.readFileSync(path.join(root, 'api', 'secure-analyze.js'), 'utf8');
  assert.match(source, /if \(!isAdmin\) \{\s*req\.body\.settings = \{\};/s);
  assert.match(source, /delete safeService\.calculatedPrice/);
});
