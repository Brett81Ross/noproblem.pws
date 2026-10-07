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

console.log('Schism early-August restoration QA passed');
