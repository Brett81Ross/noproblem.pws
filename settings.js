
      '<div class="matrix-settings-actions"><button class="matrix-settings-button" id="matrixSaveSettings" type="button">Save settings</button><button class="matrix-settings-button secondary" id="matrixResetSettings" type="button">Reset to $99.99</button></div>',
      '</section>',
      '<section class="matrix-settings-section">',
      '<p class="matrix-settings-kicker">App</p>',
      '<h2 class="matrix-settings-title">Matrix on this phone</h2>',
      '<p class="matrix-settings-copy">The square NP mark is used for the Android home-screen app icon.</p>',
      '<div class="matrix-settings-row"><div class="matrix-settings-meta"><strong>Version ' + VERSION + '</strong>No Problem Pressure Washing Matrix</div><button class="matrix-settings-button" id="matrixInstallButton" type="button" hidden>Install app</button></div>',
      '</section>',
      '<section class="matrix-settings-section">',
      '<p class="matrix-settings-kicker">Privacy & data</p>',
      '<h2 class="matrix-settings-title">Data on this device</h2>',
      '<p class="matrix-settings-copy">Staged photos stay in memory while the page is open and are sent for analysis only when you run a Matrix scan. Saved projects and Matrix settings use browser storage on this device.</p>',
      '<div class="matrix-settings-actions"><button class="matrix-settings-button danger" id="matrixClearProject" type="button">Clear saved project</button><button class="matrix-settings-button secondary" id="matrixClearSettings" type="button">Clear Matrix settings</button></div>',
      '<div class="matrix-settings-privacy">Clearing a saved project removes the locally stored project. A report already visible on screen stays visible until you reload or run another scan.</div>',
      '</section>',
      '<section class="matrix-settings-section">',
      '<p class="matrix-settings-kicker">About</p>',
      '<h2 class="matrix-settings-title">Matrix Sight™</h2>',
      '<p class="matrix-settings-copy">A photo-to-plan workflow built for No Problem Pressure Washing. It turns field evidence into a customer-ready scope, pricing plan, safety checks, and crew brief.</p>',
      '</section>',
      '<div class="matrix-settings-footer">No Problem Pressure Washing Matrix™ · Cactus🌵Byte Studios™ · All Rights Reserved</div>',
      '</div></section>'
    ].join('');
    document.body.appendChild(overlay);

    document.getElementById('matrixSettingsClose').addEventListener('click', closePanel);
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closePanel();
    });
    document.getElementById('matrixSaveSettings').addEventListener('click', saveSettings);
    document.getElementById('matrixResetSettings').addEventListener('click', resetSettings);
    document.getElementById('matrixClearProject').addEventListener('click', clearProject);
    document.getElementById('matrixClearSettings').addEventListener('click', clearSettings);
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

  function saveSettings() {
    var input = document.getElementById('matrixMinimumJob');
    var minimum = moneyValue(input.value);
    writeSettings({ minimumJob: minimum });
    input.value = minimum.toFixed(2);
    showToast('Settings saved. Pricing floor applies to the next scan.');
  }

  function resetSettings() {
    writeSettings({ minimumJob: DEFAULT_MINIMUM });
    document.getElementById('matrixMinimumJob').value = DEFAULT_MINIMUM.toFixed(2);
    showToast('Minimum service call reset to $99.99.');
  }

  function clearProject() {
    try { localStorage.removeItem(PROJECT_KEY); } catch (error) {}
    showToast('Saved project removed from this device.');
  }

  function clearSettings() {
    try { localStorage.removeItem(SETTINGS_KEY); } catch (error) {}
    document.getElementById('matrixMinimumJob').value = DEFAULT_MINIMUM.toFixed(2);
    showToast('Matrix settings cleared. Defaults restored.');
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
      showToast('No Problem Matrix installed.');
    });
  }

  function hookAnalyzeSettings() {
    if (!window.fetch || window.fetch.__matrixSettingsWrapped) return;
    var nativeFetch = window.fetch.bind(window);

    var wrappedFetch = async function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var isAnalyze = /\/api\/analyze(?:\?|$)/.test(url);
      var requestInit = init;

      if (isAnalyze && init && String(init.method || 'GET').toUpperCase() === 'POST' && typeof init.body === 'string') {
        try {
          var payload = JSON.parse(init.body);
          var saved = readSettings();
          payload.settings = Object.assign({}, payload.settings || {}, { minimumJob: saved.minimumJob });
          requestInit = Object.assign({}, init, { body: JSON.stringify(payload) });
        } catch (error) {}
      }

      var response = await nativeFetch(input, requestInit);
      if (!isAnalyze || !response || !response.ok) return response;

      try {
        var clone = response.clone();
        var data = await clone.json();
        var matrix = data && (data.rawMatrixData || data);
        if (!matrix || typeof matrix !== 'object') return response;
        matrix.quoteMeta = Object.assign({}, matrix.quoteMeta || {}, { minimumJob: readSettings().minimumJob });
        var headers = new Headers(response.headers);
        headers.delete('content-length');
        headers.delete('content-encoding');
        return new Response(JSON.stringify(data), {
          status: response.status,
          statusText: response.statusText,
          headers: headers
        });
      } catch (error) {
        return response;
      }
    };

    wrappedFetch.__matrixSettingsWrapped = true;
    window.fetch = wrappedFetch;
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
  hookAnalyzeSettings();
  registerServiceWorker();
}());
