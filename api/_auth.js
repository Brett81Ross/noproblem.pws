const crypto = require('crypto');

const ADMIN_COOKIE = 'np_admin_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function getSessionSecret() {
  return process.env.NP_ADMIN_SESSION_SECRET || process.env.NP_USAGE_SECRET || '';
}

function safeEqualString(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function sign(encoded, secret) {
  return crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
}

function createAdminSession(res) {
  const secret = getSessionSecret();
  if (!secret) return false;
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString('base64url');
  const signature = sign(payload, secret);
  res.setHeader('Set-Cookie', `${ADMIN_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`);
  return true;
}

function hasAdminSession(req) {
  const secret = getSessionSecret();
  if (!secret) return false;
  const raw = parseCookies(req)[ADMIN_COOKIE];
  if (!raw) return false;
  const [encoded, signature] = raw.split('.');
  if (!encoded || !signature) return false;
  const expected = sign(encoded, secret);
  if (!safeEqualString(signature, expected)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return payload?.role === 'admin' && Number(payload.exp) > Date.now();
  } catch {
    return false;
  }
}

module.exports = { createAdminSession, hasAdminSession, safeEqualString };
