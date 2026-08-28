(()=>{
  if(document.getElementById('cb60DemoButton')) return;
  const DEFAULT_VIDEO='https://cactusbyte-studios.vercel.app/demos/no-problem-pressure-washing-matrix-60-second-demo.mp4?v=20260828b';
  const videoSrc=document.currentScript?.dataset?.video||DEFAULT_VIDEO;
  const scenes=[
    {at:0,text:'Meet Pressure Washing Matrix, built for faster, clearer exterior-cleaning quotes.'},
    {at:6,text:'Choose Quick Quote for speed, or Advanced Quote when the job needs more detail.'},
    {at:13,text:'Add the customer, property address, and service type so every estimate starts with the right job details.'},
    {at:21,text:'Capture the work areas with photos. Include access issues, stains, fragile landscaping, and anything the crew needs to know.'},
    {at:30,text:'The Matrix reviews the visual evidence, job scope, production needs, chemicals, labor, and local pricing to build a defensible estimate.'},
    {at:40,text:'Review the recommended price, adjust the scope when needed, and confirm the minimum service charge before sending.'},
    {at:48,text:'Generate a clean customer proposal with the agreed work, price, and contact information.'},
    {at:54,text:'Then hand the approved job to the crew with the photos and instructions attached.'}
  ];
  const speechSupported='speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
  let voices=[];
  let activeScene=-1;
  let speechPaused=false;

  const refreshVoices=()=>{voices=window.speechSynthesis?.getVoices?.()||[]};
  const naturalVoice=()=>{
    refreshVoices();
    const usVoices=voices.filter(v=>/^en[-_]US/i.test(v.lang||''));
    const preferred=[
      /Google US English/i,
      /Microsoft (Guy|Andrew|Brian).*Natural/i,
      /Microsoft (Guy|Andrew|Brian)/i,
      /Aaron|Alex|Daniel/i
    ];
    for(const pattern of preferred){
      const match=usVoices.find(v=>pattern.test(v.name||''));
      if(match) return match;
    }
    return usVoices.find(v=>v.localService)||usVoices[0]||voices.find(v=>/^en/i.test(v.lang||''))||null;
  };
  if(speechSupported){
    refreshVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged',refreshVoices);
  }

  const style=document.createElement('style');
  style.textContent=`#cb60DemoButton{position:fixed;right:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483000;border:1px solid rgba(0,240,255,.55);border-radius:999px;padding:11px 15px;background:rgba(4,12,18,.94);color:#eaffff;font:800 12px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.06em;box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 20px rgba(0,240,255,.12);backdrop-filter:blur(12px);cursor:pointer}#cb60DemoButton:active{transform:scale(.97)}#cb60DemoModal{position:fixed;inset:0;z-index:2147483646;display:none;place-items:center;padding:16px;background:rgba(0,0,0,.88);backdrop-filter:blur(10px)}#cb60DemoModal.open{display:grid}#cb60DemoCard{position:relative;width:min(92vw,420px);max-height:92vh;padding:12px;border:1px solid rgba(0,240,255,.38);border-radius:20px;background:#05090d;box-shadow:0 22px 70px rgba(0,0,0,.72)}#cb60DemoVideo{display:block;width:100%;max-height:72vh;aspect-ratio:9/16;border-radius:14px;background:#000;object-fit:contain}#cb60DemoClose{position:absolute;top:-12px;right:-8px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:#0a1219;color:#fff;font:900 20px/1 system-ui;cursor:pointer;z-index:2}#cb60DemoCaption{min-height:42px;margin:10px 5px 2px;color:#f1fbff;text-align:center;font:700 13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}#cb60DemoLabel{text-align:center;margin:7px 4px 2px;color:#94b9c0;font:700 10px/1.3 system-ui;letter-spacing:.08em;text-transform:uppercase}#cb60DemoError{display:none;margin:10px 4px 2px;color:#ff9d86;text-align:center;font:700 11px/1.4 system-ui}@media(max-width:520px){#cb60DemoButton{right:10px;bottom:max(10px,env(safe-area-inset-bottom));padding:10px 13px}#cb60DemoVideo{max-height:68vh}}`;
  document.head.appendChild(style);

  const button=document.createElement('button');
  button.id='cb60DemoButton';
  button.type='button';
  button.textContent='▶ 60s DEMO';
  button.setAttribute('aria-label','Play 60 second app demo');

  const modal=document.createElement('div');
  modal.id='cb60DemoModal';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-label','60 second app demo');
  modal.innerHTML=`<div id="cb60DemoCard"><button id="cb60DemoClose" type="button" aria-label="Close demo">×</button><video id="cb60DemoVideo" controls playsinline preload="metadata" muted><source src="${videoSrc}" type="video/mp4">Your browser cannot play this video.</video><div id="cb60DemoCaption" aria-live="polite"></div><div id="cb60DemoLabel">Natural Voice Narration · 60 Second Demo · Cactus🌵Byte Studios™</div><div id="cb60DemoError">Demo video could not load. Check your connection and try again.</div></div>`;
  document.body.append(button,modal);

  const video=modal.querySelector('#cb60DemoVideo');
  const caption=modal.querySelector('#cb60DemoCaption');
  const error=modal.querySelector('#cb60DemoError');
  video.muted=true;
  video.defaultMuted=true;

  const sceneAt=time=>{
    let index=0;
    for(let i=0;i<scenes.length;i++){
      if(time>=scenes[i].at) index=i;
      else break;
    }
    return index;
  };

  const speakScene=index=>{
    const scene=scenes[index];
    if(!scene) return;
    caption.textContent=scene.text;
    if(!speechSupported) return;
    window.speechSynthesis.cancel();
    speechPaused=false;
    const utterance=new SpeechSynthesisUtterance(scene.text);
    const voice=naturalVoice();
    if(voice) utterance.voice=voice;
    utterance.lang='en-US';
    utterance.rate=.9;
    utterance.pitch=.94;
    utterance.volume=1;
    window.speechSynthesis.speak(utterance);
  };

  const syncNarration=()=>{
    const index=sceneAt(video.currentTime||0);
    if(index!==activeScene){
      activeScene=index;
      speakScene(index);
    }
  };

  video.addEventListener('loadedmetadata',()=>{
    error.style.display='none';
    syncNarration();
  });
  video.addEventListener('error',()=>{error.style.display='block'});
  video.addEventListener('timeupdate',syncNarration);
  video.addEventListener('seeking',()=>{activeScene=-1;syncNarration()});
  video.addEventListener('pause',()=>{
    if(speechSupported&&!video.ended){
      window.speechSynthesis.pause();
      speechPaused=true;
    }
  });
  video.addEventListener('play',()=>{
    if(speechSupported&&speechPaused){
      window.speechSynthesis.resume();
      speechPaused=false;
    }else{
      syncNarration();
    }
  });
  video.addEventListener('ended',()=>{
    if(speechSupported) window.speechSynthesis.cancel();
    speechPaused=false;
  });

  const close=()=>{
    video.pause();
    if(speechSupported) window.speechSynthesis.cancel();
    speechPaused=false;
    modal.classList.remove('open');
  };

  button.addEventListener('click',()=>{
    modal.classList.add('open');
    error.style.display='none';
    if(speechSupported) window.speechSynthesis.cancel();
    speechPaused=false;
    activeScene=-1;
    video.pause();
    video.currentTime=0;
    video.muted=true;
    syncNarration();
    const playPromise=video.play();
    if(playPromise?.catch) playPromise.catch(()=>{});
  });
  modal.querySelector('#cb60DemoClose').addEventListener('click',close);
  modal.addEventListener('click',event=>{if(event.target===modal)close()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal.classList.contains('open'))close()});
})();
