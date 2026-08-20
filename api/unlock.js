const crypto = require('crypto');

const COOKIE_NAME = 'np_matrix_access';
const RETURN_URL = 'https://noproblem-pws.vercel.app/';
const ACTIVATION_TOKEN = 'np-matrix-stripe-2026-3free';

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

function signPayload(payload, secret) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
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

function writeState(res, state, secret) {
  const value = signPayload(state, secret);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
}

module.exports = function handler(req, res) {
  const secret = getSecret();
  if (!secret) return res.status(500).send('Activation unavailable.');

  const kind = String(req.query.kind || '');
  const token = String(req.query.token || '');
  if (token !== ACTIVATION_TOKEN || !['credit', 'lifetime'].includes(kind)) {
    return res.status(400).send('Invalid activation request.');
  }

  const state = readState(req, secret);
  if (kind === 'credit') state.paidCredits += 1;
  if (kind === 'lifetime') state.lifetime = true;
  writeState(res, state, secret);
  return res.redirect(302, RETURN_URL);
};
