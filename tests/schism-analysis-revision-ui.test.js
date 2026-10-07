'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

const index = read('index.html');
const revision = read('analysis-revision.js');
const preflight = read('workflow-preflight.js');
const learning = read('job-learning.js');

assert(index.includes('<script src="/analysis-revision.js" defer></script>'), 'revision intelligence browser module is not loaded');
assert(index.includes('SchismRevisionIntelligence.capture(data.rawMatrixData'), 'analysis results do not enter Revision Watch');
assert(index.includes('SchismRevisionIntelligence.seed(project.matrixData'), 'saved projects do not seed revision history');
assert(index.includes("new CustomEvent('schism:project-loaded'"), 'saved project loads do not refresh property context');

assert(revision.includes('Revision Watch'), 'Revision Watch UI is missing');
assert(revision.includes('What changed after re-analysis'), 'revision explanation heading is missing');
assert(revision.includes('sameEvidenceMaterialDrift'), 'same-evidence instability detection is missing');
assert(revision.includes('Analysis changed materially without a new photo-count signal'), 'consistency concern explanation is missing');
assert(revision.includes('Revision Watch is advisory only.'), 'revision governance notice is missing');
assert(revision.includes('sessionStorage'), 'revision history is not session-scoped');
assert(!revision.includes('MATRIX_ACTIVE_CALIBRATION_JSON'), 'revision intelligence touches active calibration');
assert(!revision.includes('fetch('), 'revision intelligence unexpectedly adds a network dependency');

assert(learning.includes('function buildPropertyMemory(address, records)'), 'property memory builder is missing');
assert(learning.includes('Historical context only'), 'property memory stale-data warning is missing');
assert(learning.includes('function currentPropertyMemory(address)'), 'browser property memory lookup is missing');

assert(preflight.includes('window.SchismJobLearning.currentPropertyMemory(address)'), 'Matrix Next Move does not consume property memory');
assert(preflight.includes('window.SchismRevisionIntelligence.getCurrentRevision()'), 'Matrix Next Move does not consume revision state');
assert(preflight.includes("document.addEventListener('schism:revision-changed', renderBrowser)"), 'preflight does not refresh on revision changes');
assert(preflight.includes("document.addEventListener('schism:project-loaded', renderBrowser)"), 'preflight does not refresh after saved-project loads');
assert(preflight.includes('Property Memory'), 'property memory context is not visible in Matrix Next Move');

console.log('Schism revision/property memory UI QA passed');
