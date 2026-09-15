const https = require('https');

function googleGet(path) {
  return new Promise((resolve, reject) => {
    const request = https.request({ hostname: 'www.googleapis.com', path, method: 'GET' }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (response.statusCode >= 400) return reject(new Error(parsed.error?.message || 'Identity verification failed'));
          resolve(parsed);
        } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

async function verifyCactusByteId(req) {
  const authorization = String(req.headers.authorization || req.headers.Authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('CactusByte ID is not configured');

  const token = match[1];
  // Firebase Identity Toolkit accounts:lookup verifies the supplied Firebase ID token
  // and returns the authenticated account. No UID supplied by the browser is trusted.
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!apiKey) throw new Error('CactusByte ID is not configured');

  const payload = JSON.stringify({ idToken: token });
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (response) => {
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          if (response.statusCode >= 400) return resolve(null);
          const user = parsed.users?.[0];
          if (!user?.localId) return resolve(null);
          resolve({ uid: user.localId, email: user.email || null, projectId });
        } catch (error) { reject(error); }
      });
    });
    request.on('error', reject);
    request.end(payload);
  });
}

module.exports = { verifyCactusByteId };
