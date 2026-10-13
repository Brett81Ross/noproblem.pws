'use strict';
// Browser QA in Chromium with simulated Fold/phone viewports.
// No deployment, API key, framework dependency, or external network required.
// This is not a physical Android test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const http=require('node:http');
const {spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css',
'.svg':'image/svg+xml','.webmanifest':'application/manifest+json',
'.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
function serve(request,response){
  let pathname;
  try{pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname)}
  catch(_){response.writeHead(400).end();return}
  if(pathname==='/')pathname='/schism-splash-v3.html';
  const filename=path.resolve(ROOT,'.'+pathname);
  if(!filename.startsWith(ROOT+path.sep)){response.writeHead(403).end();return}
  fs.readFile(filename,(error,data)=>{
    if(error){response.writeHead(404).end('Missing test asset');return}
    response.writeHead(200,{'Content-Type':MIME[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});
    response.end(data);
  });
}
function chrome(){
  const entries=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium','/usr/bin/chromium-browser'];
  const executable=entries.find(p=>p&&fs.existsSync(p));
  assert(executable,'Chromium or Google Chrome is required for mobile smoke QA.');
  return executable;
}
function getJson(url){
  return new Promise((resolve,reject)=>http.get(url,response=>{
    let text='';response.setEncoding('utf8');
    response.on('data',c=>text+=c);
    response.on('end',()=>{try{resolve(JSON.parse(text))}catch(e){reject(e)}});
  }).on('error',reject));
}
async function endpoint(profile,child){
  const filename=path.join(profile,'DevToolsActivePort');
  for(let i=0;i<160;i++){
    if(child.exitCode!==null)throw Error('Chrome exited with '+child.exitCode);
    if(fs.existsSync(filename)){
      const port=Number(fs.readFileSync(filename,'utf8').split('\n')[0]);
      const pages=await getJson('http://127.0.0.1:'+port+'/json/list');
      const page=pages.find(p=>p.type==='page'&&p.webSocketDebuggerUrl);
      if(page)return page.webSocketDebuggerUrl;
    }
    await delay(100);
  }
  throw Error('Chrome debugging endpoint timeout');
}
async function connect(url){
  const ws=new WebSocket(url),pending=new Map();let seq=0;
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
  ws.onmessage=message=>{
    const data=JSON.parse(String(message.data));if(!data.id)return;
    const p=pending.get(data.id);if(!p)return;pending.delete(data.id);
    if(data.error)p.reject(Error(JSON.stringify(data.error)));
    else p.resolve(data.result||{});
  };
  return {close:()=>ws.close(),send:(method,params={})=>new Promise((resolve,reject)=>{
    const id=++seq;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('Chrome CDP timeout: '+method))},18000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});
    ws.send(JSON.stringify({id,method,params}));
  })};
}
async function evaluate(cdp,fn){
  const result=await cdp.send('Runtime.evaluate',{
    expression:'('+fn.toString()+')()',returnByValue:true,awaitPromise:true
  });
  if(result.exceptionDetails)throw Error('Page JS: '+JSON.stringify(result.exceptionDetails).slice(0,600));
  return result.result.value;
}
async function main(){
  const server=http.createServer(serve);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const host='http://127.0.0.1:'+server.address().port;
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'schism-chrome-'));
  const child=spawn(chrome(),['--headless=new','--no-sandbox','--disable-gpu',
    '--disable-dev-shm-usage','--disable-background-networking','--disable-extensions',
    '--no-first-run','--remote-allow-origins=*','--remote-debugging-port=0',
    '--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  const fixture=path.join(profile,'photo-fixture.png');
  fs.writeFileSync(fixture,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGMM2LKPAQaYGJAAbg4AWHoBymN8plAAAAAASUVORK5CYII=','base64'));
  let cdp;
  try{
    cdp=await connect(await endpoint(profile,child));
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');
    await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
    const screens=[['narrow Android',320,720],['Fold cover',360,780],
      ['Android phone',393,852],['Fold unfolded',720,884],['Fold landscape',884,720]];
    for(const [name,width,height] of screens){
      await cdp.send('Emulation.setDeviceMetricsOverride',{
        width,height,deviceScaleFactor:2,mobile:true,screenWidth:width,screenHeight:height
      });
      await cdp.send('Page.navigate',{url:host+'/index.html'});
      await delay(1300);
      const layout=await evaluate(cdp,function(){
        const root=document.documentElement;
        const d=document.getElementById('augustDashboard');
        const offscreen=[...document.querySelectorAll('body *')].filter(el=>{
          const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
          return rect.width>0&&rect.height>0&&style.display!=='none'&&
            rect.right>innerWidth+3&&rect.left>=-3;
        }).slice(0,8).map(el=>el.tagName.toLowerCase()+(el.id?'#'+el.id:''));
        return {width:innerWidth,docWidth:root.scrollWidth,ready:!!window.SchismDashboard,
          dashboard:!!d&&!d.hidden,approved:!!window.SchismDashboard?.getFieldReadyRelease?.().ok,
          offscreen};
      });
      assert(layout.ready&&layout.dashboard,name+': dashboard failed to initialize '+JSON.stringify(layout));
      assert(!layout.approved,name+': empty store must not be Field Ready');
      assert(layout.docWidth<=width+3,name+': horizontal overflow '+JSON.stringify(layout));
      const quote=await evaluate(cdp,function(){
        const b=document.querySelector('[data-dashboard-action="quote"]');
        if(b)b.click();
        return {found:!!b,workspace:!document.getElementById('matrixWorkspace').hidden,
          address:!!document.getElementById('jobAddress')};
      });
      assert(quote.found&&quote.workspace&&quote.address,name+': Quote Matrix navigation '+JSON.stringify(quote));
      // File input uses actual Chromium FileReader -> Image -> canvas -> data URL.
      // It does not test Android camera hardware or camera permission prompts.
      const rootNode=(await cdp.send('DOM.getDocument',{depth:1})).root.nodeId;
      const fileNode=(await cdp.send('DOM.querySelector',{nodeId:rootNode,selector:'#fileInput'})).nodeId;
      assert(fileNode,name+': saved-photo input not found');
      await cdp.send('DOM.setFileInputFiles',{files:[fixture],nodeId:fileNode});
      await delay(450);
      const evidence=await evaluate(cdp,function(){
        return {
          count:document.getElementById('jobPhotoCount')?.textContent||'',
          staged:document.querySelectorAll('#evidenceGrid .evidence-slot.has-photo').length,
          encoded:!!document.querySelector('#evidenceGrid .evidence-slot.has-photo'),
          uploadAvailable:!!document.getElementById('btnTakePhoto')
        };
      });
      assert(evidence.staged>=1 && evidence.uploadAvailable,
        name+': browser image stage/compress path failed '+JSON.stringify(evidence));
      const crew=await evaluate(cdp,function(){
        window.SchismDashboard.selectCrew();
        return {panel:document.getElementById('crewCommandPanel').classList.contains('is-visible'),
          planHidden:document.getElementById('resultsSection').style.display==='none',
          approved:window.SchismDashboard.getFieldReadyRelease().ok};
      });
      assert(crew.panel&&crew.planHidden&&!crew.approved,name+': invalid crew view '+JSON.stringify(crew));
      const back=await evaluate(cdp,function(){
        document.getElementById('returnToDashboard').click();
        return !document.getElementById('augustDashboard').hidden;
      });
      assert(back,name+': return navigation failed');
      console.log('Mobile Chrome '+name+' '+width+'x'+height+': PASS');
    }

    // First-run splash acceptance: both studio and app symbols load,
    // stay inside a Fold cover screen, and tap takes the user into the app.
    await cdp.send('Emulation.setDeviceMetricsOverride',{
      width:360,height:780,deviceScaleFactor:2,mobile:true,screenWidth:360,screenHeight:780
    });
    await cdp.send('Page.navigate',{url:host+'/'});
    await delay(550);
    const splash=await evaluate(cdp,function(){
      const el=document.getElementById('splash');
      const studio=document.querySelector('.studio-mark');
      const app=document.querySelector('.app-logo');
      const images=[studio,app].map(img=>({
        found:!!img,
        loaded:!!img&&img.complete&&img.naturalWidth>0,
        left:img?.getBoundingClientRect().left||0,
        right:img?.getBoundingClientRect().right||0
      }));
      return {visible:!!el,images,width:innerWidth,docWidth:document.documentElement.scrollWidth};
    });
    assert(splash.visible&&splash.images.every(item=>
      item.loaded&&item.left>=-2&&item.right<=splash.width+2),
      'Launch splash logos are missing or clipped on Fold cover: '+JSON.stringify(splash));
    assert(splash.docWidth<=362,'Splash creates horizontal overflow');
    await evaluate(cdp,function(){document.getElementById('splash').click();return true;});
    await delay(1000);
    const entered=await evaluate(cdp,function(){
      return {route:location.pathname,dashboard:!!window.SchismDashboard,
        visible:!!document.getElementById('augustDashboard')&&!document.getElementById('augustDashboard').hidden};
    });
    assert(entered.route==='/index.html'&&entered.dashboard&&entered.visible,
      'Tap-to-enter failed: '+JSON.stringify(entered));
    console.log('Mobile Chrome Fold cover splash logos and tap-to-enter: PASS');

    // Full operator flow uses a deterministic, synthetic reviewed estimate.
    // No real customer data or AI endpoint is touched; validation is performed
    // by the same browser controller and PDF generator shipped with the app.
    await cdp.send('Emulation.setDeviceMetricsOverride',{
      width:393,height:852,deviceScaleFactor:2,mobile:true,screenWidth:393,screenHeight:852
    });
    await cdp.send('Page.navigate',{url:host+'/index.html'});
    await delay(1300);
    const prepared=await evaluate(cdp,function(){
      document.querySelector('[data-dashboard-action="quote"]').click();
      document.getElementById('jobName').value='QA SAMPLE PROPERTY';
      document.getElementById('jobAddress').value='123 Acceptance Test Lane';
      window.__schismReleaseState={locked:false,reason:''};
      techMatrixData={
        requiresHumanReview:false,
        evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
        services:[{
          serviceId:'driveway_cleaning',scopeItemId:'scope_qa_driveway',
          label:'Driveway Cleaning',quantity:1,quantityUnit:'job',
          calculatedPrice:175,estimatedTimeMinutes:45,waterUsageGallons:90,
          reason:'QA sample only'
        }],
        fieldPlan:{crewSizeRecommended:1,totalEstimatedMinutes:45,totalWaterUsageGallons:90,
          totalEstimatedHours:'0.8 Hours',difficulty:'low'},
        hazards:[]
      };
      techMatrixData=window.SchismDashboard.prepareMatrixForEstimate(techMatrixData);
      renderAdminModeView(techMatrixData);
      window.SchismDashboard.syncCrewHandoffState();
      const source=window.SchismRuntime.quoteDocument();
      return {buttonDisabled:document.getElementById('btnCrewHandoff').disabled,
        services:source?.services.length,totalCents:source?.totalCents,
        visibleTotal:document.getElementById('grandTotalDisplay').textContent};
    });
    assert.equal(prepared.buttonDisabled,false,'Reviewed synthetic quote was not eligible for handoff: '+JSON.stringify(prepared));
    assert.equal(prepared.totalCents,17500,'Quote document must use selected registry, not animated counter');

    // Capture the bytes actually passed to the browser's Blob download path.
    const pdf=await evaluate(cdp,async function(){
      let blob=null;
      const original=URL.createObjectURL;
      URL.createObjectURL=function(value){blob=value;return original.call(URL,value)};
      try {
        const button=document.getElementById('downloadQuotePdfButton');
        if(!button)return {error:'PDF button not rendered'};
        button.click();
        if(!blob)return {error:'PDF blob not generated'};
        const text=await blob.text();
        return {header:text.slice(0,8),correctTotal:text.includes('SELECTED PLAN TOTAL: $175.00'),
          service:text.includes('Driveway Cleaning'),
          falseEmpty:text.includes('No services selected.')};
      } finally {URL.createObjectURL=original}
    });
    assert(pdf.header?.startsWith('%PDF-1.4')&&pdf.correctTotal&&pdf.service&&!pdf.falseEmpty,
      'Actual generated customer PDF mismatch: '+JSON.stringify(pdf));

    const release=await evaluate(cdp,function(){
      document.getElementById('btnCrewHandoff').click();
      const saved=JSON.parse(localStorage.getItem('schismmatrix-crew-handoff-v1')||'null');
      return {saved:!!saved,status:saved?.status,approved:saved?.approvedTotal,
        valid:window.SchismDashboard.getFieldReadyRelease().ok,
        crewShown:document.getElementById('crewCommandPanel').classList.contains('is-visible'),
        fieldPlanVisible:document.getElementById('resultsSection').style.display!=='none',
        releasePdf:window.SchismRuntime.quoteDocument()};
    });
    assert(release.saved&&release.status==='released'&&release.approved==='$175.00'&&
      release.valid&&release.crewShown&&release.fieldPlanVisible&&
      release.releasePdf?.released===true&&release.releasePdf?.totalCents===17500,
      'Browser handoff must freeze and validate approved work: '+JSON.stringify(release));

    const invalidated=await evaluate(cdp,async function(){
      window.SchismDashboard.markEstimateMutated('QA scope changed');
      let attemptedBlob=null;
      const original=URL.createObjectURL;
      URL.createObjectURL=function(value){attemptedBlob=value;return original.call(URL,value)};
      try {
        document.getElementById('downloadQuotePdfButton')?.click();
        return {status:JSON.parse(localStorage.getItem('schismmatrix-crew-handoff-v1')).status,
          ready:window.SchismDashboard.getFieldReadyRelease().ok,
          planHidden:document.getElementById('resultsSection').style.display==='none',
          approvalText:document.getElementById('crewApprovalState').textContent,
          pdfGenerated:!!attemptedBlob};
      }finally{URL.createObjectURL=original}
    });
    assert(invalidated.status==='superseded'&&!invalidated.ready&&invalidated.planHidden&&
      invalidated.approvalText==='Re-release Required'&&!invalidated.pdfGenerated,
      'Mutation must block plan and PDF: '+JSON.stringify(invalidated));
    console.log('Mobile Chrome synthetic quote -> PDF -> release -> supersede: PASS');
  }finally{
    try{cdp?.close()}catch(_){}
    const exited=child.exitCode!==null?Promise.resolve():new Promise(resolve=>child.once('exit',resolve));
    child.kill('SIGTERM');
    await Promise.race([exited,delay(1800)]);
    server.close();
    // Child profile files may still flush briefly after the CDP socket closes.
    // Cleanup must not convert a successful UI test into an unrelated CI failure.
    try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
    catch(error){console.warn('Temporary Chromium profile cleanup skipped: '+error.code)}

  }
}
main().catch(error=>{console.error(error.stack||error);process.exitCode=1});
