/* SchismMatrix™ offline photo selection. One analysis request, existing image budget. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SchismPhotoSelection=api;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:null),function(){
  'use strict';
  const MAX_STAGED=24;
  function validLimit(value){return Number.isSafeInteger(value)&&value>0&&value<=MAX_STAGED;}
  function defaultIndices(count,limit){
    if(!Number.isSafeInteger(count)||count<0||count>MAX_STAGED||!validLimit(limit))
      throw Error('Invalid photo capacity.');
    if(count<=limit)return Array.from({length:count},(_,i)=>i);
    if(limit===1)return [0];
    // Distribute the preview defaults across all staged views. This is NOT
    // a claim of evidence quality; the operator must explicitly confirm.
    return Array.from({length:limit},(_,i)=>Math.round(i*(count-1)/(limit-1)));
  }
  function toggleIndices(current,index,total,limit){
    if(!Number.isSafeInteger(index)||index<0||index>=total||!validLimit(limit))
      return {ok:false,reason:'Invalid photo index.'};
    const values=Array.isArray(current)?current.slice():[];
    if(values.includes(index))return {ok:true,indices:values.filter(x=>x!==index).sort((a,b)=>a-b)};
    if(values.length>=limit)return {ok:false,reason:'Remove one selected photo before adding another.'};
    return {ok:true,indices:values.concat(index).sort((a,b)=>a-b)};
  }
  function compile(images,metadata,selectedIndices,limit,confirmed){
    if(!Array.isArray(images)||images.length<1||images.length>MAX_STAGED||!validLimit(limit))
      return {ok:false,reason:'The photo collection is unavailable or exceeds its 24-photo limit.'};
    const over=images.length>limit;
    const indices=over?selectedIndices:defaultIndices(images.length,limit);
    if(!Array.isArray(indices)||indices.length<1||indices.length>limit||
       new Set(indices).size!==indices.length||
       indices.some(i=>!Number.isSafeInteger(i)||i<0||i>=images.length))
      return {ok:false,reason:'Choose 1 to '+limit+' valid photos for AI analysis.'};
    if(over&&confirmed!==true)
      return {ok:false,reason:'Review and confirm the selected photos before running analysis.'};
    const ordered=indices.slice().sort((a,b)=>a-b);
    const payloadImages=[];
    for(const index of ordered){
      const data=images[index];
      if(typeof data!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data))
        return {ok:false,reason:'A selected photo is not a valid JPEG upload.'};
      payloadImages.push(data.slice('data:image/jpeg;base64,'.length));
    }
    return {
      ok:true,
      images:payloadImages,
      evidenceMeta:ordered.map(i=>metadata&&metadata[i]&&typeof metadata[i]==='object'?{...metadata[i]}:{
        kind:'photo',source:'operator_upload',capturedAt:null,
        provenance:'operator_selected_media',operatorConfirmationState:'operator_selected'
      }),
      photoSelection:{
        stagedCount:images.length,
        selectedSlots:ordered.map(i=>i+1),
        operatorConfirmed:over?true:false
      }
    };
  }

  function matchesCoverage(coverage,photoSelection){
    if(!coverage||!photoSelection)return false;
    const expected=photoSelection.selectedSlots;
    return Number.isSafeInteger(coverage.stagedCount)&&coverage.stagedCount===photoSelection.stagedCount&&
      Number.isSafeInteger(coverage.submittedCount)&&coverage.submittedCount===expected.length&&
      coverage.omittedCount===coverage.stagedCount-coverage.submittedCount&&
      coverage.operatorConfirmed===photoSelection.operatorConfirmed&&
      Array.isArray(coverage.selectedSlots)&&coverage.selectedSlots.length===expected.length&&
      coverage.selectedSlots.every((slot,i)=>slot===expected[i]);
  }
  function createController(options){
    if(!options||!validLimit(options.limit)||typeof options.getImages!=='function')
      throw Error('Photo selection configuration is invalid.');
    const limit=options.limit;
    let currentCount=-1,chosen=[],confirmed=false,dom=null;
    function getCount(){return options.getImages().length;}
    function panel(){
      if(dom)return dom;
      const trigger=document.getElementById('processTrigger');
      if(!trigger||!trigger.parentNode)return null;
      const outer=document.createElement('section');
      outer.id='schismPhotoSelectionPanel';
      outer.setAttribute('aria-label','Choose photos for AI analysis');
      outer.style.cssText='margin:12px 0;padding:12px;border:1px solid #238ca2;border-radius:12px;background:#071a25;color:#e2faff;font-size:12px;line-height:1.5';
      const heading=document.createElement('strong');
      heading.id='schismPhotoSelectionCount';
      heading.style.cssText='display:block;font-size:13px;color:#b6f6ff';
      const note=document.createElement('p');
      note.id='schismPhotoSelectionNotice';
      note.style.cssText='margin:6px 0 10px;color:#d1e2eb';
      const label=document.createElement('label');
      label.style.cssText='display:flex;align-items:flex-start;gap:9px;cursor:pointer;min-height:44px';
      const checkbox=document.createElement('input');
      checkbox.id='schismPhotoSelectionConfirm';
      checkbox.type='checkbox';
      checkbox.style.cssText='margin-top:5px;width:19px;height:19px;flex-shrink:0';
      const copy=document.createElement('span');
      copy.textContent='I reviewed this selection. Only selected photos will be sent to AI; the other staged photos will NOT be analyzed.';
      label.append(checkbox,copy);
      checkbox.addEventListener('change',()=>{
        confirmed=checkbox.checked;
        options.onConfirmationChanged?.(confirmed);
      });
      outer.append(heading,note,label);
      trigger.parentNode.insertBefore(outer,trigger);
      dom={outer,heading,note,checkbox};
      return dom;
    }
    function refresh(){
      const count=getCount();
      if(currentCount!==count){
        chosen=defaultIndices(count,limit);
        currentCount=count;confirmed=false;
      }
      const over=count>limit;
      const ui=panel();
      if(ui){
        ui.outer.hidden=!over;
        if(over){
          ui.heading.textContent=chosen.length+' of '+count+' photos selected for AI (maximum '+limit+').';
          ui.note.textContent=(count-chosen.length)+' photo(s) are excluded from this analysis. Tap a photo’s AI button to change your selection. No extra AI calls will be made.';
          ui.checkbox.checked=confirmed;
        }
      }
      const grid=document.getElementById(options.gridId);
      if(!grid)return;
      const photos=Array.from(grid.querySelectorAll(options.photoSelector));
      photos.forEach((tile,i)=>{
        const existing=tile.querySelector('.schism-photo-ai-toggle');
        if(!over){existing?.remove();return;}
        if(tile.hidden)tile.hidden=false;
        tile.style.position='relative';
        const button=existing||document.createElement('button');
        if(!existing){
          button.type='button';
          button.className='schism-photo-ai-toggle';
          button.style.cssText='position:absolute;left:5px;bottom:5px;z-index:4;min-height:34px;max-width:calc(100% - 10px);padding:4px 7px;border:1px solid #55dbe9;border-radius:8px;background:#071a25;color:#e8faff;font-size:11px;font-weight:800;cursor:pointer';
          button.addEventListener('click',event=>{
            event.preventDefault();event.stopPropagation();
            const target=Number(button.dataset.photoIndex);
            const result=toggleIndices(chosen,target,getCount(),limit);
            if(!result.ok){
              const view=panel();
              if(view)view.note.textContent=result.reason;
              return;
            }
            chosen=result.indices;confirmed=false;
            options.onSelectionChanged?.(chosen.slice());
            refresh();
          });
          tile.appendChild(button);
        }
        button.dataset.photoIndex=String(i);
        const selected=chosen.includes(i);
        button.setAttribute('aria-pressed',selected?'true':'false');
        button.setAttribute('aria-label',(selected?'Exclude':'Include')+' photo '+(i+1)+' from AI analysis');
        button.textContent=selected?'✓ AI selected':'Add to AI';
      });
    }
    function restoreSelection(coverage){
      const count=getCount();
      if(!coverage||!Array.isArray(coverage.selectedSlots)||coverage.stagedCount!==count)return false;
      const indices=coverage.selectedSlots.map(slot=>slot-1);
      const planned=compile(options.getImages(),options.getMeta?.(),indices,limit,
        coverage.operatorConfirmed===true);
      if(!planned.ok||!matchesCoverage(coverage,planned.photoSelection))return false;
      currentCount=count;chosen=indices;confirmed=coverage.operatorConfirmed===true;
      refresh();
      return true;
    }
    function reset(){currentCount=-1;chosen=[];confirmed=false;refresh();}
    function preflight(){
      const value=compile(options.getImages(),options.getMeta?.(),chosen,limit,confirmed);
      if(!value.ok){
        const view=panel();
        if(view&&getCount()>limit){
          view.note.textContent=value.reason;
          view.outer.scrollIntoView?.({block:'center',behavior:'smooth'});
        }
      }
      return value;
    }
    return {refresh,reset,restoreSelection,preflight,selectedIndices:()=>chosen.slice(),isConfirmed:()=>confirmed};
  }
  return {MAX_STAGED,defaultIndices,toggleIndices,compile,matchesCoverage,createController};
});
