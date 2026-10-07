'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

const analyze = read('api/analyze.js');
const enhancements = read('enhancements.js');
const index = read('index.html');

assert(analyze.includes("require('../lib/matrix-decision-support')"), 'analysis API does not load deterministic decision support');
assert(analyze.includes('scanData.decisionSupport = buildMatrixDecisionSupport({'), 'analysis API does not attach decision support');
assert(analyze.includes('requestedServices: safeRequestedServices'), 'decision support does not receive requested scope');
assert(analyze.includes('evidenceMeta: activeEvidenceMeta'), 'decision support does not receive evidence provenance');
assert(analyze.includes('satelliteMeasurements: safeMeasurements'), 'decision support does not receive measured geometry');

assert(enhancements.includes('window.__schismDecisionSupport = matrix && matrix.decisionSupport'), 'analysis response does not store decision support');
assert(enhancements.includes("new CustomEvent('schism:decision-support-changed')"), 'decision support change event is missing');
assert(enhancements.includes('id = \'schismDecisionBrief\''), 'Matrix Decision Brief card is missing');
assert(enhancements.includes('Matrix Decision Brief'), 'decision brief heading is missing');
assert(enhancements.includes('Best next capture'), 'next-best-evidence guidance is missing');
assert(enhancements.includes('Price drivers · before manual edits'), 'price-driver explanation is missing');
assert(enhancements.includes('Scope intelligence'), 'scope-difference explanation is missing');
assert(enhancements.includes('Crew Handoff'), 'crew readiness status is missing');
assert(enhancements.includes("document.addEventListener('schism:decision-support-changed', renderDecisionBrief)"), 'decision brief does not react to analysis updates');

assert(index.includes("window.__schismDecisionSupport=project.matrixData.decisionSupport"), 'saved analyzed projects do not restore decision support');
assert(index.includes("new CustomEvent('schism:decision-support-changed')"), 'saved project restore does not refresh the decision brief');

console.log('Schism decision brief QA passed');
