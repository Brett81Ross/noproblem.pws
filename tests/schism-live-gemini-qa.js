'use strict';
// Explicit opt-in only: this executes one real isolated Gemini analysis when
// a distinct QA key and synthetic image are intentionally provided.
// No Vercel deployment and no production customer data.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
async function main(){
  assert.equal(process.env.SCHISM_ALLOW_LIVE_QA,'YES',
    'Live QA is disabled. Set SCHISM_ALLOW_LIVE_QA=YES only after approving the isolated test.');
  const key=process.env.SCHISM_QA_GEMINI_KEY;
  assert(key&&key.length>20,'Separate SCHISM_QA_GEMINI_KEY is required. Do not reuse the production key.');
  assert(!process.env.GEMINI_API_KEY || key!==process.env.GEMINI_API_KEY,
    'QA key must differ from the production GEMINI_API_KEY.');
  const imagePath=process.env.SCHISM_QA_SYNTHETIC_JPEG;
  assert(imagePath&&path.extname(imagePath).toLowerCase()==='.jpg',
    'Provide a fictional/synthetic JPEG path via SCHISM_QA_SYNTHETIC_JPEG.');
  const bytes=fs.readFileSync(imagePath);
  assert(bytes.length>1000&&bytes.length<500000,
    'Synthetic QA JPEG must be between 1 KB and 500 KB.');
  assert(bytes[0]===255&&bytes[1]===216,'QA image is not JPEG.');
  const previous=process.env.GEMINI_API_KEY;
  try {
    process.env.GEMINI_API_KEY=key;
    const handler=require('../api/analyze.js');
    let status=200,data;
    const response={status(code){status=code;return this},json(body){data=body;return this}};
    await handler({method:'POST',body:{
      images:[bytes.toString('base64')],
      requestedServices:['driveway_cleaning'],
      evidenceMeta:[{source:'operator_upload',operatorConfirmationState:'operator_selected'}],
      buildingScope:{level:'one',label:'One story'},
      siteNotes:'FICTIONAL QA IMAGE. No physical property observed or customer information supplied.',
      job:{name:'SCHISM QA FIXTURE ONLY',address:'FICTIONAL ADDRESS — NOT A REAL JOB'}
    }},response);
    assert.equal(status,200,'Gemini integration did not return 200: '+String(data?.error||data?.details||status));
    const scan=data?.rawMatrixData;
    assert(scan&&typeof scan==='object'&&Array.isArray(scan.services),'Response is missing Matrix service structure.');
    assert(scan.services.every(item=>item.serviceId!=='roof_soft_wash'&&
      item.serviceId!=='gutter_cleaning'&&item.serviceId!=='gutter_brightening'),
      'Excluded scope must never enter the quote.');
    assert(scan.evidenceReview&&typeof scan.evidenceReview.readyForEstimate==='boolean',
      'AI must return an explicit evidence readiness determination.');
    const summary={
      httpStatus:status,success:true,
      model:process.env.SCHISM_GEMINI_MODEL||'gemini-3.6-flash',
      serviceCount:scan.services.length,
      readyForEstimate:scan.evidenceReview.readyForEstimate,
      requiresHumanReview:scan.requiresHumanReview===true,
      excludedScopePresent:false
    };
    console.log('Schism isolated live Gemini acceptance:',JSON.stringify(summary));
    // A fictional image must not be represented as field-approved evidence;
    // this test records what the AI said, it does not release a crew job.
  }finally{
    if(previous===undefined)delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY=previous;
  }
}
main().catch(error=>{console.error('Schism isolated live QA failed:',error.message);process.exitCode=1});
