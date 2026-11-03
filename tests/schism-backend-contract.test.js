'use strict';
const assert=require('node:assert/strict');
const Module=require('node:module');
const path=require('node:path');
const called={count:0,contents:null};
let generated=null;
const original=Module._load;
Module._load=function(request,parent,isMain){
  if(request==='@google/generative-ai'){
    return {GoogleGenerativeAI:class{
      getGenerativeModel(){
        return {generateContent:async contents=>{
          called.count+=1;
          called.contents=contents;
          return {response:{text:()=>generated}};
        }};
      }
    }};
  }
  return original.apply(this,arguments);
};
let analyze;
try{analyze=require(path.join(__dirname,'../api/analyze.js'))}finally{Module._load=original}
assert.equal(typeof analyze,'function');

async function request(method,body){
  let status=200,result;
  const response={
    status(code){status=code;return this},
    json(value){result=value;return this}
  };
  await analyze({method,body},response);
  return {status,result};
}
async function main(){
  const previousKey=process.env.GEMINI_API_KEY;
  try{
    delete process.env.GEMINI_API_KEY;
    let r=await request('GET',{});
    assert.equal(r.status,405);
    r=await request('POST',undefined);
    assert.equal(r.status,400,'absent JSON body should not crash as 500');
    r=await request('POST',[]);
    assert.equal(r.status,400,'array JSON body must be rejected');
    r=await request('POST',{});
    assert.equal(r.status,400,'no photographs must fail with 400');
    r=await request('POST',{images:['not-base64']});
    assert.equal(r.status,400,'malformed image must fail before AI lookup');
    r=await request('POST',{images:[Buffer.from('not-a-jpeg').toString('base64')]});
    assert.equal(r.status,400,'non-JPEG image must fail before AI lookup');
    r=await request('POST',{images:Array(25).fill(Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64'))});
    assert.equal(r.status,400,'too many images must be rejected instead of silently ignored');
    assert.equal(called.count,0,'invalid requests may not consume AI credits');
    // The real environment can carry several legacy Gemini key names.
    const envKeys=Object.keys(process.env).filter(k=>k.toLowerCase().includes('gemini')&&k.toLowerCase().includes('key'));
    const backup=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
    try{
      envKeys.forEach(k=>delete process.env[k]);
      r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
      assert.equal(r.status,500);
      assert.match(r.result.error,/Gemini API key is missing/);
      assert.equal(called.count,0,'missing key must not invoke Gemini');
    }finally{Object.entries(backup).forEach(([k,v])=>process.env[k]=v)}
    process.env.GEMINI_API_KEY='schism-local-qa-key-not-real';
    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',label:'Driveway Cleaning',quantity:200,quantityUnit:'sq_ft',calculatedPrice:50,estimatedTimeMinutes:45,waterUsageGallons:80},
                {serviceId:'roof_soft_wash',label:'Excluded Roof',quantity:200,quantityUnit:'sq_ft',calculatedPrice:100}],
      evidenceReview:{readyForEstimate:false,summary:'Additional evidence is required',missingEvidence:[{prompt:'Photograph the runoff path'}],uncertainEvidence:[]},
      fieldPlan:{difficulty:'moderate',totalEstimatedHours:'1 Hour',crewSizeRecommended:1}
    });
    r=await request('POST',{
      images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')],
      requestedServices:['driveway_cleaning','roof_soft_wash'],
      buildingScope:{level:'multiple',label:'Multi-level structure'},
      siteNotes:'Synthetic acceptance, not a real customer'
    });
    assert.equal(r.status,200,'mock Gemini response should pass route pipeline: '+JSON.stringify(r.result));
    assert.equal(r.result.success,true);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true);
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,false);
    assert(r.result.rawMatrixData.services.every(s=>s.serviceId!=='roof_soft_wash'));
    assert(!called.contents?.[0]?.includes('Customer-requested launch services to evaluate against the photos: driveway_cleaning, roof_soft_wash'),
      'excluded service must not reach requested scope prompt');
    assert.equal(called.count,1);
    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:250,estimatedTimeMinutes:35,waterUsageGallons:75}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[{priority:'high',prompt:'Show the runoff outlet'}],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true,'high-priority missing evidence must block readiness');
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,false);

    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:250,estimatedTimeMinutes:null,waterUsageGallons:null}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true,'missing time/water basis must block readiness');
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,false);

    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:800,estimatedTimeMinutes:60,waterUsageGallons:110}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{
      images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')],
      satelliteMeasurements:[
        {label:'Main Driveway',kind:'area',quantity:800,unit:'sq_ft'},
        {label:'main driveway',kind:'area',quantity:1250,unit:'sq_ft'}
      ]
    });
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true,'conflicting aerial measurements must block');
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,false);
    // Explicitly ready must fail closed when the model varies priority casing.
    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:2000,estimatedTimeMinutes:60,waterUsageGallons:120}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[{priority:' HIGH ',prompt:'Inspect the runoff path'}],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,false,'case-varied HIGH evidence must block approval');
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true);
    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:2000,estimatedTimeMinutes:-15,waterUsageGallons:120}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true,'negative original crew time must require review');
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,false);
    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:2000,estimatedTimeMinutes:60,waterUsageGallons:-25}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true,'negative original water estimate must require review');
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,false);
    generated=JSON.stringify({
      services:[],
      evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true,'empty services may not appear ready');
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,false);
    assert(r.result.rawMatrixData.quoteGuardrails.issues.some(issue=>issue.code==='NO_EXECUTABLE_SCOPE'));
    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:1500000,estimatedTimeMinutes:60,waterUsageGallons:120}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,true,'oversized service may not be silently priced at the limit');
    assert.equal(r.result.rawMatrixData.services.length,0);
    assert(r.result.rawMatrixData.quoteGuardrails.issues.some(issue=>issue.code==='INVALID_QUANTITY'));
    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:2000,estimatedTimeMinutes:60,waterUsageGallons:120}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,200);
    assert.equal(r.result.rawMatrixData.requiresHumanReview,false,'valid above-minimum work must remain ready');
    assert.equal(r.result.rawMatrixData.evidenceReview.readyForEstimate,true);
    assert.equal(r.result.rawMatrixData.services[0].calculatedPrice,360);
    // No API credits may be used for mismatched or unconfirmed photo coverage.
    const sample=Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64');
    const previousCount=called.count;
    r=await request('POST',{images:[sample,sample],photoSelection:{
      stagedCount:24,selectedSlots:[1,24],operatorConfirmed:false
    }});
    assert.equal(r.status,400,'omitted photos require operator confirmation before AI');
    r=await request('POST',{images:[sample,sample],photoSelection:{
      stagedCount:24,selectedSlots:[1,1],operatorConfirmed:true
    }});
    assert.equal(r.status,400,'duplicate staged slots cannot misidentify evidence');
    r=await request('POST',{images:[sample,sample],photoSelection:{
      stagedCount:24,selectedSlots:[1,25],operatorConfirmed:true
    }});
    assert.equal(r.status,400,'out of range staged slot cannot reach AI');
    r=await request('POST',{images:[sample,sample],photoSelection:{
      stagedCount:1,selectedSlots:[1,2],operatorConfirmed:true
    }});
    assert.equal(r.status,400,'staged count cannot underreport submitted photo count');
    assert.equal(called.count,previousCount,'invalid photo mappings must be rejected before model invocation');
    generated=JSON.stringify({
      services:[{serviceId:'driveway_cleaning',quantity:2000,estimatedTimeMinutes:60,waterUsageGallons:120}],
      evidenceReview:{readyForEstimate:true,missingEvidence:[],uncertainEvidence:[]},
      fieldPlan:{difficulty:'low'}
    });
    r=await request('POST',{images:[sample,sample],evidenceMeta:[
      {source:'operator_upload',capturedAt:'first'},
      {source:'walkaround_manual_capture',capturedAt:'last'}
    ],photoSelection:{stagedCount:24,selectedSlots:[1,24],operatorConfirmed:true}});
    assert.equal(r.status,200);
    assert.deepEqual(r.result.rawMatrixData.photoCoverage,{
      stagedCount:24,submittedCount:2,omittedCount:22,selectedSlots:[1,24],operatorConfirmed:true
    });
    assert.equal(called.count,previousCount+1,'one selected set must produce only one model invocation');
    assert.equal(called.contents.length,3,'the model receives one prompt and exactly two selected photos');
    assert(called.contents[0].includes('Only 2 of 24 staged photos were selected'));
    assert(called.contents[0].includes('22 other staged photos were NOT sent'));
    assert(called.contents[0].includes('"stagedSlot":24'));
    generated='{not valid json';
    r=await request('POST',{images:[Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9','hex').toString('base64')]});
    assert.equal(r.status,500,'bad AI response must be rejected, never shown as a ready quote');
    assert.equal(r.result.error,'Analysis Engine Failure');
    assert(!JSON.stringify(r.result).includes('{not valid json'),'raw AI response must never appear in HTTP error');
    assert.equal(called.count,12,'mock model requests must match expected offline test cases');
    console.log('Schism mock backend HTTP/AI safety QA passed (no real key or AI calls)');
  }finally{
    if(previousKey===undefined)delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY=previousKey;
  }
}
main().catch(err=>{console.error(err.stack||err);process.exitCode=1});
