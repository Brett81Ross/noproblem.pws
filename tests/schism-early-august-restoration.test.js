'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

const index = read('index.html');
const vercel = read('vercel.json');
const inventory = read('inventory.js');

assert(index.includes('id="augustDashboard"'), 'early-August command center is missing');
assert(index.includes('Matrix Online'), 'Matrix Online status is missing');
assert(index.includes('Quote<br>Matrix'), 'Quote Matrix dashboard entry is missing');
assert(index.includes('Crew<br>Command'), 'Crew Command dashboard entry is missing');
assert(index.includes('Inventory'), 'Inventory dashboard entry is missing');
assert(index.includes('Job Photos'), 'Job Photos dashboard entry is missing');
assert(index.includes('Reports'), 'Reports dashboard entry is missing');
assert(index.includes('Start New Quote'), 'Start New Quote action is missing');
assert(index.includes('Open Saved'), 'Open Saved action is missing');

assert(index.includes('RapidQuote™'), 'RapidQuote front door is missing');
assert(index.includes('id="fullMatrixToggle"'), 'Full Matrix expansion control is missing');
assert(index.includes('index >= 3') && index.includes("slot.hidden = true"), 'RapidQuote must keep the default photo surface compact');
assert(index.includes('id="btnStartPropertyWalk"'), 'guided property walk entry is missing');

assert(index.includes('id="crewCommandPanel"'), 'Crew Command empty/ready state is missing');
assert(index.includes('id="reportsEmptyPanel"'), 'Reports empty state is missing');
assert(index.includes('id="btnCrewHandoff"'), 'approved-job Crew Command handoff is missing');
assert(index.includes('syncCrewHandoffState'), 'Crew handoff readiness gate is missing');
assert(index.includes("window.__schismReleaseState"), 'Crew handoff is not tied to review/release state');

assert(index.includes('matrixData:matrix'), 'analyzed Matrix data is not persisted with saved projects');
assert(index.includes('project.matrixData'), 'saved analyzed jobs cannot be restored');
assert(index.includes('data-recent-index'), 'recent projects are not reopenable');
assert(index.includes('id="jobPhotoCount"'), 'Job Photos count/status is missing');
assert(index.includes("const subject = 'SchismMatrix Quote — '"), 'customer email subject is not project-specific SchismMatrix copy');
assert(index.includes("document.getElementById('downloadQuotePdfButton')"), 'Export PDF is not connected to the real PDF generator');
assert(index.includes("project.customerEmail||''"), 'saved customer email is not restored');
assert(index.includes("project.customerPhone||''"), 'saved customer phone is not restored');

assert(index.includes('dashboard-demo-docked'), 'demo control docking protection is missing');
assert(!vercel.includes('"src": "/index.html", "dest": "/api/demo-shell"'), 'legacy demo-shell route has returned');
assert(inventory.includes("['missionCard', 'scopeCard', 'evidenceCard', 'crewCommandPanel']"), 'Supply Matrix must isolate quote/crew workspaces');

const propertyWalkIds = (index.match(/id="btnStartPropertyWalk"/g) || []).length;
assert.strictEqual(propertyWalkIds, 1, 'there must be exactly one primary Property Walk launcher');
assert(!index.includes('class="mode-toggle-container"'), 'legacy Admin/Technician primary shell has returned');
assert(!index.includes('prompt('), 'browser prompt PIN flow has returned');
const enhancements = read('enhancements.js');
assert(enhancements.includes("'SCHISMMATRIX(TM)'"), 'customer PDF branding is not SchismMatrix');
assert(enhancements.includes("return 'schismmatrix-' + safeBase + '.pdf';"), 'customer PDF filename still uses legacy branding');
assert(!enhancements.includes('Multi-level exterior washing and selected roof soft washing are included with safe professional access equipment.'), 'unsafe high-access PDF scope copy has returned');
assert(enhancements.includes('Multiple levels require manual review. Roofs, ladders, gutter work, and high-access or multi-level execution are excluded from the launch scope.'), 'safe multi-level PDF scope boundary is missing');

assert(index.includes('workflowState'), 'workflow diagnostics helper is missing');
assert(index.includes("dashboard:Boolean(byId('augustDashboard')"), 'dashboard workflow state check is missing');
assert(index.includes("photoCount:(typeof stagedBase64Images!=='undefined'?stagedBase64Images.length:0)"), 'photo workflow state check is missing');
assert(index.includes("hasMatrix:Boolean(typeof techMatrixData!=='undefined' && techMatrixData)"), 'analysis workflow state check is missing');
assert(index.includes("reportVisible:Boolean(byId('outputCard')"), 'report workflow state check is missing');
assert(index.includes("crewHandoffReady:Boolean(byId('btnCrewHandoff')"), 'crew handoff workflow state check is missing');
assert(index.includes(".workspace-backbar{position:sticky"), 'mobile sticky workspace navigation is missing');
assert(index.includes("@media(max-width:430px)"), 'Fold/front-screen mobile breakpoint is missing');

assert(index.includes('id="dashboardMenuPanel"'), 'dashboard hamburger menu panel is missing');
assert(index.includes("menu.classList.toggle('is-open',opening)"), 'dashboard hamburger button is not wired');
assert(!read('settings.js').includes('built for No Problem Pressure Washing'), 'legacy No Problem product copy remains in settings');
assert(JSON.parse(read('package.json')).description === 'SchismMatrix Property Intelligence', 'package metadata is not SchismMatrix');


const splash = read('splash.html');
const manifest = JSON.parse(read('manifest.webmanifest'));
assert(splash.includes('manifest.webmanifest?v=20261007'), 'splash is not forcing refreshed SchismMatrix manifest metadata');
assert(splash.includes('@media (orientation: landscape) and (max-height: 650px)'), 'landscape/Fold splash protection is missing');
assert(splash.includes('justify-content: flex-start;'), 'splash stack must start at the safe top instead of vertically centering into a clipped viewport');
assert(splash.includes('overflow-y: auto;'), 'splash must allow vertical overflow instead of clipping the studio lockup');
assert(splash.includes('flex: 0 0 auto;'), 'splash logo/lockup rows must not flex-shrink into clipping');
assert(splash.includes('class="studio-lockup"'), 'full local CactusByte splash lockup is missing');
assert(splash.includes('class="studio-mark"'), 'CactusByte splash mark is missing');
assert(splash.includes('object-fit: contain;') && splash.includes('object-position: center;'), 'CactusByte mark must render contained and centered');
assert(!/No Problem/i.test(splash), 'legacy No Problem branding remains in SchismMatrix splash');

assert(index.includes('<h1>Build the <span>scope.</span></h1>'), 'operator-focused dashboard hero copy is missing');
assert(index.includes('<p>Capture. Review. Handoff.</p>'), 'operator workflow hero subtitle is missing');
assert(index.includes('background:linear-gradient(135deg,#9af9ff 0%,#53dbe8 54%,#67c7d7 100%)'), 'primary CTA is not using Schism cyan/teal styling');
assert(index.includes('.dashboard-alert[hidden]{display:none!important}'), 'hidden inventory alert badge can still leak into the UI');
assert(index.includes("Inventory has not been counted yet."), 'uncounted inventory state is misleading');
assert(index.includes("document.querySelector('.cb60-btn')"), 'shared Watch Demo control is not docked by its actual class');
assert(index.includes('.cb60-btn.dashboard-demo-docked'), 'Watch Demo docked CSS override is missing');

assert(Array.isArray(manifest.icons) && manifest.icons.some(icon => icon.src === '/assets/schismmatrix-install-v2.svg'), 'installed app icon metadata is not refreshed to the unique SchismMatrix install asset');
assert(!manifest.icons.some(icon => /noproblem|app-icon/i.test(String(icon.src))), 'legacy install icon remains in the manifest');


assert(!splash.includes('logo2.png'), 'web splash still depends on the oversized remote CactusByte logo2.png asset');
assert(splash.includes('/assets/cactusbyte-launcher.svg'), 'web splash does not use the local canonical CactusByte mark');
assert(splash.includes('CactusByte Studios™'), 'web splash does not render the full CactusByte Studios lockup');
assert(fs.existsSync(path.join(process.cwd(), 'assets/cactusbyte-launcher.svg')), 'local canonical CactusByte splash mark is missing');

assert(manifest.icons.some(icon => icon.src === '/assets/schismmatrix-install-v2.svg' && icon.sizes === 'any'), 'manifest is missing the unique SchismMatrix install icon');
assert(fs.existsSync(path.join(process.cwd(), 'assets/schismmatrix-install-v2.svg')), 'unique SchismMatrix install icon file is missing');
assert(!manifest.icons.some(icon => /app-icon|noproblem/i.test(String(icon.src))), 'manifest still references a legacy No Problem install icon');

const nativeInstall = read('native-install.js');
assert(nativeInstall.includes('/SchismMatrix.apk'), 'Android install link is not pointed at the SchismMatrix APK');
assert(!nativeInstall.includes('/No-Problem-Pressure-Washing-Matrix.apk'), 'legacy No Problem APK install link is still active');


assert(splash.includes('padding: max(34px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom));'), 'splash lockup is not lowered into the Fold composition');
assert(splash.includes('bottom: max(84px, calc(env(safe-area-inset-bottom) + 48px));'), 'Tap to Enter is still pinned too low on the Fold viewport');


const vercelConfig = JSON.parse(read('vercel.json'));
assert(vercelConfig.routes.some(route => route.src === '/' && route.dest === '/schism-splash-v3.html'), 'root route is not pinned to the cache-busted Schism splash');
assert(vercelConfig.routes.some(route => route.src === '/splash.html' && route.dest === '/schism-splash-v3.html'), 'legacy splash.html route does not forward to the cache-busted Schism splash');
assert(Array.isArray(vercelConfig.headers) && vercelConfig.headers.some(rule => rule.source === '/schism-splash-v3.html' && rule.headers.some(h => h.key === 'Cache-Control' && /no-store/.test(h.value))), 'cache-busted Schism splash is not protected with no-store');
assert(Array.isArray(vercelConfig.headers) && vercelConfig.headers.some(rule => rule.source === '/manifest.webmanifest' && rule.headers.some(h => h.key === 'Cache-Control' && /no-store/.test(h.value))), 'manifest is not protected with no-store');
assert(fs.existsSync(path.join(process.cwd(), 'schism-splash-v3.html')), 'cache-busted Schism splash file is missing');
assert(JSON.parse(read('manifest.webmanifest')).start_url === '/schism-splash-v3.html', 'manifest start_url still points at the legacy splash path');


const splashV3 = read('schism-splash-v3.html');
assert(splashV3.includes('width: clamp(64px, 12vw, 82px);'), 'CactusByte splash mark is still undersized');
assert(splashV3.includes('font-size: clamp(24px, 5.2vw, 34px);'), 'CactusByte splash wordmark is still undersized');
assert(splashV3.includes('width: clamp(180px, 42vw, 260px);'), 'Schism splash symbol is still undersized');
assert(splashV3.includes('font-size: clamp(19px, 4.6vw, 24px);'), 'SchismMatrix splash title is still undersized');
assert(splashV3.includes('width: min(280px, 68vw);'), 'splash loader is still undersized');
assert(splashV3.includes('width: clamp(154px, 34vw, 204px);'), 'Fold short-viewport breakpoint still shrinks Schism too aggressively');

console.log('Schism early-August restoration QA passed');
