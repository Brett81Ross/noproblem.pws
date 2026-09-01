#!/usr/bin/env python3
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / 'settings.js'
text = PATH.read_text()

old = """  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').catch(function () {});
      });
    }
  }
"""
new = """  function removeLegacyServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        registrations.forEach(function (registration) { registration.unregister(); });
      }).catch(function () {});
    }
    if ('caches' in window) caches.keys().then(function (keys) {
      keys.filter(function (key) { return /^no-problem|^noproblem|^matrix/i.test(key); }).forEach(function (key) { caches.delete(key); });
    }).catch(function () {});
  }
"""

if 'function removeLegacyServiceWorker()' not in text:
    if old not in text:
        raise SystemExit('legacy service-worker registration anchor not found')
    text = text.replace(old, new, 1)

text = text.replace('  registerServiceWorker();', '  removeLegacyServiceWorker();')

if "navigator.serviceWorker.register('/sw.js')" in text:
    raise SystemExit('legacy service-worker registration remains')
if 'removeLegacyServiceWorker();' not in text:
    raise SystemExit('service-worker removal call is missing')

PATH.write_text(text)
print('Reconciled settings.js to live service-worker removal behavior.')
