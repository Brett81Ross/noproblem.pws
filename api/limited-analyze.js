const crypto = require('crypto');
const analyzeHandler = require('./analyze');

const FREE_SCANS_PER_MONTH = 3;
const COOKIE_NAME = 'np_matrix_access';
const CREDIT_LINK = 'https://buy.stripe.com/eVq4gA9UDbXx7KaeSx1Jm02';
const LIFETIME_LINK = 'https://buy.stripe.com/aFa4gAd6P3r11lMbGl1Jm01';

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
  const cookies = parseCookies(req);
  const raw = cookies[COOKIE_NAME];
  const fallback = { month: currentMonthKey(), freeUsed: 0, paidCredits: 0, lifetime: false };
  if (!raw) return fallback;

  const [encoded, signature] = raw.split('.');
  if (!encoded || !signature) return fallback;

  const expected = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fallback;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    const state = {
      month: parsed.month || currentMonthKey(),
      freeUsed: Number.isFinite(Number(parsed.freeUsed)) ? Math.max(0, Number(parsed.freeUsed)) : 0,
      paidCredits: Number.isFinite(Number(parsed.paidCredits)) ? Math.max(0, Number(parsed.paidCredits)) : 0,
      lifetime: parsed.lifetime === true,
    };
    if (state.month !== currentMonthKey()) {
      state.month = currentMonthKey();
      state.freeUsed = 0;
    }
    return state;
  } catch {
    return fallback;
  }
}

function writeState(res, state, secret) {
  const value = signPayload(state, secret);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
}

function usageSnapshot(state) {
  return {
    month: state.month,
    freeLimit: FREE_SCANS_PER_MONTH,
    freeUsed: Math.min(state.freeUsed, FREE_SCANS_PER_MONTH),
    freeRemaining: Math.max(0, FREE_SCANS_PER_MONTH - state.freeUsed),
    paidCredits: state.paidCredits,
    lifetime: state.lifetime,
  };
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed - POST requirements active.' });
  }

  const secret = getSecret();
  if (!secret) {
    return res.status(500).json({ error: 'Usage gate is unavailable because the server secret is missing.' });
  }

  const state = readState(req, secret);
  let consume = null;

  if (!state.lifetime) {
    if (state.paidCredits > 0) {
      consume = 'paid';
    } else if (state.freeUsed < FREE_SCANS_PER_MONTH) {
      consume = 'free';
    } else {
      return res.status(402).json({
        error: `You have used all ${FREE_SCANS_PER_MONTH} free Matrix scans for this month. Buy 1 Scan Credit for $2: ${CREDIT_LINK}  |  Lifetime Access for $99: ${LIFETIME_LINK}`,
        paymentRequired: true,
        paymentLinks: {
          credit: CREDIT_LINK,
          lifetime: LIFETIME_LINK,
        },
        usage: usageSnapshot(state),
      });
    }
  }

  const originalStatus = res.status.bind(res);
  const originalJson = res.json.bind(res);
  let statusCode = 200;

  res.status = function patchedStatus(code) {
    statusCode = code;
    return originalStatus(code);
  };

  res.json = function patchedJson(payload) {
    if (statusCode >= 200 && statusCode < 300 && payload && payload.success === true) {
      if (consume === 'paid') state.paidCredits = Math.max(0, state.paidCredits - 1);
      if (consume === 'free') state.freeUsed += 1;
      writeState(res, state, secret);
      payload.usage = usageSnapshot(state);
    }
    return originalJson(payload);
  };

  return analyzeHandler(req, res);
}

module.exports = handler;
module.exports.config = analyzeHandler.config || {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};
