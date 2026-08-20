const UPSTREAM = 'https://noproblem-366sn8eq2-brett-ross-projects1.vercel.app/';

function replaceOrInject(html, pattern, replacement, fallbackMarker, fallbackContent) {
  if (pattern.test(html)) return html.replace(pattern, replacement);
  return html.replace(fallbackMarker, fallbackContent + fallbackMarker);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end('Method Not Allowed');
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      headers: {
        'user-agent': req.headers['user-agent'] || 'NoProblemMatrixShell/1.2'
      }
    });

    if (!upstream.ok) {
      throw new Error(`Upstream returned ${upstream.status}`);
    }

    let html = await upstream.text();

    const headAdditions = `
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="icon" type="image/webp" sizes="192x192" href="/app-icon-192.webp">
    <meta property="og:title" content="No Problem Pressure Washing Matrix™">
    <meta property="og:description" content="Photo-to-plan estimating, field diagnostics, safety checks, crew workflow, and Supply Matrix inventory for No Problem Pressure Washing.">
    <meta property="og:type" content="website">
    <meta property="og:image" content="https://noproblem-pws.vercel.app/brand-logo.webp">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="No Problem Pressure Washing Matrix™">
    <meta name="twitter:description" content="Photo-to-plan estimating, field diagnostics, crew workflow, and Supply Matrix inventory.">
    <meta name="twitter:image" content="https://noproblem-pws.vercel.app/brand-logo.webp">
    <style id="matrixBrandPolish">
      .brand-stage { background: transparent !important; }
      .brand-logo {
        background: transparent !important;
        mix-blend-mode: normal !important;
        filter: drop-shadow(0 10px 22px rgba(0,196,230,.24)) !important;
      }
    </style>
    `;

    html = replaceOrInject(
      html,
      /<img\s+class=["']brand-logo["'][^>]*>/i,
      '<img class="brand-logo" src="/brand-logo-transparent.webp" alt="No Problem Pressure Washing Matrix™">',
      '</head>',
      ''
    );

    html = replaceOrInject(
      html,
      /<footer\s+class=["']footer["'][^>]*>[\s\S]*?<\/footer>/i,
      '<footer class="footer">© 2026 No Problem Pressure Washing Matrix™<br>Cactus🌵Byte Studios™ · All Rights Reserved</footer>',
      '</body>',
      ''
    );

    if (!html.includes('/manifest.webmanifest')) {
      html = html.replace('</head>', headAdditions + '\n</head>');
    } else if (!html.includes('matrixBrandPolish')) {
      html = html.replace('</head>', `\n    <style id="matrixBrandPolish">\n      .brand-stage { background: transparent !important; }\n      .brand-logo { background: transparent !important; mix-blend-mode: normal !important; filter: drop-shadow(0 10px 22px rgba(0,196,230,.24)) !important; }\n    </style>\n</head>`);
    }

    if (!html.includes('/settings.js')) {
      html = html.replace('</body>', '    <script src="/settings.js" defer></script>\n</body>');
    }
    if (!html.includes('/inventory.js')) {
      html = html.replace('</body>', '    <script src="/inventory.js" defer></script>\n</body>');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    if (req.method === 'HEAD') return res.end();
    return res.end(html);
  } catch (error) {
    console.error('Matrix shell failed:', error);
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('No Problem Matrix is temporarily unavailable. Please try again.');
  }
};
