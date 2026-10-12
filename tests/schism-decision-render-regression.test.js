'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync(require('node:path').join(__dirname,'../enhancements.js'),'utf8');
const begin=src.indexOf('  function decisionEscapeHtml(value) {');
const end=src.indexOf('  function ensurePdfButton() {',begin);
assert(begin>=0&&end>begin,'Decision Brief logic cannot be isolated');
const logic=src.slice(begin,end);
let writes=0;
const card={
  parentNode:null,
  setAttribute(){},
  _html:'',
  get innerHTML(){return this._html},
  set innerHTML(value){this._html=value;writes++}
};
const mount={
  firstChild:null,
  insertBefore(node){node.parentNode=this;this.firstChild=node}
};
const byId=id=>id==='resultsMount'?mount:id==='schismDecisionBrief'&&card.parentNode?card:null;
const document={
  getElementById:byId,
  createElement(){return card},
  head:{appendChild(){}},
  addEventListener(type,fn){this._events||(this._events={});this._events[type]=fn}
};
const window={
  __schismDecisionSupport:{status:'field_ready',statusLabel:'Field Ready',summary:'Evidence is eligible for review',crew:{ready:true},evidence:{photoCount:3},pricing:{drivers:[]}},
  SchismDashboard:{getFieldReadyRelease:()=>({ok:false})}
};
vm.runInNewContext(logic+'\nrenderDecisionBrief();renderDecisionBrief();', {document,window});
assert.equal(writes,1,'unchanged decision content must not cause repeated DOM child mutations');
assert.match(card.innerHTML,/Release Approval Required/,'unreleased analysis cannot be labeled Field Ready');
assert.match(card.innerHTML,/Approval Required/,'Crew status must not imply unapproved readiness');
window.SchismDashboard.getFieldReadyRelease=()=>({ok:true});
document._events['schism:device-release-updated']();
assert.equal(writes,2,'validated approval must update once');
document._events['schism:device-release-updated']();
assert.equal(writes,2,'repeated valid event must not retrigger observer DOM writes');
window.SchismDashboard.getFieldReadyRelease=()=>({ok:false});
document._events['schism:device-release-updated']();
assert.equal(writes,3,'superseding release must invalidate readiness');
assert.match(card.innerHTML,/Release Approval Required/);
console.log('Schism Decision Brief DOM loop and release-state integration QA passed');