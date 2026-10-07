'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

const index = read('index.html');
const preflight = read('workflow-preflight.js');

assert(index.includes('<script src="/workflow-preflight.js" defer></script>'), 'adaptive preflight browser module is not loaded');
assert(preflight.includes('Matrix Next Move'), 'Matrix Next Move UI is missing');
assert(preflight.includes('Property → Scope → Evidence → Analyze → Resolve Review → Crew'), 'workflow ladder is missing');
assert(preflight.includes("state: 'property_required'"), 'property gate is missing');
assert(preflight.includes("state: 'scope_required'"), 'scope gate is missing');
assert(preflight.includes("state: 'evidence_required'"), 'evidence gate is missing');
assert(preflight.includes("? 'analysis_review_bound' : 'analysis_ready'"), 'analysis-ready state routing is missing');
assert(preflight.includes("'Ready to Analyze'"), 'analysis-ready operator label is missing');
assert(preflight.includes("'Analyze for Review'"), 'review-bound analysis operator label is missing');
assert(preflight.includes("nextBest ? 'evidence_followup' : 'manual_review'"), 'adaptive review routing is missing');
assert(preflight.includes("'One More Look'"), 'adaptive evidence-followup operator label is missing');
assert(preflight.includes("'Review Locked'"), 'manual review operator label is missing');
assert(preflight.includes("state: 'crew_ready'"), 'crew-ready state is missing');
assert(preflight.includes('Select at least one service so SchismMatrix does not invent the requested scope.'), 'scope-invention protection is missing');
assert(preflight.includes('At least one property image is required before analysis.'), 'minimum evidence gate is missing');
assert(preflight.includes('Multiple levels exceed the launch field-execution boundary'), 'high-access review boundary is missing');
assert(preflight.includes("window.SchismDashboard.selectCrew()"), 'crew-ready preflight cannot hand off into Crew Command');
assert(preflight.includes("window.SchismWalkaround.open()"), 'evidence preflight cannot launch Property Walk');
assert(preflight.includes("window.submitJobForAnalysis"), 'analysis-ready preflight cannot execute analysis');
assert(preflight.includes("document.addEventListener('schism:decision-support-changed', renderBrowser)"), 'preflight does not react to analysis intelligence');
assert(preflight.includes("document.addEventListener('schism:workspace-changed', renderBrowser)"), 'preflight does not react to workspace changes');
assert(preflight.includes("window.SchismJobLearning.buildServiceAdvisories"), 'preflight does not consume completed-job learning signals');
assert(preflight.includes("window.SchismJobLearning.currentBrowserAnalysis()"), 'preflight does not read the current device-local learning analysis');
assert(preflight.includes("document.addEventListener('schism:job-learning-changed', renderBrowser)"), 'preflight does not refresh when job learning changes');
assert(!preflight.includes('fetch('), 'preflight unexpectedly adds a network dependency');

console.log('Schism workflow preflight UI QA passed');
