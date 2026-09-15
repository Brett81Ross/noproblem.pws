const crypto = require('crypto');

function parseStripeSignature(header) {
  const parts = String(header || '').split(',');
  const out = {};
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key && value) (out[key] ||= []).push(value);
  }
  return { timestamp: out.t?.[0], signatures: out.v1 || [] };
}

function verifyStripeSignature(rawBody, header, secret) {
  const { timestamp, signatures } = parseStripeSignature(header);
  if (!timestamp || !signatures.length || !secret) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signatures.some((sig) => {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function isNoProblemSubscription(object) {
  const metadata = object?.metadata || {};
  return metadata.cactusbyte_app === 'noproblem' || metadata.app === 'noproblem';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body || '');
  const signature = req.headers['stripe-signature'];
  if (!verifyStripeSignature(rawBody, signature, secret)) return res.status(400).send('Invalid Stripe signature.');

  let event;
  try { event = JSON.parse(rawBody); } catch { return res.status(400).send('Invalid payload.'); }

  const supported = new Set([
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
  ]);
  if (!supported.has(event.type)) return res.status(200).json({ received: true, ignored: true });

  const subscription = event.data?.object;
  if (!isNoProblemSubscription(subscription)) return res.status(200).json({ received: true, ignored: true });

  // Stripe remains the entitlement authority. No client-provided flag can grant Pro.
  // Persistence is intentionally not invented here; pro-status performs authoritative
  // server-side Stripe lookup until a dedicated entitlement store is approved.
  return res.status(200).json({ received: true, app: 'noproblem', status: subscription.status });
};

module.exports.verifyStripeSignature = verifyStripeSignature;
