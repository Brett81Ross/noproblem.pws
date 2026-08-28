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

    const demoScript = '    <script src="/demo-config.js" defer></script>';

    if (!html.includes('/demo-config.js')) {
      html = html.includes('</body>')
        ? html.replace('</body>', `${demoScript}\n</body>`)
        : `${html}\n${demoScript}`;
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
