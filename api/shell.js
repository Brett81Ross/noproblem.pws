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

    const responsiveColorStyles = `
    <style id="matrixResponsiveColor">
      :root {
        --violet: #9b7cff;
        --pink: #ff6fb5;
        --gold: #ffc857;
      }

      html {
        width: 100%;
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
      }

      body {
        width: 100%;
        min-width: 0 !important;
        background:
          radial-gradient(circle at 8% 0%, rgba(0, 214, 255, .2), transparent 30rem),
          radial-gradient(circle at 94% 12%, rgba(155, 124, 255, .16), transparent 28rem),
          radial-gradient(circle at 50% 88%, rgba(255, 111, 181, .08), transparent 30rem),
          linear-gradient(145deg, #030609 0%, #07151e 48%, #060711 100%) !important;
      }

      .app-shell {
        width: min(100%, 1120px) !important;
        max-width: none !important;
        padding-left: max(16px, env(safe-area-inset-left)) !important;
        padding-right: max(16px, env(safe-area-inset-right)) !important;
        padding-bottom: max(38px, env(safe-area-inset-bottom)) !important;
      }

      .matrix-card,
      .supply-card {
        border-color: rgba(155, 124, 255, .22) !important;
        background:
          radial-gradient(circle at 100% 0%, rgba(155, 124, 255, .11), transparent 34%),
          radial-gradient(circle at 0% 100%, rgba(0, 214, 255, .08), transparent 36%),
          linear-gradient(145deg, rgba(18, 42, 53, .96), rgba(7, 14, 25, .97)) !important;
      }

      #missionCard::before {
        background: linear-gradient(90deg, var(--aqua), var(--violet)) !important;
        box-shadow: 0 0 18px var(--violet) !important;
      }

      #evidenceCard::before {
        background: linear-gradient(90deg, var(--gold), var(--pink)) !important;
        box-shadow: 0 0 18px rgba(255, 111, 181, .7) !important;
      }

      #evidenceCard .section-kicker { color: var(--gold) !important; }

      #quoteModeButton.is-active {
        background: linear-gradient(135deg, #8bf6ff, #42cedf) !important;
      }

      #crewModeButton.is-active {
        color: #0b0716 !important;
        background: linear-gradient(135deg, #c6b7ff, var(--violet)) !important;
        box-shadow: 0 6px 20px rgba(155, 124, 255, .28) !important;
      }

      #inventoryModeButton.is-active {
        color: #1d0c00 !important;
        background: linear-gradient(135deg, #ffd98a, #ff8e5d) !important;
        box-shadow: 0 6px 20px rgba(255, 142, 93, .25) !important;
      }

      .service-chip.is-selected {
        border-color: rgba(178, 156, 255, .82) !important;
        background: linear-gradient(135deg, rgba(155, 124, 255, .26), rgba(0, 190, 222, .2)) !important;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .05), 0 8px 24px rgba(0, 0, 0, .22) !important;
      }

      .service-chip.is-selected::before {
        background: linear-gradient(135deg, var(--aqua), var(--violet)) !important;
      }

      .service-chip[data-service="roof_soft_wash"] {
        display: none;
        border-color: rgba(255, 200, 87, .28);
        color: #ffe0a2;
        background: linear-gradient(135deg, rgba(255, 200, 87, .1), rgba(255, 111, 181, .08));
      }

      body[data-building-level="multiple"] .service-chip[data-service="roof_soft_wash"] {
        display: block;
      }

      body[data-building-level="multiple"] .service-chip[data-service="roof_soft_wash"].is-selected {
        border-color: rgba(255, 200, 87, .78) !important;
        background: linear-gradient(135deg, rgba(255, 200, 87, .27), rgba(255, 111, 181, .2)) !important;
      }

      .service-chip[data-service="memorial_cleaning"],
      .service-chip[data-service="vehicle_wash"],
      .service-chip[data-service="aircraft_exterior_wash"],
      .service-chip[data-service="custom_area"] {
        border-color: rgba(255, 200, 87, .28);
        background: linear-gradient(135deg, rgba(255, 200, 87, .09), rgba(155, 124, 255, .08));
      }

      .scan-button {
        background: linear-gradient(120deg, #9af9ff, #56dbe9 45%, #9b7cff) !important;
        box-shadow: 0 12px 30px rgba(117, 138, 255, .2) !important;
      }

      .customer-fields {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        margin-top: 10px;
        padding: 14px;
        border: 1px solid rgba(255, 200, 87, .2);
        border-radius: 15px;
        background: linear-gradient(135deg, rgba(255, 200, 87, .06), rgba(255, 111, 181, .055));
      }

      .customer-fields .field-label { color: #f3dfb2; }

      .customer-fields .text-field:focus {
        border-color: var(--gold) !important;
        box-shadow: 0 0 0 4px rgba(255, 200, 87, .09) !important;
      }

      .customer-contact-note {
        grid-column: 1 / -1;
        margin: 0;
        color: #829eaa;
        font-size: 10px;
        line-height: 1.45;
      }

      .pdf-download-button {
        border-color: rgba(255, 200, 87, .34) !important;
        color: #1e0c00 !important;
        background: linear-gradient(135deg, #ffe39a, #ffc857 52%, #ff8e9f) !important;
        box-shadow: 0 10px 24px rgba(255, 150, 90, .18) !important;
      }

      .building-height-field {
        margin-top: 18px;
        padding: 14px;
        border: 1px solid rgba(155, 124, 255, .22);
        border-radius: 15px;
        background: linear-gradient(135deg, rgba(155, 124, 255, .08), rgba(3, 18, 25, .62));
      }

      .building-height-label {
        display: block;
        margin-bottom: 9px;
        color: #d8d0ff;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: .1em;
        text-transform: uppercase;
      }

      .building-height-switch {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        padding: 4px;
        border: 1px solid rgba(126, 239, 255, .14);
        border-radius: 13px;
        background: rgba(1, 10, 16, .62);
      }

      .building-height-option {
        min-height: 46px;
        padding: 10px;
        border: 0;
        border-radius: 10px;
        color: #7897a3;
        background: transparent;
        cursor: pointer;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .04em;
        transition: transform .2s ease, color .2s ease, background .2s ease, box-shadow .2s ease;
      }

      .building-height-option[aria-pressed="true"] {
        color: #071018;
        background: linear-gradient(135deg, #9af9ff, #70e0ec);
        box-shadow: 0 7px 20px rgba(0, 190, 222, .2);
      }

      .building-height-option[data-building-level="multiple"][aria-pressed="true"] {
        color: #13091d;
        background: linear-gradient(135deg, #d2c7ff, #9b7cff 58%, #ff8ec5);
        box-shadow: 0 7px 22px rgba(155, 124, 255, .28);
      }

      .building-height-option:active { transform: scale(.97); }

      .building-height-note {
        margin: 9px 2px 0;
        color: #8ca8b6;
        font-size: 11px;
        line-height: 1.45;
      }

      body[data-building-level="multiple"] .scope-boundary {
        border-color: rgba(155, 124, 255, .3) !important;
        color: #d8d0ff !important;
        background: rgba(155, 124, 255, .09) !important;
      }

      body[data-building-level="multiple"] .scope-boundary strong {
        color: #f0ebff !important;
      }

      @media (min-width: 700px) and (max-width: 1199px) {
        .app-shell {
          width: 100% !important;
          padding-top: 24px !important;
          padding-left: max(clamp(28px, 5vw, 64px), env(safe-area-inset-left)) !important;
          padding-right: max(clamp(28px, 5vw, 64px), env(safe-area-inset-right)) !important;
        }

        .status-rail { min-height: 44px; font-size: 12px; }
        .matrix-settings-gear { width: 44px; height: 44px; font-size: 22px; }
        .brand-logo { width: min(100%, 760px) !important; max-height: none !important; }
        .product-mark { padding: 10px 16px; font-size: 12px; }
        .hero-copy { max-width: 820px; margin: 16px auto 30px; font-size: 18px; }
        .mode-button { min-height: 58px; font-size: 14px; }
        .card-inner, .supply-inner { padding: 30px !important; }
        .section-kicker, .supply-kicker { font-size: 12px; }
        .section-heading, .supply-title { font-size: clamp(30px, 4vw, 42px); }
        .section-copy, .supply-copy { font-size: 16px; }
        .field-label { font-size: 13px; }
        .text-field { height: 58px; font-size: 16px; }
        .customer-fields { grid-template-columns: 1fr 1fr; padding: 18px; }
        .customer-contact-note { font-size: 12px; }
        .service-chip { min-height: 64px; padding: 14px 16px; font-size: 14px; }
        .building-height-label { font-size: 13px; }
        .building-height-option { min-height: 56px; font-size: 14px; }
        .building-height-note, .scope-boundary { font-size: 14px; }
        .protocol-stat { font-size: 14px; }
        .scan-pill { font-size: 12px; }
        .slot-title { font-size: 14px; }
        .slot-hint { font-size: 12px; }
        .button, .scan-button { min-height: 58px; font-size: 14px; }
        .notes-field { min-height: 120px; font-size: 16px; }
      }

      @media (min-width: 1200px) {
        .app-shell { padding-left: 34px !important; padding-right: 34px !important; }
        .mission-fields { grid-template-columns: 1fr 1.35fr; }
        .customer-fields { grid-template-columns: 1fr 1fr; }
        .scope-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .evidence-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      }

      @media (max-width: 699px) {
        .app-shell {
          padding-top: max(12px, env(safe-area-inset-top)) !important;
          padding-left: max(12px, env(safe-area-inset-left)) !important;
          padding-right: max(12px, env(safe-area-inset-right)) !important;
        }

        input, textarea, select { font-size: 16px !important; }
        .brand-logo { width: 100% !important; height: auto !important; }
        .product-mark { max-width: 100%; flex-wrap: wrap; justify-content: center; }
        .mode-switch.supply-enabled .mode-button { min-width: 0; padding: 10px 4px; font-size: clamp(9px, 2.7vw, 11px); }
      }

      @media (max-width: 370px) {
        .scope-grid, .photo-actions, .customer-fields { grid-template-columns: 1fr !important; }
        .building-height-option { padding: 8px 5px; font-size: 11px; }
      }

      @media (orientation: landscape) and (max-height: 520px) {
        .brand-stage { padding-top: 0; }
        .brand-logo { max-height: 150px !important; }
        .hero-copy { margin-bottom: 14px; }
      }
    </style>
    `;

    html = replaceOrInject(
      html,
      /<meta\s+name=["']viewport["'][^>]*>/i,
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
      '</head>',
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    );

    html = html.replace(
      'Four purposeful photos beat twenty random ones. Use the angles below to build a scan the customer and your crew can both understand.',
      'Choose a service, follow its fast photo guide, and add extra views only when the job needs them. Every photo stays organized for one accurate quote.'
    );

    html = html.replace(
      '<strong id="photoCount">0 / 4</strong>',
      '<strong id="photoCount">0 / 24</strong>'
    );

    html = html.replace(
      /var PHOTO_SLOTS = \[[\s\S]*?\n\s*\];\n\n\s*var SERVICE_LABELS/,
      [
        'var PHOTO_SLOTS = [',
        '                { title: "Front exterior", hint: "Full front wall, entry, and nearby surfaces" },',
        '                { title: "Rear exterior", hint: "Full rear wall, patio, and attached features" },',
        '                { title: "Left side", hint: "Complete left elevation from corner to corner" },',
        '                { title: "Right side", hint: "Complete right elevation from corner to corner" },',
        '                { title: "Primary surface", hint: "Driveway, walkway, patio, or main work area" },',
        '                { title: "Problem close-up", hint: "Growth, stains, oxidation, or damaged areas" },',
        '                { title: "Access & obstacles", hint: "Gates, equipment path, outlets, and tight access" },',
        '                { title: "Landscaping & protection", hint: "Plants, furniture, vehicles, and sensitive areas" },',
        '                { title: "Optional detail 1", hint: "Additional angle or service area" },',
        '                { title: "Optional detail 2", hint: "Additional angle or service area" },',
        '                { title: "Optional detail 3", hint: "Additional angle or service area" },',
        '                { title: "Optional detail 4", hint: "Additional angle or service area" },',
        '                { title: "Additional photo 13", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 14", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 15", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 16", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 17", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 18", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 19", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 20", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 21", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 22", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 23", hint: "Additional guided service photo" },',
        '                { title: "Additional photo 24", hint: "Additional guided service photo" }',
        '            ];',
        '',
        '            var SERVICE_LABELS'
      ].join('\n')
    );

    html = html.replace(
      'photos: [null, null, null, null],',
      'photos: Array(24).fill(null),'
    );

    html = html.replace(
      'elements.photoCount.textContent = count + " / 4";',
      'elements.photoCount.textContent = count + " / 24";'
    );

    html = html.replace(
      'elements.evidenceStatus.textContent = count === 0 ? "Ready for scan" : count === 4 ? "Full evidence set" : count + " view" + (count === 1 ? "" : "s") + " loaded";',
      'elements.evidenceStatus.textContent = count === 0 ? "Start a photo guide" : count === 24 ? "Maximum evidence set" : count + " photo" + (count === 1 ? "" : "s") + " organized";'
    );

    html = html.replace(
      'var files = Array.prototype.slice.call(fileList || []).slice(0, 4);',
      'var remainingSlots = state.photos.filter(function (photo) { return !photo; }).length;\n                var files = Array.prototype.slice.call(fileList || []).slice(0, Math.min(24, remainingSlots));'
    );

    html = html.replace(
      'findAvailableSlot((state.photoTarget + fileIndex) % 4)',
      'findAvailableSlot((state.photoTarget + fileIndex) % state.photos.length)'
    );

    html = html.replace(
      'Math.min(1, 1100 / longestSide)',
      'Math.min(1, 900 / longestSide)'
    );

    html = html.replace(
      'canvas.toDataURL("image/jpeg", 0.68)',
      'canvas.toDataURL("image/jpeg", 0.58)'
    );

    html = html.replace(
      'photoTarget: 0,\n                loading: false\n            };',
      'photoTarget: 0,\n                loading: false,\n                quoteDiscountPercent: 0,\n                quoteNotes: ""\n            };'
    );

    html = html.replace(
      'var minimum = Number(state.report.quoteMeta.minimumJob) || 99.99;\n                return Math.max(minimum, subtotal);',
      'var minimum = Number(state.report.quoteMeta.minimumJob) || 99.99;\n                var discount = Math.max(0, Math.min(100, Number(state.quoteDiscountPercent) || 0));\n                return Math.max(minimum, subtotal * (1 - (discount / 100)));'
    );

    html = html.replace(
      '            function proposalText() {',
      [
        '            window.NPMatrixQuote = {',
        '                getState: function () {',
        '                    return {',
        '                        services: state.report ? JSON.parse(JSON.stringify(state.report.services)) : [],',
        '                        activeServiceIds: Array.from(state.activeServices),',
        '                        discountPercent: Number(state.quoteDiscountPercent) || 0,',
        '                        quoteNotes: state.quoteNotes || "",',
        '                        total: getTotal()',
        '                    };',
        '                },',
        '                updateService: function (id, patch) {',
        '                    if (!state.report) return;',
        '                    var service = state.report.services.find(function (item) { return item.id === id; });',
        '                    if (!service || !patch) return;',
        '                    if (patch.quantity !== undefined && Number.isFinite(Number(patch.quantity))) service.quantity = Math.max(0, Number(patch.quantity));',
        '                    if (patch.calculatedPrice !== undefined && Number.isFinite(Number(patch.calculatedPrice))) service.calculatedPrice = Math.max(0, Number(patch.calculatedPrice));',
        '                    if (patch.estimatedTimeMinutes !== undefined && Number.isFinite(Number(patch.estimatedTimeMinutes))) service.estimatedTimeMinutes = Math.max(0, Number(patch.estimatedTimeMinutes));',
        '                    if (patch.quantityUnit !== undefined) service.quantityUnit = String(patch.quantityUnit).trim().slice(0, 40) || "unit";',
        '                    if (patch.label !== undefined) service.label = String(patch.label).trim().slice(0, 100) || service.label;',
        '                    if (patch.reason !== undefined) service.reason = String(patch.reason).trim().slice(0, 320) || service.reason;',
        '                    renderResults();',
        '                },',
        '                setDiscount: function (value) {',
        '                    state.quoteDiscountPercent = Math.max(0, Math.min(100, Number(value) || 0));',
        '                    renderResults();',
        '                },',
        '                setNotes: function (value) {',
        '                    state.quoteNotes = String(value || "").trim().slice(0, 700);',
        '                }',
        '            };',
        '',
        '            function proposalText() {'
      ].join('\n')
    );

    html = html.replace(
      'completedProof: Array.from(state.completedProof)\n                };',
      'completedProof: Array.from(state.completedProof),\n                    quoteDiscountPercent: Number(state.quoteDiscountPercent) || 0,\n                    quoteNotes: state.quoteNotes || ""\n                };'
    );

    html = html.replace(
      'state.completedProof = new Set(saved.completedProof || []);',
      'state.completedProof = new Set(saved.completedProof || []);\n                    state.quoteDiscountPercent = Number(saved.quoteDiscountPercent) || 0;\n                    state.quoteNotes = saved.quoteNotes || "";'
    );

    html = html.replace(
      'state.completedProof = new Set();\n                    elements.resultsSection.classList.add("is-visible");',
      'state.completedProof = new Set();\n                    state.quoteDiscountPercent = 0;\n                    state.quoteNotes = "";\n                    elements.resultsSection.classList.add("is-visible");'
    );

    html = html.replace(
      'lines.push("SELECTED PLAN TOTAL: " + money(getTotal()));',
      'if (state.quoteDiscountPercent) lines.push("DISCOUNT: " + state.quoteDiscountPercent + "%");\n                lines.push("SELECTED PLAN TOTAL: " + money(getTotal()));\n                if (state.quoteNotes) lines.push("QUOTE NOTES: " + state.quoteNotes);'
    );

    html = html.replace(
      'house_wash: "One-Story House Soft Wash"',
      'house_wash: "House Soft Wash"'
    );

    html = html.replace(
      'house_wash: "House Soft Wash",',
      'house_wash: "House Soft Wash",\n                roof_soft_wash: "Roof Soft Wash",'
    );

    html = html.replace(
      'roof_soft_wash: "Roof Soft Wash",',
      'roof_soft_wash: "Roof Soft Wash",\n                fence_cleaning: "Fence Cleaning",\n                memorial_cleaning: "Tombstone / Memorial Cleaning",\n                vehicle_wash: "Vehicle / Fleet Washing",\n                aircraft_exterior_wash: "Aircraft Exterior Washing",\n                custom_area: "Custom Cleaning Area",'
    );

    html = html.replace(
      /(<button\s+class=["']service-chip["'][^>]*data-service=["']deck_cleaning["'][^>]*>)[\s\S]*?(<\/button>)/i,
      '$1Deck$2'
    );

    if (!/data-service=["']fence_cleaning["']/i.test(html)) {
      html = html.replace(
        /(<button\s+class=["']service-chip["'][^>]*data-service=["']deck_cleaning["'][^>]*>[\s\S]*?<\/button>)/i,
        '$1\n                    <button class="service-chip" type="button" data-service="fence_cleaning" aria-pressed="false">Fencing</button>'
      );
    }

    if (!/data-service=["']roof_soft_wash["']/i.test(html)) {
      html = html.replace(
        /(<button\s+class=["']service-chip["'][^>]*data-service=["']oil_treatment["'][^>]*>[\s\S]*?<\/button>)/i,
        '$1\n                    <button class="service-chip" type="button" data-service="roof_soft_wash" aria-pressed="false">Roof cleaning / soft wash</button>'
      );
    }

    if (!/data-service=["']memorial_cleaning["']/i.test(html)) {
      html = html.replace(
        /(<button\s+class=["']service-chip["'][^>]*data-service=["']roof_soft_wash["'][^>]*>[\s\S]*?<\/button>)/i,
        '$1\n                    <button class="service-chip" type="button" data-service="memorial_cleaning" aria-pressed="false">Tombstones / memorials</button>\n                    <button class="service-chip" type="button" data-service="vehicle_wash" aria-pressed="false">Vehicles / fleets</button>\n                    <button class="service-chip" type="button" data-service="aircraft_exterior_wash" aria-pressed="false">Aircraft exterior</button>\n                    <button class="service-chip" type="button" data-service="custom_area" aria-pressed="false">Custom area</button>'
      );
    }

    html = html.replace(
      'lines.push("No roofs, ladders, gutters, or two-story work are included.");',
      'lines.push(document.body.getAttribute("data-building-level") === "multiple" ? "Multi-level exterior washing and selected roof soft washing are included with safe professional access equipment." : "Ground-level and one-story exterior washing are included. Roof cleaning is not included.");'
    );

    html = html.replace(
      'state.jobAddress.value.trim() ? "PROPERTY: " + state.jobAddress.value.trim() : "",',
      'state.jobAddress.value.trim() ? "PROPERTY: " + state.jobAddress.value.trim() : "",\n                    document.getElementById("customerEmail") && document.getElementById("customerEmail").value.trim() ? "CUSTOMER EMAIL: " + document.getElementById("customerEmail").value.trim() : "",\n                    document.getElementById("customerPhone") && document.getElementById("customerPhone").value.trim() ? "CUSTOMER PHONE: " + document.getElementById("customerPhone").value.trim() : "",'
    );

    html = html.replace(
      'window.location.href = "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(proposalText());',
      'var customerEmailInput = document.getElementById("customerEmail");\n                var recipient = customerEmailInput ? customerEmailInput.value.trim() : "";\n                window.location.href = "mailto:" + encodeURIComponent(recipient) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(proposalText());'
    );

    html = html.replace(
      'jobAddress: state.jobAddress.value.trim(),\n                    siteNotes:',
      'jobAddress: state.jobAddress.value.trim(),\n                    customerEmail: document.getElementById("customerEmail") ? document.getElementById("customerEmail").value.trim() : "",\n                    customerPhone: document.getElementById("customerPhone") ? document.getElementById("customerPhone").value.trim() : "",\n                    siteNotes:'
    );

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

    if (!html.includes('matrixResponsiveColor')) {
      html = html.replace('</head>', responsiveColorStyles + '\n</head>');
    }

    if (!html.includes('/enhancements.js')) {
      html = html.replace('</body>', '    <script src="/enhancements.js" defer></script>\n</body>');
    }
    if (!html.includes('/quick-quote.js')) {
      html = html.replace('</body>', '    <script src="/quick-quote.js" defer></script>\n</body>');
    }
    if (!html.includes('/quote-review.js')) {
      html = html.replace('</body>', '    <script src="/quote-review.js" defer></script>\n</body>');
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
