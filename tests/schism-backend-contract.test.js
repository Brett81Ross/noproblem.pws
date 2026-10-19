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
    assert.equal(called.count,0,'invalid requests may not consume AI credits');
    // The real environment can carry several legacy Gemini key names.
    const envKeys=Object.keys(process.env).filter(k=>k.toLowerCase().includes('gemini')&&k.toLowerCase().includes('key'));
    const backup=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
    try{
      envKeys.forEach(k=>delete process.env[k]);
      r=await request('POST',{images:['fixture-image']});
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
      images:['fixture-image'],
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
    generated='{not valid json';
    r=await request('POST',{images:['fixture-image']});
    assert.equal(r.status,500,'bad AI response must be rejected, never shown as a ready quote');
    assert.equal(r.result.error,'Analysis Engine Failure');
    assert.equal(called.count,2);
    console.log('Schism mock backend HTTP/AI safety QA passed (no real key or AI calls)');
  }finally{
    if(previousKey===undefined)delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY=previousKey;
  }
}
main().catch(err=>{console.error(err.stack||err);process.exitCode=1});
