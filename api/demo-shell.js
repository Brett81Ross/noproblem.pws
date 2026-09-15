/* No Problem Pressure Washing Matrix™ — optional 60-second live demo wrapper */
module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }

  try {
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = req.headers.host;
    if (!host) throw new Error('Missing host');

    const upstream = await fetch(`${proto}://${host}/api/shell`, {
      headers: {
        'user-agent': req.headers['user-agent'] || 'NoProblemMatrixDemoShell/1.0',
        'accept': 'text/html,*/*'
      }
    });

    if (!upstream.ok) throw new Error(`Base shell returned ${upstream.status}`);
    let html = await upstream.text();

    html = html
      .replace(/\s*const ADMIN_PIN = ["'][^"']+["'];?/, '')
      .replace('let isTechMode = false;', 'let isTechMode = true;\n        let adminAuthorized = false;')
      .replace('<div class="mode-btn active" id="btnAdminMode" onclick="requestAdminMode()">Admin Mode</div>\n                <div class="mode-btn" id="btnTechMode" onclick="setAppMode(\'tech\')">Technician Mode</div>', '<div class="mode-btn" id="btnAdminMode" onclick="requestAdminMode()">Admin Mode</div>\n                <div class="mode-btn active" id="btnTechMode" onclick="setAppMode(\'tech\')">Technician Mode</div>')
      .replace('function setAppMode(mode) {\n            isTechMode = (mode === \'tech\');', 'function setAppMode(mode) {\n            if (mode === \'admin\' && !adminAuthorized) return requestAdminMode();\n            isTechMode = (mode === \'tech\');')
      .replace(/function requestAdminMode\(\) \{[\s\S]*?\n        \}/, `async function requestAdminMode() {
            if (!isTechMode && adminAuthorized) return;
            const enteredPin = prompt(currentLang === 'es' ? "Ingrese el PIN de Administrador:" : "Enter Admin PIN to switch modes:");
            if (enteredPin === null) return;
            try {
                const response = await fetch('/api/admin-auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pin: enteredPin })
                });
                const payload = await response.json().catch(() => ({}));
                if (!response.ok || payload.ok !== true) throw new Error('unauthorized');
                adminAuthorized = true;
                setAppMode('admin');
            } catch {
                alert(currentLang === 'es' ? "PIN de Administrador incorrecto." : "Incorrect Admin PIN.");
            }
        }`)
      .replace("document.getElementById('satelliteModal').style.display = 'none';", "document.getElementById('satelliteModal').style.display = 'none';\n            setAppMode('tech');");

    const scripts = [
      '    <script src="/demo-config.js" defer></script>',
      '    <script src="/native-install.js" defer></script>'
    ];

    for (const script of scripts) {
      const src = script.match(/src="([^"]+)/)?.[1];
      if (!src || html.includes(src)) continue;
      html = html.includes('</body>')
        ? html.replace('</body>', `${script}\n</body>`)
        : `${html}\n${script}`;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    if (req.method === 'HEAD') return res.end();
    return res.end(html);
  } catch (error) {
    console.error('Demo shell failed:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('No Problem Matrix is temporarily unavailable. Please try again.');
  }
};
