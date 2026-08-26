const crypto = require('crypto');

const COOKIE_NAME = 'np_matrix_access';
const RETURN_URL = 'https://noproblem-pws.vercel.app/';
const CACTUSBYTE_VERIFY_URL = 'https://cactusbyte-studios.vercel.app/api/tester/consume-app-token';
const APP_ID = 'noproblem';

function getSecret() {
  return process.env.NP_USAGE_SECRET || process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_3 || process.env.Gemini_API_Key_3;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}

function readState(req, secret) {
  const fallback = { month: currentMonthKey(), freeUsed: 0, paidCredits: 0, lifetime: false };
  const raw = parseCookies(req)[COOKIE_NAME];
  if (!raw) return fallback;
  const [encoded, signature] = raw.split('.');
  if (!encoded || !signature) return fallback;
  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fallback;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return {
      month: parsed.month === currentMonthKey() ? parsed.month : currentMonthKey(),
      freeUsed: parsed.month === currentMonthKey() ? Math.max(0, Number(parsed.freeUsed) || 0) : 0,
      paidCredits: Math.max(0, Number(parsed.paidCredits) || 0),
      lifetime: parsed.lifetime === true,
    };
  } catch {
    return fallback;
  }
}

function writeLifetimeState(res, state, secret) {
  const encoded = Buffer.from(JSON.stringify({ ...state, lifetime: true })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encoded}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=315360000`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).send('Method not allowed.');
  const secret = getSecret();
  if (!secret) return res.status(503).send('VIP activation unavailable.');
  const token = String(req.query.token || '').trim();
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return res.status(400).send('Invalid VIP activation token.');

  try {
    const response = await fetch(CACTUSBYTE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appId: APP_ID }),
      cache: 'no-store',
    });
    if (!response.ok) return res.status(403).send('VIP activation expired or already used.');
    const payload = await response.json().catch(() => ({}));
    if (payload?.ok !== true || payload?.status !== 'lifetime' || payload?.appId !== APP_ID) {
      return res.status(403).send('VIP activation could not be verified.');
    }
    const state = readState(req, secret);
    writeLifetimeState(res, state, secret);
    return res.redirect(302, RETURN_URL);
  } catch (error) {
    console.error('CactusByte VIP activation failed', error);
    return res.status(503).send('VIP activation is temporarily unavailable.');
  }
};
