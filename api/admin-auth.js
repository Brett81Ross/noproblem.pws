const { createAdminSession, hasAdminSession, safeEqualString } = require('./_auth');

module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({ ok: hasAdminSession(req) });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const configuredPin = String(process.env.NP_ADMIN_PIN || '');
  if (!configuredPin) {
    return res.status(503).json({ ok: false, error: 'Admin access is not configured.' });
  }

  const submittedPin = String(req.body?.pin || '');
  if (!safeEqualString(submittedPin, configuredPin)) {
    return res.status(403).json({ ok: false, error: 'Invalid admin credentials.' });
  }

  if (!createAdminSession(res)) {
    return res.status(503).json({ ok: false, error: 'Admin session signing is not configured.' });
  }

  return res.status(200).json({ ok: true, role: 'admin' });
};
