'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

const index = read('index.html');
const learning = read('job-learning.js');

assert(index.includes('<script src="/job-learning.js" defer></script>'), 'job-learning browser module is not loaded');
assert(index.includes('window.SchismRuntime={'), 'read-only Schism runtime snapshot is missing');
assert(index.includes('serviceId: item.serviceId'), 'selected quote registry does not retain service IDs');
assert(index.includes("new CustomEvent('schism:workspace-changed'"), 'workspace changes do not refresh learning UI');
assert(index.includes('selectedServiceIds'), 'runtime snapshot does not expose selected quote scope');
assert(index.includes('id="matrixLearningSection"'), 'Matrix Learning pulse is missing from the command center');
assert(index.includes('id="dashLearningJobs"'), 'dashboard completed-job learning counter is missing');
assert(index.includes('id="dashLearningPrice"'), 'dashboard price-bias signal is missing');
assert(index.includes('id="dashLearningTime"'), 'dashboard time-bias signal is missing');
assert(index.includes('id="dashLearningSignal"'), 'dashboard learning-state signal is missing');

assert(learning.includes('Close Job & Teach Matrix'), 'Crew Command job completion learning UI is missing');
assert(learning.includes('Actual collected ($)'), 'actual revenue capture is missing');
assert(learning.includes('Actual crew minutes'), 'actual crew time capture is missing');
assert(learning.includes('Actual water gallons'), 'actual water capture is missing');
assert(learning.includes('Scope changed on site'), 'scope surprise capture is missing');
assert(learning.includes('Return visit / rework needed'), 'rework capture is missing');
assert(learning.includes('Copy Learning Report'), 'learning report export is missing');
assert(learning.includes('ADVISORY_ONLY'), 'learning recommendations are not explicitly advisory');
assert(learning.includes('writesCalibrationVault: false'), 'learning can write the calibration vault');
assert(learning.includes('requiresHumanApproval: true'), 'learning recommendations do not require human approval');
assert(learning.includes('requiresSeparateValidatedActivation: true'), 'learning recommendations bypass validated activation');
assert(learning.includes('MIN_CALIBRATION_SAMPLES = 3'), 'minimum repeated-job evidence gate is missing');
assert(learning.includes('Math.max(0.75, Math.min(1.25, medianRatio))'), 'pricing recommendation safety bound is missing');
assert(learning.includes('extremePriceVariance'), 'extreme price outcomes are not quarantined');
assert(learning.includes('extremeTimeVariance'), 'extreme time outcomes are not quarantined');
assert(learning.includes('sameJobRecord(existingRecords[0], outcome)'), 'double-submit duplicate protection is missing');
assert(learning.includes('schismmatrix_job_learning_v1'), 'learning storage namespace is missing');
assert(learning.includes('function renderDashboardPulse()'), 'Matrix Learning pulse renderer is missing');
assert(learning.includes('operationsCandidates'), 'operations trend learning is missing');
assert(learning.includes('evidenceSignals'), 'evidence-quality trend learning is missing');
assert(learning.includes('anomalyCount'), 'quarantined anomaly reporting is missing');

assert(!learning.includes('MATRIX_ACTIVE_CALIBRATION_JSON'), 'job learning is wired directly into the active calibration vault');
assert(!learning.includes("require('./lib/matrix-calibration-activation')"), 'job learning directly activates pricing calibration');
assert(!learning.includes('fetch('), 'device-local learning unexpectedly sends data over the network');

console.log('Schism job learning UI/governance QA passed');
