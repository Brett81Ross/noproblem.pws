const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const contract=require('../schism-release-contract');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const match=html.match(/<script id="schismAugustDashboardController">([\s\S]*?)<\/script>/);
assert(match,'Crew Command controller script must exist');
const controller=match[1];
const KEY='schismmatrix-crew-handoff-v1';

function releaseFixture(){
  const matrix={
    __schismEstimate:{estimateId:'est_1',revision:1,jobKey:'test property|123 test st'},
    requiresHumanReview:false,
    evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
    services:[{scopeItemId:'scope_a',serviceId:'house_wash',estimatedTimeMinutes:45,waterUsageGallons:90,calculatedPrice:150}],
    fieldPlan:{totalEstimatedMinutes:45,totalWaterUsageGallons:90,totalEstimatedHours:'0.8 Hours',crewSizeRecommended:1}
  };
  const snapshot={
    schemaVersion:contract.SCHEMA_VERSION,
    releaseId:'release_a',status:'released',deviceAuthority:'local',
    releasedAt:'2026-10-12T14:00:00Z',estimateId:'est_1',estimateRevision:1,
    estimateRevisionId:'est_1:r1',jobName:'Test property',jobAddress:'123 Test St',
    approvedTotal:'$150.00',approvedTotalCents:15000,photoCount:0,
    selectedScopeItemIds:['scope_a'],evidence:[],siteNotes:'',
    workBasis:{services:[{scopeItemId:'scope_a',estimatedTimeMinutes:45,waterUsageGallons:90}],totalEstimatedMinutes:45,totalWaterUsageGallons:90},
    matrixData:matrix
  };
  snapshot.integrityFingerprint=contract.computeReleaseFingerprint(snapshot);
  assert.equal(contract.validateRelease(snapshot).ok,true);
  return snapshot;
}
function createTab(shared){
  const nodes=new Map(),docListeners=new Map(),winListeners=new Map();
  let counter=0,fieldRenders=0;
  function node(id){
    if(!nodes.has(id)){
      const classes=new Set();
      nodes.set(id,{
        id,hidden:false,style:{},textContent:'',innerText:'',innerHTML:'',value:'',disabled:false,
        classList:{
          add:(key)=>classes.add(key),remove:(key)=>classes.delete(key),
          contains:(key)=>classes.has(key),toggle:(key,force)=>{
            if(force===undefined)force=!classes.has(key);
            if(force)classes.add(key);else classes.delete(key);
            return force;
          }
        },
        addEventListener(type,fn){this._events||(this._events={});(this._events[type]||=([])).push(fn);},
        setAttribute(){},scrollIntoView(){},appendChild(){},
        click(){for(const fn of (this._events?.click||[])) fn({preventDefault(){},stopImmediatePropagation(){}});},
        querySelector(){return null;},querySelectorAll(){return []}
      });
    }
    return nodes.get(id);
  }
  const document={
    hidden:false,body:{},
    getElementById:node,
    querySelector(){return null;},
    querySelectorAll(){return []},
    addEventListener:(type,fn)=>{(docListeners.get(type)||docListeners.set(type,[]).get(type)).push(fn);}
  };
  const localStorage={
    getItem:key=>shared.has(key)?shared.get(key):null,
    setItem:(key,value)=>shared.set(key,String(value)),
    removeItem:key=>shared.delete(key)
  };
  const ctx={
    document,localStorage,SchismReleaseContract:contract,
    crypto:{randomUUID:()=>('test-'+(++counter))},
    performance:{now:()=>0},
    techMatrixData:null,userSiteNotes:'',currentJobLocation:null,
    stagedBase64Images:[],stagedEvidenceMeta:[],priceItemsRegistry:[],
    setAppMode(){},
    renderTechModeView(){fieldRenders++;},
    renderAdminModeView(){},
    renderPreviewGrid(){},
    requestAnimationFrame:fn=>fn(),
    setTimeout(){},
    MutationObserver:undefined,
    CustomEvent:function(type,init){this.type=type;this.detail=init?.detail||{};},
    scrollTo(){},
    addEventListener:(type,fn)=>{(winListeners.get(type)||winListeners.set(type,[]).get(type)).push(fn);},
    dispatchEvent(){}
  };
  ctx.window=ctx;
  ctx.document.dispatchEvent=(event)=>{for(const fn of docListeners.get(event.type)||[])fn(event);};
  vm.runInNewContext(controller,ctx,{filename:'SchismDashboard'});
  for(const fn of docListeners.get('DOMContentLoaded')||[])fn();
  return {
    ctx,node,
    emitWindow:(type,event={})=>{for(const fn of winListeners.get(type)||[])fn(event);},
    fieldRenderCount:()=>fieldRenders,
    put:snap=>localStorage.setItem(KEY,JSON.stringify(snap)),
    stored:()=>JSON.parse(localStorage.getItem(KEY))
  };
}
function ready(tab){
  tab.ctx.SchismDashboard.selectCrew();
  assert.equal(tab.node('crewReleaseStatus').textContent,'Device Release · Field Ready');
  assert.notEqual(tab.node('resultsSection').style.display,'none');
}
function blocked(tab){
  assert.equal(tab.node('crewReleaseStatus').textContent,'Re-release Required');
  assert.equal(tab.node('resultsSection').style.display,'none','invalid release must hide execution plan');
  assert.equal(tab.node('crewApprovalState').textContent,'Re-release Required');
}
{
  const shared=new Map(),tab=createTab(shared),s=releaseFixture();
  s.approvedTotal='$999.00'; // No new fingerprint: tampered store
  tab.put(s);
  tab.ctx.SchismDashboard.selectCrew();
  blocked(tab);
}
{
  const shared=new Map(),tab=createTab(shared);
  tab.put(releaseFixture());
  ready(tab);
  const before=tab.fieldRenderCount();
  tab.put(contract.markSuperseded(tab.stored(),'Estimate edited'));
  tab.emitWindow('storage',{key:KEY});
  blocked(tab);
  assert.equal(tab.fieldRenderCount(),before,'superseded releases must not render the field plan again');
  tab.emitWindow('focus');
  blocked(tab);
}
{
  const shared=new Map(),tab=createTab(shared),s=releaseFixture();
  tab.put(s);ready(tab);
  s.status='unexpected';
  s.integrityFingerprint=contract.computeReleaseFingerprint(s);
  tab.put(s);
  tab.emitWindow('focus');
  blocked(tab);
  delete s.status;
  s.integrityFingerprint=contract.computeReleaseFingerprint(s);
  tab.put(s);
  tab.emitWindow('storage',{key:KEY});
  blocked(tab);
}
{
  const shared=new Map(),tabA=createTab(shared),tabB=createTab(shared);
  tabA.put(releaseFixture());
  ready(tabA);ready(tabB);
  tabA.ctx.SchismDashboard.markEstimateMutated('Scope changed');
  tabB.emitWindow('storage',{key:KEY});
  blocked(tabB);
}
{
  const shared=new Map(),tab=createTab(shared);
  tab.put(releaseFixture());ready(tab);
  tab.ctx.techMatrixData.evidenceReview.readyForEstimate=false;
  tab.emitWindow('focus');
  blocked(tab);
}
{
  const tab=createTab(new Map());
  const previous={
    __schismEstimate:{estimateId:'est_1',revision:1,jobKey:'|'},
    services:[
      {serviceId:'house_wash',scopeItemId:'one'},
      {serviceId:'house_wash',scopeItemId:'two'},
      {serviceId:'driveway_cleaning',scopeItemId:'stable'}
    ]
  };
  const newMatrix={services:[
    {serviceId:'house_wash'},{serviceId:'house_wash'},
    {serviceId:'driveway_cleaning'}
  ]};
  tab.ctx.SchismDashboard.prepareMatrixForEstimate(newMatrix,previous);
  assert.notEqual(newMatrix.services[0].scopeItemId,'one','ambiguous first item must have new identity');
  assert.notEqual(newMatrix.services[1].scopeItemId,'two','ambiguous second item must have new identity');
  assert.notEqual(newMatrix.services[0].scopeItemId,newMatrix.services[1].scopeItemId);
  assert.equal(newMatrix.services[2].scopeItemId,'stable','unique service identity should persist');
}
{
  const tab=createTab(new Map()),s=releaseFixture();
  tab.put(s);ready(tab);
  const previous=tab.ctx.techMatrixData;
  const next={services:[{serviceId:'house_wash',estimatedTimeMinutes:50,waterUsageGallons:95}],
    requiresHumanReview:false,evidenceReview:{readyForEstimate:true}};
  tab.node('jobName').value='Test property';
  tab.node('jobAddress').value='123 Test St';
  tab.ctx.techMatrixData=tab.ctx.SchismDashboard.prepareMatrixForEstimate(next,previous);
  tab.ctx.SchismDashboard.noteEstimateReanalysis(previous);
  assert.equal(tab.stored().status,'superseded','reanalysis must supersede old release');
  assert.equal(tab.ctx.techMatrixData.__schismEstimate.revision,2);
  blocked(tab);
}
{
  const tab=createTab(new Map()),s=releaseFixture();
  tab.put(s);ready(tab);
  const definitions={house_wash:{estimatedTimeMinutes:500,waterUsageGallons:900}};
  tab.emitWindow('focus');
  assert.equal(tab.ctx.SchismDashboard.getFieldReadyRelease().snapshot.matrixData.services[0].estimatedTimeMinutes,45,
    'global definition changes must not alter frozen released work values');
  assert.equal(tab.ctx.SchismDashboard.getFieldReadyRelease().snapshot.matrixData.services[0].waterUsageGallons,90);
  assert.equal(definitions.house_wash.waterUsageGallons,900);
}
{
  const tab=createTab(new Map()),s=releaseFixture();
  tab.ctx.techMatrixData=JSON.parse(JSON.stringify(s.matrixData));
  tab.ctx.priceItemsRegistry=[{scopeItemId:'scope_a',serviceId:'house_wash',value:150,disabled:false}];
  tab.node('jobName').value='Test property';
  tab.node('jobAddress').value='123 Test St';
  tab.node('grandTotalDisplay').textContent='$0.01'; // Animated, not final.
  tab.node('btnCrewHandoff').click();
  assert.equal(tab.stored().approvedTotal,'$150.00','release total must ignore intermediate animation');
  assert.equal(tab.stored().approvedTotalCents,15000);
  assert.equal(tab.ctx.SchismDashboard.getFieldReadyRelease().ok,true);
  assert.equal(tab.ctx.SchismDashboard.workflowState().crewReleased,true,'dashboard API uses same selector');
  tab.ctx.techMatrixData.evidenceReview.readyForEstimate=false;
  assert.equal(tab.ctx.SchismDashboard.workflowState().crewReleased,false,'dashboard API must block current evidence regression');
}
{
  // A valid release for Property A must not mark a different active Property B ready.
  const tab=createTab(new Map()),s=releaseFixture();
  tab.put(s);
  tab.ctx.techMatrixData=JSON.parse(JSON.stringify(s.matrixData));
  tab.node('jobName').value='Test property';
  tab.node('jobAddress').value='123 Test St';
  assert.equal(tab.ctx.SchismDashboard.getCurrentEstimateRelease().ok,true);
  tab.node('jobAddress').value='999 Different Address';
  assert.equal(tab.ctx.SchismDashboard.getCurrentEstimateRelease().code,'different_property');
  tab.node('jobAddress').value='123 Test St';
  tab.ctx.techMatrixData.__schismEstimate.estimateId='est_unrelated';
  assert.equal(tab.ctx.SchismDashboard.getCurrentEstimateRelease().code,'different_estimate');
  assert.equal(tab.ctx.SchismDashboard.getFieldReadyRelease().ok,true,'prior valid local record may still exist; it is not the new job release');
}
{
  const tab=createTab(new Map()),s=releaseFixture();
  tab.put(s); ready(tab);
  tab.ctx.__schismReleaseState={locked:true,reason:'Re-analysis in progress'};
  tab.ctx.document.dispatchEvent({type:'schism:release-state-changed'});
  blocked(tab);
  assert.equal(tab.ctx.SchismDashboard.getFieldReadyRelease().code,'analysis_not_approved');
  tab.ctx.__schismReleaseState={locked:false,reason:''};
  tab.ctx.document.dispatchEvent({type:'schism:release-state-changed'});
  ready(tab);
}
{
  const tab=createTab(new Map()),s=releaseFixture();
  tab.put(s); ready(tab);
  tab.ctx.techMatrixData=JSON.parse(JSON.stringify(s.matrixData));
  tab.node('jobName').value='Test property';
  tab.node('jobAddress').value='123 Test St';
  tab.ctx.priceItemsRegistry=[{scopeItemId:'different_id',serviceId:'driveway_cleaning',value:50,disabled:false}];
  assert.equal(tab.ctx.SchismDashboard.getCurrentEstimateRelease().code,'different_selection',
    'a newly selected scope may not borrow an earlier scope release');
  tab.ctx.priceItemsRegistry=[{scopeItemId:'scope_a',serviceId:'house_wash',value:150,disabled:true}];
  assert.equal(tab.ctx.SchismDashboard.getCurrentEstimateRelease().code,'different_selection',
    'deselecting the entire quote scope must never retain Field Ready');
}
{
  // Exercise the actual PDF action body, not just whether its click listener exists.
  // A MutationObserver may add the button after the dashboard binds its listeners.
  const enhancementSource=fs.readFileSync(path.join(__dirname,'../enhancements.js'),'utf8');
  const start=enhancementSource.indexOf('  function downloadQuotePdf() {');
  const nextHelper=enhancementSource.indexOf('  function decisionEscapeHtml(value) {',start);
  const end=nextHelper>start?nextHelper:enhancementSource.indexOf('  function ensurePdfButton() {',start);
  assert(start>=0&&end>start,'PDF action must exist');
  const pdfAction=enhancementSource.slice(start,end);
  function invokePdf(fieldMode,validRelease){
    const result={downloads:0,notices:[]};
    const button={click:()=>{result.downloads++;}};
    const document={
      body:{classList:{contains:key=>key==='tech-mode'&&fieldMode},appendChild(){},removeChild(){}},
      getElementById:id=>id==='crewCommandPanel'?{classList:{contains:key=>key==='is-visible'&&fieldMode}}:null,
      querySelector:()=>({}),
      createElement:()=>button
    };
    const window={SchismDashboard:{getFieldReadyRelease:()=>({ok:validRelease})}};
    const env={document,window,
      showNotice:text=>result.notices.push(text),
      blockQuoteRelease:()=>false,
      createPdfBlob:()=>({}),quotePdfLines:()=>[],pdfFileName:()=>('approved-quote.pdf'),
      URL:{createObjectURL:()=>('blob:fixture'),revokeObjectURL(){}},
      setTimeout(){}};
    vm.runInNewContext(pdfAction+'\ndownloadQuotePdf();',env);
    return result;
  }
  const blocked=invokePdf(true,false);
  assert.equal(blocked.downloads,0,'invalid release must block directly invoked PDF action');
  assert.match(blocked.notices.join(' '),/blocked/i);
  assert.equal(invokePdf(true,true).downloads,1,'valid device release may export');
  assert.equal(invokePdf(false,false).downloads,1,'normal customer quote PDF must remain available');
}
assert(!html.includes('<span>v1.1.0 · Field Ready</span>'),'dashboard must not claim release approval');
assert(html.includes("function blockUnreviewedExternalAction(actionName)"),'export guard must exist');
assert(html.includes("getFieldReadyRelease?.()"),'field exports must require central authorization');
console.log('Schism Crew Command browser integration QA passed');