/* SchismMatrix™ photo processing, offline and shared between app shells. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SchismPhotoProcessing=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
 'use strict';
 const MAX_STAGED_IMAGES=24,MAX_EDGE=1280,MAX_BASE64_CHARS=1000000;
 const QUALITIES=[0.76,0.65,0.54,0.44];
 function fittedDimensions(width,height,maxEdge=MAX_EDGE){
   if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||
      !Number.isFinite(maxEdge)||maxEdge<=0)throw Error('Invalid source photo dimensions.');
   const scale=Math.min(1,maxEdge/Math.max(width,height));
   return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
 }
 function resizeAndCompressImage(file){
   return new Promise((resolve,reject)=>{
     if(!file||typeof file!=='object')return reject(Error('A photo file is required.'));
     const reader=new FileReader();
     reader.onerror=()=>reject(Error('Could not read the selected photo.'));
     reader.onload=()=>{
       if(typeof reader.result!=='string'||!reader.result.startsWith('data:image/'))
         return reject(Error('The selected file is not a supported image.'));
       const img=new Image();
       img.onerror=()=>reject(Error('This browser could not decode the selected photo.'));
       img.onload=()=>{
         try{
           // Browser image decoding applies EXIF orientation. Canvas stores the
           // correctly oriented pixels without copying old orientation metadata.
           let {width,height}=fittedDimensions(img.naturalWidth,img.naturalHeight);
           const canvas=document.createElement('canvas');
           const ctx=canvas.getContext('2d',{alpha:false});
           if(!ctx)throw Error('Photo conversion is unavailable.');
           for(let pass=0;pass<8;pass++){
             canvas.width=width;canvas.height=height;
             ctx.drawImage(img,0,0,width,height);
             for(const quality of QUALITIES){
               const jpeg=canvas.toDataURL('image/jpeg',quality);
               if(jpeg.startsWith('data:image/jpeg;base64,')&&
                  jpeg.length-jpeg.indexOf(',')-1<=MAX_BASE64_CHARS)return resolve(jpeg);
             }
             if(Math.max(width,height)<=320)break;
             width=Math.max(1,Math.round(width*.8));
             height=Math.max(1,Math.round(height*.8));
           }
           reject(Error('Photo is too large for the analysis upload.'));
         }catch(error){reject(error);}
       };
       img.src=reader.result;
     };
     try{reader.readAsDataURL(file);}catch(error){reject(Error('Could not open the selected photo.'));}
   });
 }
 return {MAX_STAGED_IMAGES,MAX_EDGE,MAX_BASE64_CHARS,fittedDimensions,resizeAndCompressImage};
});
