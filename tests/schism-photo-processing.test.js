'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const photo=require('../photo-processing.js');
assert.equal(photo.MAX_STAGED_IMAGES,24);
assert.equal(photo.MAX_BASE64_CHARS,1000000);
assert.deepEqual(photo.fittedDimensions(400,800),{width:400,height:800});
assert.deepEqual(photo.fittedDimensions(800,400),{width:800,height:400});
assert.deepEqual(photo.fittedDimensions(900,1800),{width:640,height:1280});
assert.deepEqual(photo.fittedDimensions(2400,600),{width:1280,height:320});
assert.throws(()=>photo.fittedDimensions(0,20),/Invalid source/);
assert.throws(()=>photo.fittedDimensions(NaN,20),/Invalid source/);
for(const file of ['index.html','runtime/base-shell.html']){
  const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
  assert(html.includes('<script src="/photo-processing.js"></script>'),file+' must load shared processing');
  assert(html.includes('window.SchismPhotoProcessing.resizeAndCompressImage(file)'),file+' must use shared converter');
  assert(!html.includes('canvas.width = 600;'),file+' may not stretch images to 600x450');
  assert(html.includes('MAX_STAGED_IMAGES-stagedBase64Images.length'),file+' must cap staged evidence');
  assert(html.includes('pendingPhotoBatch'),file+' must serialize uploads');
}
console.log('Schism photo dimensions and staging QA passed');
