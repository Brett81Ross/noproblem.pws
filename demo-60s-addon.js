(()=>{
  if(document.getElementById('cb60DemoButton')) return;
  const DEFAULT_VIDEO='https://cactusbyte-studios.vercel.app/demos/no-problem-pressure-washing-matrix-60-second-demo.mp4?v=20260828b';
  const videoSrc=document.currentScript?.dataset?.video||DEFAULT_VIDEO;
  const style=document.createElement('style');
  style.textContent=`#cb60DemoButton{position:fixed;right:14px;bottom:max(14px,env(safe-area-inset-bottom));z-index:2147483000;border:1px solid rgba(0,240,255,.55);border-radius:999px;padding:11px 15px;background:rgba(4,12,18,.94);color:#eaffff;font:800 12px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.06em;box-shadow:0 8px 28px rgba(0,0,0,.45),0 0 20px rgba(0,240,255,.12);backdrop-filter:blur(12px);cursor:pointer}#cb60DemoButton:active{transform:scale(.97)}#cb60DemoModal{position:fixed;inset:0;z-index:2147483646;display:none;place-items:center;padding:16px;background:rgba(0,0,0,.88);backdrop-filter:blur(10px)}#cb60DemoModal.open{display:grid}#cb60DemoCard{position:relative;width:min(92vw,420px);max-height:92vh;padding:12px;border:1px solid rgba(0,240,255,.38);border-radius:20px;background:#05090d;box-shadow:0 22px 70px rgba(0,0,0,.72)}#cb60DemoVideo{display:block;width:100%;max-height:82vh;aspect-ratio:9/16;border-radius:14px;background:#000;object-fit:contain}#cb60DemoClose{position:absolute;top:-12px;right:-8px;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:#0a1219;color:#fff;font:900 20px/1 system-ui;cursor:pointer;z-index:2}#cb60DemoLabel{text-align:center;margin:10px 4px 2px;color:#94b9c0;font:700 11px/1.3 system-ui;letter-spacing:.08em;text-transform:uppercase}#cb60DemoError{display:none;margin:10px 4px 2px;color:#ff9d86;text-align:center;font:700 11px/1.4 system-ui}@media(max-width:520px){#cb60DemoButton{right:10px;bottom:max(10px,env(safe-area-inset-bottom));padding:10px 13px}}`;
  document.head.appendChild(style);
  const button=document.createElement('button');button.id='cb60DemoButton';button.type='button';button.textContent='▶ 60s DEMO';button.setAttribute('aria-label','Play 60 second app demo');
  const modal=document.createElement('div');modal.id='cb60DemoModal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','60 second app demo');
  modal.innerHTML=`<div id="cb60DemoCard"><button id="cb60DemoClose" type="button" aria-label="Close demo">×</button><video id="cb60DemoVideo" controls playsinline preload="metadata"><source src="${videoSrc}" type="video/mp4">Your browser cannot play this video.</video><div id="cb60DemoLabel">60 Second App Demo · Cactus🌵Byte Studios™</div><div id="cb60DemoError">Demo video could not load. Check your connection and try again.</div></div>`;
  document.body.append(button,modal);
  const video=modal.querySelector('#cb60DemoVideo');
  const error=modal.querySelector('#cb60DemoError');
  video.addEventListener('loadedmetadata',()=>{error.style.display='none'});
  video.addEventListener('error',()=>{error.style.display='block'});
  const close=()=>{video.pause();modal.classList.remove('open')};
  button.addEventListener('click',()=>{
    modal.classList.add('open');
    error.style.display='none';
    video.pause();
    video.currentTime=0;
    const p=video.play();
    if(p?.catch)p.catch(()=>{});
  });
  modal.querySelector('#cb60DemoClose').addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
})();
