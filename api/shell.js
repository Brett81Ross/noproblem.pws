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
      .brand-stage::before { display: none !important; content: none !important; background: none !important; }
      .brand-logo {
        background: transparent !important;
        mix-blend-mode: normal !important;
        filter: drop-shadow(0 10px 22px rgba(0,196,230,.24)) !important;
      }
    </style>
    `;

    const motionStyles = `
    <style id="matrixMotion">
      @keyframes matrix-rise {
        from { opacity: 0; transform: translate3d(0, 18px, 0) scale(.985); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }

      @keyframes matrix-logo-in {
        from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.94); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }

      @keyframes matrix-logo-float {
        0%, 100% { transform: translate3d(0, 0, 0); }
        50% { transform: translate3d(0, -6px, 0); }
      }

      @keyframes matrix-tab-pop {
        0% { transform: scale(.97); }
        70% { transform: scale(1.015); }
        100% { transform: scale(1); }
      }

      @keyframes matrix-signal-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(174, 255, 78, .42); }
        50% { box-shadow: 0 0 0 7px rgba(174, 255, 78, 0); }
      }

      .status-rail,
      .brand-stage,
      .product-mark,
      .hero-copy,
      .mode-switch,
      .matrix-card {
        animation: matrix-rise .72s cubic-bezier(.2, .75, .25, 1) both;
      }

      .status-rail { animation-delay: .04s; }
      .brand-stage { animation-delay: .1s; }
      .product-mark { animation-delay: .2s; }
      .hero-copy { animation-delay: .28s; }
      .mode-switch { animation-delay: .36s; }
      .matrix-card { animation-delay: .44s; }

      .brand-logo {
        animation: matrix-logo-in .8s cubic-bezier(.2, .8, .25, 1) .12s both,
                   matrix-logo-float 5s ease-in-out 1.15s infinite;
        transform-origin: center;
        will-change: transform, opacity;
      }

      .live-signal::before {
        animation: matrix-signal-pulse 2.2s ease-out infinite;
      }

      .mode-button,
      .button,
      .button-secondary,
      .scan-button,
      .location-button,
      .matrix-settings-button,
      .matrix-settings-close,
      .service-chip,
      .evidence-slot,
      .supply-card,
      .supply-item {
        transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease,
                    background-color .22s ease, color .22s ease, opacity .22s ease;
      }

      .mode-button.is-active {
        animation: matrix-tab-pop .3s cubic-bezier(.2, .8, .25, 1);
      }

      .button:hover,
      .scan-button:hover,
      .location-button:hover,
      .service-chip:hover,
      .evidence-slot:hover,
      .supply-card:hover {
        transform: translate3d(0, -2px, 0);
      }

      .mode-button:active,
      .button:active,
      .button-secondary:active,
      .scan-button:active,
      .location-button:active,
      .matrix-settings-button:active,
      .matrix-settings-close:active,
      .service-chip:active,
      .evidence-slot:active,
      .supply-item:active {
        transform: scale(.97);
      }

      .matrix-settings-gear {
        transition: transform .32s cubic-bezier(.2, .8, .25, 1);
      }

      .matrix-settings-button:hover .matrix-settings-gear {
        transform: rotate(14deg);
      }

      .matrix-settings-button:active .matrix-settings-gear {
        transform: rotate(-10deg) scale(.94);
      }

      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          scroll-behavior: auto !important;
          animation-duration: .01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .01ms !important;
        }
      }
    </style>
    `;

    html = replaceOrInject(
      html,
      /<img\s+class=["']brand-logo["'][^>]*>/i,
      '<img class="brand-logo" src="/brand-logo-alpha.webp" alt="No Problem Pressure Washing Matrix™">',
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
      html = html.replace('</head>', `\n    <style id="matrixBrandPolish">\n      .brand-stage { background: transparent !important; }\n      .brand-stage::before { display: none !important; content: none !important; background: none !important; }\n      .brand-logo { background: transparent !important; mix-blend-mode: normal !important; filter: drop-shadow(0 10px 22px rgba(0,196,230,.24)) !important; }\n    </style>\n</head>`);
    }

    if (!html.includes('/settings.js')) {
      html = html.replace('</body>', '    <script src="/settings.js" defer></script>\n</body>');
    }
    if (!html.includes('/inventory.js')) {
      html = html.replace('</body>', '    <script src="/inventory.js" defer></script>\n</body>');
    }

    if (!html.includes('matrixMotion')) {
      html = html.replace('</head>', motionStyles + '\n</head>');
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
