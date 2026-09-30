(function () {
  'use strict';

  var PROJECT_KEY = 'no-problem-matrix-last-project';
  var VERSION = 'recovery';

  function showToast(message) {
    var toast = document.getElementById('matrixSettingsToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'matrixSettingsToast';
      toast.style.cssText = 'position:fixed;left:50%;bottom:24px;z-index:1200;transform:translateX(-50%);max-width:calc(100% - 32px);padding:10px 14px;border:1px solid rgba(126,239,255,.3);border-radius:12px;background:#061118;color:#edfaff;font:700 12px system-ui;box-shadow:0 18px 50px rgba(0,0,0,.45)';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.hidden = true; }, 2400);
  }

  function createPanel() {
    if (document.getElementById('matrixSettingsOverlay')) return;
    var overlay = document.createElement('section');
    overlay.id = 'matrixSettingsOverlay';
    overlay.hidden = true;
    overlay.style.cssText = 'position:fixed;z-index:1100;inset:0;overflow:auto;padding:18px;background:rgba(1,7,11,.88);color:#edfaff';
    overlay.innerHTML = [
      '<div style="width:min(100%,560px);margin:8vh auto;padding:20px;border:1px solid rgba(126,239,255,.25);border-radius:22px;background:#07151d">',
      '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><strong>Matrix Settings & About</strong><div style="margin-top:4px;color:#7fa4af;font-size:10px">RECOVERY BUILD</div></div><button id="matrixSettingsClose" type="button" style="min-width:42px;min-height:42px;border:1px solid rgba(255,255,255,.15);border-radius:10px;background:transparent;color:#fff">×</button></div>',
      '<section style="margin-top:18px;padding:16px;border:1px solid rgba(126,239,255,.12);border-radius:16px"><strong>Matrix Sight™</strong><p style="color:#91afb8;line-height:1.5">Photo-to-plan field evidence, estimating, safety checks, and crew workflow.</p><p style="color:#91afb8;font-size:11px">Pricing authority is intentionally not stored in browser settings in this recovery build.</p></section>',
      '<section style="margin-top:14px;padding:16px;border:1px solid rgba(126,239,255,.12);border-radius:16px"><strong>Local project data</strong><p style="color:#91afb8;line-height:1.5">Saved project data can be cleared from this device without changing server pricing or authorization.</p><button id="matrixClearProject" type="button" style="min-height:44px;padding:0 14px;border:1px solid rgba(255,255,255,.15);border-radius:10px;background:#0b202b;color:#fff;font-weight:800">Clear saved project</button></section>',
      '<div style="margin-top:14px;color:#688b96;font-size:10px">Version ' + VERSION + ' · Cactus🌵Byte Studios™</div>',
      '</div>'
    ].join('');
    document.body.appendChild(overlay);
    document.getElementById('matrixSettingsClose').onclick = closePanel;
    document.getElementById('matrixClearProject').onclick = function () {
      try { localStorage.removeItem(PROJECT_KEY); } catch (error) {}
      showToast('Saved project removed from this device.');
    };
  }

  function openPanel() {
    var overlay = document.getElementById('matrixSettingsOverlay');
    if (overlay) overlay.hidden = false;
  }

  function closePanel() {
    var overlay = document.getElementById('matrixSettingsOverlay');
    if (overlay) overlay.hidden = true;
  }

  function addGear() {
    if (document.getElementById('matrixSettingsGear')) return;
    var gear = document.createElement('button');
    gear.id = 'matrixSettingsGear';
    gear.type = 'button';
    gear.setAttribute('aria-label', 'Open settings and about');
    gear.title = 'Settings & About';
    gear.textContent = '⚙';
    gear.style.cssText = 'display:grid;place-items:center;min-width:38px;min-height:38px;border:1px solid rgba(126,239,255,.25);border-radius:10px;background:#07151d;color:#bff8ff;font-size:18px';
    gear.onclick = openPanel;
    var rail = document.querySelector('.status-rail');
    if (rail) rail.appendChild(gear);
    else {
      gear.style.position = 'fixed';
      gear.style.zIndex = '900';
      gear.style.top = '14px';
      gear.style.right = '14px';
      document.body.appendChild(gear);
    }
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closePanel();
  });

  createPanel();
  addGear();
}());
