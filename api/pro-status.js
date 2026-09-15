const https = require('https');

function stripeGet(path, secret) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'api.stripe.com', path, method: 'GET', headers: { Authorization: `Bearer ${secret}` } }, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (resp.statusCode >= 400) return reject(new Error(parsed.error?.message || 'Stripe request failed'));
          resolve(parsed);
        } catch (err) { reject(err); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return res.status(503).json({ pro: false, reason: 'billing_unavailable' });

  // Identity must come from trusted server-authenticated state before this endpoint
  // can grant access. Until that identity layer exists, fail closed rather than
  // accepting customer/subscription identifiers from the browser.
  const customerId = req.authenticatedStripeCustomerId;
  if (!customerId) return res.status(401).json({ pro: false, reason: 'authentication_required' });

  try {
    const query = new URLSearchParams({ customer: customerId, status: 'all', limit: '100' });
    const result = await stripeGet(`/v1/subscriptions?${query}`, secret);
    const active = (result.data || []).some((subscription) => {
      const metadata = subscription.metadata || {};
      const appMatches = metadata.cactusbyte_app === 'noproblem' || metadata.app === 'noproblem';
      return appMatches && ['active', 'trialing'].includes(subscription.status);
    });
    return res.status(200).json({ pro: active });
  } catch {
    return res.status(502).json({ pro: false, reason: 'stripe_lookup_failed' });
  }
};
