const https = require('https');
const { verifyCactusByteId } = require('./_cactusbyte-id');

function firestoreGet(path, token) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'firestore.googleapis.com',
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          resolve({ status: response.statusCode, body: parsed });
        } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  let identity;
  try { identity = await verifyCactusByteId(req); }
  catch { return res.status(503).json({ pro: false, reason: 'identity_unavailable' }); }
  if (!identity?.uid) return res.status(401).json({ pro: false, reason: 'authentication_required' });

  const authorization = String(req.headers.authorization || req.headers.Authorization || '');
  const token = authorization.replace(/^Bearer\s+/i, '');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const database = process.env.FIREBASE_DATABASE_ID || '(default)';
  const documentPath = `/v1/projects/${encodeURIComponent(projectId)}/databases/${encodeURIComponent(database)}/documents/users/${encodeURIComponent(identity.uid)}/entitlements/noproblem`;

  try {
    const result = await firestoreGet(documentPath, token);
    if (result.status === 404) return res.status(200).json({ pro: false });
    if (result.status >= 400) return res.status(502).json({ pro: false, reason: 'entitlement_lookup_failed' });

    const fields = result.body?.fields || {};
    const active = fields.active?.booleanValue === true;
    const status = fields.status?.stringValue || '';
    const app = fields.app?.stringValue || fields.appId?.stringValue || 'noproblem';
    const pro = app === 'noproblem' && active && !['canceled', 'cancelled', 'inactive', 'expired'].includes(status.toLowerCase());
    return res.status(200).json({ pro });
  } catch {
    return res.status(502).json({ pro: false, reason: 'entitlement_lookup_failed' });
  }
};
