'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8');
}

const shell = read('runtime/base-shell.html');
const walk = read('schism-walkaround.js');
const analyze = read('api/analyze.js');
const enhancements = read('enhancements.js');

assert(shell.includes('let stagedEvidenceMeta = [];'), 'staged evidence metadata store is missing');
assert(shell.includes('stagedEvidenceMeta.push('), 'stageFiles does not preserve evidence metadata');
assert(shell.includes('stagedEvidenceMeta.splice(index, 1);'), 'removing an image does not remove matching evidence metadata');
assert(shell.includes('evidenceMeta: payloadEvidenceMeta'), 'analysis request does not transmit aligned evidence metadata');

assert(walk.includes('audio: false'), 'property walk must not request microphone access');
assert(walk.includes("source: manual ? 'walkaround_manual_capture' : 'walkaround_sampled_frame'"), 'walkaround capture provenance is missing');
assert(walk.includes("operatorConfirmationState: manual ? 'operator_captured' : 'not_confirmed'"), 'manual and sampled evidence are not distinguished');

assert(analyze.includes("new Set(['walkaround_manual_capture', 'walkaround_sampled_frame', 'operator_upload'])"), 'server evidence source allowlist is missing');
assert(analyze.includes('const explicitlyReady = scanData.evidenceReview?.readyForEstimate === true;'), 'server field-readiness must be explicit');
assert(analyze.includes('scanData.requiresHumanReview = true;'), 'server fail-closed human-review lock is missing');

assert(!enhancements.includes('multi-level exterior and roof soft washing are enabled'), 'stale high-access enablement copy remains');
assert(read('api/shell.js').includes("<title>SchismMatrix™ — Property Intelligence</title>"), 'generated shell title is not SchismMatrix');
assert(read('api/shell.js').includes('SchismMatrix™ · v1.1.0'), 'Schism footer/version is missing');
assert(read('api/shell.js').includes('https://cactusbyte-studios.vercel.app'), 'CactusByte footer destination is missing');
assert(read('runtime/base-shell.html').includes('SchismMatrix™ · v1.1.0'), 'runtime footer is not SchismMatrix');
assert(!read('runtime/base-shell.html').includes('© 2026 No Problem Pressure Washing Matrix™'), 'legacy main footer remains in runtime shell');
assert(read('runtime/base-shell.html').includes('/assets/schismmatrix-symbol.svg'), 'runtime shell does not use SchismMatrix symbol');
assert(read('runtime/base-shell.html').includes('class="schism-wordmark"'), 'runtime shell is missing SchismMatrix wordmark');
assert(read('runtime/base-shell.html').includes('Property Intelligence'), 'runtime shell is missing Schism descriptor');
assert(!read('runtime/base-shell.html').includes('src="noproblem.webp"'), 'legacy No Problem header image remains in runtime shell');
assert(enhancements.includes('Multiple levels were observed. Launch scope excludes roofs, ladders, gutter work, and high-access/multi-level execution; manual review is required.'), 'multi-level safety copy is missing');

console.log('Schism evidence contract QA passed');
