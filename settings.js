(function () {
  'use strict';

  var SETTINGS_KEY = 'no-problem-matrix-settings-v1';
  var PROJECT_KEY = 'no-problem-matrix-last-project';
  var VERSION = '1.1.0';
  var deferredInstallPrompt = null;

  function showToast(message) {
    var existing = document.getElementById('matrixSettingsToast');
    if (!existing) {
      existing = document.createElement('div');
      existing.id = 'matrixSettingsToast';
      existing.className = 'matrix-settings-toast';
      document.body.appendChild(existing);
    }
    existing.textContent = message;
    existing.classList.add('is-visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      existing.classList.remove('is-visible');
    }, 2600);
  }

  function installStyles() {
    if (document.getElementById('matrixSettingsStyles')) return;
    var style = document.createElement('style');
    style.id = 'matrixSettingsStyles';
    style.textContent = [
      '.matrix-settings-gear{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;border:1px solid rgba(126,239,255,.24);border-radius:10px;color:#bff8ff;background:rgba(4,20,27,.7);cursor:pointer;font-size:18px;line-height:1;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}',
      '.matrix-settings-gear:hover{border-color:rgba(88,239,255,.65);color:#fff}',
      '.matrix-settings-overlay{position:fixed;z-index:1000;inset:0;display:none;align-items:flex-start;justify-content:center;padding:18px 14px max(18px,env(safe-area-inset-bottom));background:rgba(1,7,11,.82);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow-y:auto}',
      '.matrix-settings-overlay.is-open{display:flex}',
      '.matrix-settings-panel{width:min(100%,560px);margin:auto;border:1px solid rgba(126,239,255,.28);border-radius:24px;background:linear-gradient(145deg,#0e2732,#061118 76%);box-shadow:0 28px 90px rgba(0,0,0,.62),inset 0 1px 0 rgba(255,255,255,.04);overflow:hidden;color:#edfaff}',
      '.matrix-settings-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid rgba(126,239,255,.12);background:rgba(6,17,24,.96);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}',
      '.matrix-settings-head strong{font-size:15px;letter-spacing:-.02em}',
      '.matrix-settings-head span{display:block;margin-top:3px;color:#7fa4af;font-size:9px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}',
      '.matrix-settings-close{display:grid;width:34px;height:34px;place-items:center;border:1px solid rgba(255,255,255,.13);border-radius:10px;color:#b8d8df;background:transparent;cursor:pointer;font-size:20px}',
      '.matrix-settings-body{padding:18px}',
      '.matrix-settings-brand{margin:0 auto 18px;padding:14px 12px;text-align:center}',
      '.matrix-settings-symbol{display:block;width:72px;height:auto;margin:0 auto 10px;filter:drop-shadow(0 0 14px rgba(0,209,255,.2))}',
      '.matrix-settings-brand strong{display:block;color:#f4fdff;font-size:28px;font-weight:950;letter-spacing:-.045em;line-height:1;text-transform:uppercase;text-shadow:0 0 20px rgba(88,239,255,.2)}',
      '.matrix-settings-brand span{display:block;margin-top:7px;color:#58efff;font-size:9px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}',
      '.matrix-settings-section{margin-bottom:14px;padding:16px;border:1px solid rgba(126,239,255,.12);border-radius:16px;background:rgba(1,12,18,.44)}',
      '.matrix-settings-kicker{margin:0 0 6px;color:#58efff;font-size:9px;font-weight:950;letter-spacing:.14em;text-transform:uppercase}',
      '.matrix-settings-title{margin:0 0 8px;font-size:16px;line-height:1.15}',
      '.matrix-settings-copy{margin:0;color:#91afb8;font-size:11px;line-height:1.5}',
      '.matrix-settings-field{display:grid;gap:7px;margin-top:12px;color:#b9d6dd;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}',
      '.matrix-settings-input{width:100%;height:48px;padding:0 12px;border:1px solid rgba(126,239,255,.2);border-radius:12px;outline:0;color:#effeff;background:#041017;font:inherit;font-size:15px;font-weight:800}',
      '.matrix-settings-input:focus{border-color:#58efff;box-shadow:0 0 0 4px rgba(88,239,255,.08)}',
      '.matrix-settings-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding-top:12px;border-top:1px solid rgba(126,239,255,.1)}',
      '.matrix-settings-meta{color:#84a6af;font-size:10px;line-height:1.4}',
      '.matrix-settings-meta strong{display:block;color:#dff9ff;font-size:11px}',
      '.matrix-settings-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}',
      '.matrix-settings-button{min-height:44px;padding:10px 12px;border:1px solid transparent;border-radius:11px;color:#001215;background:linear-gradient(135deg,#a7fbff,#42ccdd);cursor:pointer;font-size:10px;font-weight:950;letter-spacing:.06em;text-transform:uppercase}',
      '.matrix-settings-button.secondary{border-color:rgba(126,239,255,.18);color:#c9e9ef;background:rgba(4,20,27,.72)}',
      '.matrix-settings-button.danger{border-color:rgba(255,115,115,.24);color:#ffd1d1;background:rgba(96,28,34,.18)}',
      '.matrix-settings-button[hidden]{display:none}',
      '.matrix-settings-privacy{margin-top:10px;padding:10px 11px;border-left:2px solid #58efff;color:#86a7b0;background:rgba(88,239,255,.04);font-size:10px;line-height:1.5}',
      '.matrix-settings-footer{padding:5px 10px 2px;color:#65818a;font-size:9px;font-weight:750;line-height:1.6;text-align:center}',
      '.matrix-settings-toast{position:fixed;z-index:1100;right:14px;bottom:max(14px,env(safe-area-inset-bottom));max-width:calc(100vw - 28px);padding:11px 13px;border:1px solid rgba(88,239,255,.3);border-radius:12px;color:#e8fdff;background:rgba(4,20,27,.97);box-shadow:0 14px 38px rgba(0,0,0,.45);font-size:11px;font-weight:800;opacity:0;pointer-events:none;transform:translateY(10px);transition:180ms ease}',
      '.matrix-settings-toast.is-visible{opacity:1;transform:translateY(0)}',
      '@media(max-width:410px){.matrix-settings-actions{grid-template-columns:1fr}.matrix-settings-body{padding:14px}.matrix-settings-section{padding:14px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function createPanel() {
    if (document.getElementById('matrixSettingsOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'matrixSettingsOverlay';
    overlay.className = 'matrix-settings-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<section class="matrix-settings-panel" role="dialog" aria-modal="true" aria-labelledby="matrixSettingsTitle">',
      '<header class="matrix-settings-head">',
      '<div><strong id="matrixSettingsTitle">Settings & About</strong><span>SchismMatrix™ · Property Intelligence</span></div>',
      '<button class="matrix-settings-close" id="matrixSettingsClose" type="button" aria-label="Close settings">×</button>',
      '</header>',
      '<div class="matrix-settings-body">',
      '<div class="matrix-settings-brand" role="img" aria-label="SchismMatrix, Property Intelligence"><img class="matrix-settings-symbol" src="/assets/schismmatrix-symbol.svg" alt="" aria-hidden="true"><strong>SchismMatrix™</strong><span>Property Intelligence</span></div>',
      '<section class="matrix-settings-section">',
      '<p class="matrix-settings-kicker">App</p>',
      '<h2 class="matrix-settings-title">Matrix on this phone</h2>',
      '<p class="matrix-settings-copy">The SchismMatrix split-S mark is the approved app-icon direction; installed icon assets remain unchanged until the dedicated icon migration is validated.</p>',
      '<div class="matrix-settings-row"><div class="matrix-settings-meta"><strong>Version ' + VERSION + '</strong>SchismMatrix™ · Property Intelligence</div><button class="matrix-settings-button" id="matrixInstallButton" type="button" hidden>Install app</button></div>',
      '</section>',
      '<section class="matrix-settings-section">',
      '<p class="matrix-settings-kicker">Privacy & data</p>',
      '<h2 class="matrix-settings-title">Data on this device</h2>',
      '<p class="matrix-settings-copy">Staged photos stay in memory while the page is open and are sent for analysis only when you run a Matrix scan. Saved projects and Matrix settings use browser storage on this device.</p>',
      '<div class="matrix-settings-actions"><button class="matrix-settings-button danger" id="matrixClearProject" type="button">Clear saved project</button></div>',
      '<div class="matrix-settings-privacy">Clearing a saved project removes the locally stored project. A report already visible on screen stays visible until you reload or run another scan.</div>',
      '</section>',
      '<section class="matrix-settings-section">',
      '<p class="matrix-settings-kicker">About</p>',
      '<h2 class="matrix-settings-title">Matrix Sight™</h2>',
      '<p class="matrix-settings-copy">A photo-to-plan workflow built for No Problem Pressure Washing. It turns field evidence into a customer-ready scope, pricing plan, safety checks, and crew brief.</p>',
      '</section>',
      '<div class="matrix-settings-footer">SchismMatrix™ · Cactus🌵Byte Studios™ · All Rights Reserved</div>',
      '</div></section>'
    ].join('');
    document.body.appendChild(overlay);

    document.getElementById('matrixSettingsClose').addEventListener('click', closePanel);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closePanel();
    });
    document.getElementById('matrixClearProject').addEventListener('click', clearProject);
    document.getElementById('matrixInstallButton').addEventListener('click', installApp);
  }

  function addGear() {
    if (document.getElementById('matrixSettingsGear')) return;
    var gear = document.createElement('button');
    gear.id = 'matrixSettingsGear';
    gear.className = 'matrix-settings-gear';
    gear.type = 'button';
    gear.setAttribute('aria-label', 'Open settings and about');
    gear.title = 'Settings & About';
    gear.textContent = '⚙';
    gear.addEventListener('click', openPanel);

    var rail = document.querySelector('.status-rail');
    if (rail) {
      var oldRight = rail.lastElementChild;
      if (oldRight && oldRight !== rail.firstElementChild) oldRight.replaceWith(gear);
      else rail.appendChild(gear);
      return;
    }

    gear.style.position = 'fixed';
    gear.style.zIndex = '900';
    gear.style.top = 'max(12px, env(safe-area-inset-top))';
    gear.style.right = '14px';
    document.body.appendChild(gear);
  }

  function openPanel() {
    var overlay = document.getElementById('matrixSettingsOverlay');
    var input = document.getElementById('matrixMinimumJob');
    var saved = readSettings();
    input.value = saved.minimumJob.toFixed(2);
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.dataset.matrixSettingsOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    setTimeout(function () { input.focus(); }, 80);
  }

  function closePanel() {
    var overlay = document.getElementById('matrixSettingsOverlay');
    if (!overlay) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = document.body.dataset.matrixSettingsOverflow || '';
  }

  function clearProject() {
    try { localStorage.removeItem(PROJECT_KEY); } catch (error) {}
    showToast('Saved project removed from this device.');
  }

  async function installApp() {
    if (!deferredInstallPrompt) return;
    try {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
    } catch (error) {}
    deferredInstallPrompt = null;
    document.getElementById('matrixInstallButton').hidden = true;
  }

  function hookInstallPrompt() {
    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      deferredInstallPrompt = event;
      var button = document.getElementById('matrixInstallButton');
      if (button) button.hidden = false;
    });
    window.addEventListener('appinstalled', function () {
      deferredInstallPrompt = null;
      var button = document.getElementById('matrixInstallButton');
      if (button) button.hidden = true;
      showToast('SchismMatrix installed.');
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closePanel();
  });

  installStyles();
  createPanel();
  addGear();
  hookInstallPrompt();
  registerServiceWorker();
}());
