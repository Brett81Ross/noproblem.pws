#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
SETTINGS = ROOT / 'settings.js'
SHELL = ROOT / 'api' / 'shell.js'
ENHANCEMENTS = ROOT / 'enhancements.js'


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label):
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, got {count}')
    return updated


def patch_settings(text):
    text = replace_once(
        text,
        "      '.matrix-settings-privacy{margin-top:10px;padding:10px 11px;border-left:2px solid #58efff;color:#86a7b0;background:rgba(88,239,255,.04);font-size:10px;line-height:1.5}',",
        "      '.matrix-settings-privacy{margin-top:10px;padding:10px 11px;border-left:2px solid #58efff;color:#86a7b0;background:rgba(88,239,255,.04);font-size:10px;line-height:1.5}',\n      '.matrix-settings-backup-warning{margin-top:10px;padding:10px 11px;border:1px solid rgba(255,200,87,.2);border-radius:11px;color:#d8c79e;background:rgba(255,200,87,.05);font-size:10px;line-height:1.5}',",
        'backup settings style')
    text = replace_once(
        text,
        "      '<div class=\"matrix-settings-actions\"><button class=\"matrix-settings-button danger\" id=\"matrixClearProject\" type=\"button\">Clear saved project</button><button class=\"matrix-settings-button secondary\" id=\"matrixClearSettings\" type=\"button\">Clear Matrix settings</button></div>',\n      '<div class=\"matrix-settings-privacy\">Clearing a saved project removes the locally stored project. A report already visible on screen stays visible until you reload or run another scan.</div>',",
        "      '<div class=\"matrix-settings-actions\"><button class=\"matrix-settings-button danger\" id=\"matrixClearProject\" type=\"button\">Clear saved project</button><button class=\"matrix-settings-button secondary\" id=\"matrixClearSettings\" type=\"button\">Clear Matrix settings</button></div>',\n      '<div class=\"matrix-settings-actions\"><button class=\"matrix-settings-button\" id=\"matrixBackupData\" type=\"button\">Back up Matrix data</button><button class=\"matrix-settings-button secondary\" id=\"matrixRestoreData\" type=\"button\">Restore / merge backup</button></div>',\n      '<input id=\"matrixBackupInput\" type=\"file\" accept=\"application/json,.json\" hidden>',\n      '<div class=\"matrix-settings-backup-warning\">Backup files can include customer contact details, job addresses, location tags, quote notes, inventory counts, and saved reports. Keep them private. Access cookies, paid credits, lifetime status, staged photos, caches, and session state are never exported.</div>',\n      '<div class=\"matrix-settings-privacy\">Clearing a saved project removes the locally stored project. A report already visible on screen stays visible until you reload or run another scan.</div>',",
        'backup controls')
    text = replace_once(
        text,
        "    document.getElementById('matrixClearSettings').addEventListener('click', clearSettings);\n    document.getElementById('matrixInstallButton').addEventListener('click', installApp);",
        "    document.getElementById('matrixClearSettings').addEventListener('click', clearSettings);\n    document.getElementById('matrixBackupData').addEventListener('click', backupMatrixData);\n    document.getElementById('matrixRestoreData').addEventListener('click', function () { document.getElementById('matrixBackupInput').click(); });\n    document.getElementById('matrixBackupInput').addEventListener('change', handleMatrixBackupFile);\n    document.getElementById('matrixInstallButton').addEventListener('click', installApp);",
        'backup event handlers')
    functions = r'''
  function backupEngine() {
    if (!window.NPMatrixBackup) throw new Error('Backup engine is unavailable.');
    return window.NPMatrixBackup;
  }

  function timestampForFile(date) {
    return date.toISOString().replace(/[:.]/g, '-');
  }

  function downloadJsonFile(filename, text) {
    var blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function backupMatrixData() {
    try {
      var now = new Date();
      var exported = backupEngine().exportData(localStorage, now);
      downloadJsonFile('no-problem-matrix-backup-' + timestampForFile(now) + '.json', exported.text);
      showToast('Matrix backup downloaded. Keep it private.');
    } catch (error) {
      showToast(error && error.message ? error.message : 'Matrix backup could not be created.');
    }
  }

  async function handleMatrixBackupFile(event) {
    var input = event.currentTarget;
    var file = input && input.files && input.files[0];
    if (!file) return;
    try {
      var engine = backupEngine();
      if (file.size > engine.MAX_BYTES) throw new Error('Backup is larger than the 5 MB safety limit.');
      var text = await file.text();
      engine.parseBackup(text);
      var preImportNow = new Date();
      var preImport = engine.exportData(localStorage, preImportNow);
      downloadJsonFile('no-problem-pre-import-' + timestampForFile(preImportNow) + '.json', preImport.text);
      engine.mergeIntoStorage(localStorage, text);
      var minimumInput = document.getElementById('matrixMinimumJob');
      if (minimumInput) minimumInput.value = readSettings().minimumJob.toFixed(2);
      showToast('Backup merged safely. Reload when ready to load restored project and inventory.');
    } catch (error) {
      showToast(error && error.message ? error.message : 'Backup could not be restored.');
    } finally {
      input.value = '';
    }
  }
'''
    return replace_once(text, "\n  async function installApp() {", functions + "\n  async function installApp() {", 'backup functions')


def patch_shell(text):
    if '/matrix-backup.js' in text:
        return text
    anchor = "    if (!html.includes('/settings.js')) {"
    if anchor not in text:
        raise SystemExit('shell backup script anchor not found')
    block = "    if (!html.includes('/matrix-backup.js')) {\n      html = html.replace('</body>', '    <script src=\\\"/matrix-backup.js\\\" defer></script>\\\n</body>');\n    }\n"
    return text.replace(anchor, block + anchor, 1)


def patch_enhancements(text):
    for old in ["  var STORAGE_KEY = 'np_matrix_building_level';\n", "  var ONE_STORY = 'one';\n", "  var MULTIPLE_LEVELS = 'multiple';\n"]:
        text = text.replace(old, '')
    if 'function readSavedLevel()' in text:
        text = regex_once(text, r"\n  function readSavedLevel\(\) \{.*?\n  function createCustomerFields\(\)", "\n  function createCustomerFields()", 'remove legacy building preference helpers')

    automatic_boundary = r'''  function updateHouseWashLabels(root) {
    var scope = root || document;
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    var node;
    var replacement = 'One-Story House Soft Wash';
    while ((node = walker.nextNode())) {
      if (/One-Story House Soft Wash|Multi-Level House Soft Wash/i.test(node.nodeValue || '')) {
        node.nodeValue = node.nodeValue.replace(/One-Story House Soft Wash|Multi-Level House Soft Wash/gi, replacement);
      }
    }
  }

  function updateEvidenceGuidance() {
    var guidance = [
      { index: 8, title: 'Optional detail 1', hint: 'Additional angle or service area' },
      { index: 9, title: 'Optional detail 2', hint: 'Additional angle or service area' },
      { index: 10, title: 'Optional detail 3', hint: 'Additional angle or service area' },
      { index: 11, title: 'Optional detail 4', hint: 'Additional angle or service area' }
    ];
    guidance.forEach(function (item) {
      var slot = document.querySelector('[data-slot="' + item.index + '"]');
      if (!slot) return;
      var title = slot.querySelector('.slot-title');
      var hint = slot.querySelector('.slot-hint');
      if (title && title.textContent !== item.title) title.textContent = item.title;
      if (hint && !slot.classList.contains('has-photo') && hint.textContent !== item.hint) hint.textContent = item.hint;
      slot.setAttribute('aria-label', (slot.classList.contains('has-photo') ? 'Replace ' : 'Add ') + item.title + ' photo');
    });
  }

  function applyAutomaticAccessBoundary() {
    var boundary = document.querySelector('.scope-boundary span:last-child');
    var houseWash = document.querySelector('[data-service="house_wash"]');
    if (houseWash) houseWash.textContent = 'House wash';
    if (boundary) boundary.innerHTML = '<strong>Automatic access check:</strong> the Matrix reviews photos for upper-story, roof, ladder, lift, and other elevated-access requirements before deciding whether the job fits the approved scope.';
    updateEvidenceGuidance();
    updateHouseWashLabels(document.getElementById('resultsMount') || document);
  }

'''
    if 'function updateHouseWashLabels(level, root)' in text:
        text = regex_once(text, r"  function updateHouseWashLabels\(level, root\) \{.*?(?=  function patchAnalysisRequest\(\))", automatic_boundary, 'replace manual access boundary')

    automatic_fetch = r'''  function patchAnalysisRequest() {
    if (window.__npBuildingFetchPatched || typeof window.fetch !== 'function') return;
    var originalFetch = window.fetch.bind(window);
    window.__npBuildingFetchPatched = true;
    window.fetch = function (resource, options) {
      var url = typeof resource === 'string' ? resource : resource && resource.url;
      var requestOptions = options;
      if (url && /\/api\/analyze(?:\?|$)/.test(url) && options && typeof options.body === 'string') {
        try {
          var payload = JSON.parse(options.body);
          var scopeInstruction = 'ACCESS DETECTION: Determine building height and whether any requested surface needs roof access, ladders, lifts, scaffolding, extension equipment, or other elevated access. Flag those needs visibly and make a serviceability decision. Do not price roof, gutter, two-story, ladder, or elevated-access work as an approved service.';
          payload.buildingScope = { detection: 'automatic', elevatedAccessIncluded: false };
          payload.siteNotes = scopeInstruction + (payload.siteNotes ? '\n\n' + payload.siteNotes : '');
          requestOptions = Object.assign({}, options, { body: JSON.stringify(payload) });
        } catch (error) { requestOptions = options; }
      }
      return originalFetch(resource, requestOptions);
    };
  }

'''
    if "var level = document.body.getAttribute('data-building-level')" in text:
        text = regex_once(text, r"  function patchAnalysisRequest\(\) \{.*?(?=  function pdfSafeText\(value\))", automatic_fetch, 'replace manual building request patch')
    text = re.sub(r"updateHouseWashLabels\([^;\n]*resultsMount\);", "updateHouseWashLabels(resultsMount);", text)
    text = text.replace('updateEvidenceGuidance(readSavedLevel());', 'updateEvidenceGuidance();')
    live_init = "  function init() {\n    createCustomerFields();\n    restoreCustomerContact();\n    addCustomerContactEvents();\n    applyAutomaticAccessBoundary();\n    patchAnalysisRequest();\n    observeEvidenceGrid();\n    observeResults();\n  }"
    text = regex_once(text, r"  function init\(\) \{.*?\n  \}\n\n  init\(\);", live_init + "\n\n  init();", 'automatic access init')
    for marker in ['np_matrix_building_level', 'data-building-level', 'createHeightSelector', 'Multiple levels', 'roofCleaningIncluded']:
        if marker in text:
            raise SystemExit(f'legacy manual access marker remains: {marker}')
    for marker in ['Automatic access check:', "detection: 'automatic'", 'elevatedAccessIncluded: false', 'Do not price roof, gutter, two-story']:
        if marker not in text:
            raise SystemExit(f'automatic access marker missing: {marker}')
    return text


def main():
    SETTINGS.write_text(patch_settings(SETTINGS.read_text()))
    SHELL.write_text(patch_shell(SHELL.read_text()))
    ENHANCEMENTS.write_text(patch_enhancements(ENHANCEMENTS.read_text()))
    print('Applied No Problem signing-cutover recovery and production access-boundary parity patch.')


if __name__ == '__main__':
    main()
