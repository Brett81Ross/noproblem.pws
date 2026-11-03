/* SchismMatrix™ local evidence vault — IndexedDB, no network or service worker. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SchismPhotoVault=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
  'use strict';
  const DATABASE='schismmatrix-evidence-v1',STORE='photo-sets',VERSION=1;
  const MAX_IMAGES=24;
  function checkPhotos(images,metadata){
    if(!Array.isArray(images)||images.length>MAX_IMAGES||
       !Array.isArray(metadata)||metadata.length!==images.length)
      throw Error('Photo data and provenance are not aligned.');
    images.forEach((image)=>{
      if(typeof image!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(image)||
         image.length>1000023)throw Error('Saved photo is invalid or exceeds the upload limit.');
    });
    metadata.forEach((item)=>{
      if(!item||typeof item!=='object'||Array.isArray(item))
        throw Error('Saved photo provenance is invalid.');
    });
  }
  function validateKey(key){
    if(typeof key!=='string'||key.length<3||key.length>200||
       !/^(?:quote|crew):[a-zA-Z0-9_.:-]+$/.test(key))throw Error('Invalid evidence record key.');
  }
  function verifyReceipt(receipt){
    if(!receipt||typeof receipt!=='object'||Array.isArray(receipt))throw Error('Evidence receipt missing.');
    validateKey(receipt.key);
    if(!Number.isSafeInteger(receipt.count)||receipt.count<0||receipt.count>MAX_IMAGES||
       typeof receipt.digest!=='string'||!/^sha256:[a-f0-9]{64}$/.test(receipt.digest))
      throw Error('Evidence receipt is invalid.');
  }
  async function digestFor(jobKey,images,metadata){
    const cryptoApi=(typeof globalThis!=='undefined'?globalThis.crypto:undefined);
    if(!cryptoApi?.subtle||typeof TextEncoder==='undefined')throw Error('Secure browser hashing is unavailable.');
    const payload=JSON.stringify([jobKey,images,metadata]);
    const bytes=new TextEncoder().encode(payload);
    const buffer=await cryptoApi.subtle.digest('SHA-256',bytes);
    return 'sha256:'+Array.from(new Uint8Array(buffer),value=>value.toString(16).padStart(2,'0')).join('');
  }
  function openDb(){
    return new Promise((resolve,reject)=>{
      if(typeof indexedDB==='undefined')return reject(Error('Local photo storage is unavailable.'));
      let request;
      try{request=indexedDB.open(DATABASE,VERSION);}catch(error){return reject(error);}
      request.onupgradeneeded=()=>{
        const db=request.result;
        if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'key'});
      };
      request.onerror=()=>reject(request.error||Error('Unable to open local photo storage.'));
      request.onblocked=()=>reject(Error('Local photo database is blocked by another browser tab.'));
      request.onsuccess=()=>resolve(request.result);
    });
  }
  async function transaction(mode,fn){
    const db=await openDb();
    return new Promise((resolve,reject)=>{
      let tx,result,finished=false;
      function done(error){if(finished)return;finished=true;db.close();if(error)reject(error);else resolve(result);}
      try{
        tx=db.transaction(STORE,mode);
        const operation=fn(tx.objectStore(STORE));
        operation.onsuccess=()=>{result=operation.result;};
        operation.onerror=()=>done(operation.error||Error('Local photo operation failed.'));
        tx.oncomplete=()=>done(null);
        tx.onerror=()=>done(tx.error||Error('Local photo transaction failed.'));
        tx.onabort=()=>done(tx.error||Error('Local photo transaction was interrupted.'));
      }catch(error){done(error);}
    });
  }
  async function save(key,jobKey,images,metadata){
    validateKey(key);
    if(typeof jobKey!=='string'||!jobKey.trim())throw Error('Property identity is required.');
    checkPhotos(images,metadata);
    const clonedImages=images.slice(),clonedMeta=metadata.map(item=>JSON.parse(JSON.stringify(item)));
    const digest=await digestFor(jobKey,clonedImages,clonedMeta);
    const receipt={key,count:clonedImages.length,digest};
    await transaction('readwrite',store=>store.put({key,jobKey,images:clonedImages,metadata:clonedMeta,digest,version:VERSION}));
    return receipt;
  }
  async function load(receipt,jobKey){
    verifyReceipt(receipt);
    if(typeof jobKey!=='string'||!jobKey.trim())throw Error('Property identity is required.');
    const saved=await transaction('readonly',store=>store.get(receipt.key));
    if(!saved||saved.version!==VERSION||saved.jobKey!==jobKey||saved.digest!==receipt.digest)
      throw Error('Saved photo evidence was not found for this property.');
    checkPhotos(saved.images,saved.metadata);
    if(saved.images.length!==receipt.count)throw Error('Saved photo count has changed.');
    const actualDigest=await digestFor(saved.jobKey,saved.images,saved.metadata);
    if(actualDigest!==receipt.digest)throw Error('Saved photo evidence failed its integrity check.');
    return {images:saved.images.slice(),metadata:saved.metadata.map(item=>({...item})),receipt};
  }
  return Object.freeze({DATABASE,STORE,MAX_IMAGES,checkPhotos,validateKey,verifyReceipt,save,load});
});
