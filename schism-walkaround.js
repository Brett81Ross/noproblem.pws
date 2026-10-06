(() => {
  'use strict';

  const MAX_SECONDS = 90;
  const SAMPLE_EVERY_MS = 10000;
  const MAX_FRAMES = 8;

  let stream = null;
  let timer = null;
  let sampler = null;
  let seconds = 0;
  let frames = [];
  let frameSequence = 0;

  function el(id) { return document.getElementById(id); }


  function installStyles() {
    if (el('schismWalkStyles')) return;
    const style = document.createElement('style');
    style.id = 'schismWalkStyles';
    style.textContent = [
      '.schism-walk-launch{width:100%;min-height:52px;margin:0 0 14px;padding:13px 16px;border:1px solid rgba(88,239,255,.35);border-radius:14px;color:#061319;background:linear-gradient(135deg,#a7fbff,#58efff 55%,#9b7cff);font:inherit;font-weight:950;letter-spacing:.03em;cursor:pointer}',
      '.schism-walk-overlay{position:fixed;z-index:1600;inset:0;display:none;align-items:flex-start;justify-content:center;padding:max(14px,env(safe-area-inset-top)) 12px max(14px,env(safe-area-inset-bottom));background:rgba(1,7,11,.9);overflow-y:auto}',
      '.schism-walk-overlay.open{display:flex}.schism-walk-card{width:min(100%,620px);margin:auto;padding:16px;border:1px solid rgba(88,239,255,.3);border-radius:22px;color:#effcff;background:linear-gradient(145deg,#0e2732,#061118 76%);box-shadow:0 28px 90px rgba(0,0,0,.65)}',
      '.schism-walk-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.schism-walk-kicker{color:#58efff;font-size:9px;font-weight:950;letter-spacing:.14em}.schism-walk-top h2{margin:5px 0 0;font-size:22px}.schism-walk-close{width:38px;height:38px;border:1px solid rgba(255,255,255,.14);border-radius:11px;color:#dffaff;background:transparent;font-size:22px}',
      '.schism-walk-prompt{color:#a9c4cc;line-height:1.5}.schism-walk-video-wrap{position:relative;overflow:hidden;border-radius:16px;background:#02080c;aspect-ratio:4/3}.schism-walk-video-wrap video{width:100%;height:100%;object-fit:cover}.schism-walk-count{position:absolute;right:9px;bottom:9px;padding:6px 9px;border-radius:999px;background:rgba(1,7,11,.78);font-size:10px;font-weight:900}',
      '.schism-walk-status{min-height:20px;margin:10px 0;color:#8fb0b9;font-size:11px}.schism-walk-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.schism-walk-actions #schismWalkStart{grid-column:1/-1}.schism-walk-upload{width:100%;margin-top:10px;padding:10px;border:0;color:#8fddea;background:transparent;font-weight:850}.schism-walk-open{overflow:hidden}',
      '@media(max-width:430px){.schism-walk-card{padding:13px;border-radius:18px}.schism-walk-actions{grid-template-columns:1fr}.schism-walk-actions #schismWalkStart{grid-column:auto}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureLauncher() {
    const existingPrimary = el('btnStartPropertyWalk');
    if (existingPrimary) {
      existingPrimary.addEventListener('click', open);
      return;
    }
    if (el('schismWalkLaunch')) return;
    const button = document.createElement('button');
    button.id = 'schismWalkLaunch';
    button.type = 'button';
    button.className = 'schism-walk-launch';
    button.textContent = 'Start Property Walk';
    button.addEventListener('click', open);
    const evidence = el('evidenceCard') || el('evidenceGrid') || el('fileInput');
    if (evidence) {
      const host = evidence.closest('.matrix-card,.action-card,section,div') || evidence.parentElement;
      if (host && host.parentNode) host.parentNode.insertBefore(button, host);
      else document.body.appendChild(button);
    } else {
      document.body.appendChild(button);
    }
  }

  function ensureUI() {
    if (el('schismWalkOverlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'schismWalkOverlay';
    overlay.className = 'schism-walk-overlay';
    overlay.innerHTML = `
      <section class="schism-walk-card" role="dialog" aria-modal="true" aria-labelledby="schismWalkTitle">
        <div class="schism-walk-top">
          <div>
            <div class="schism-walk-kicker">GUIDED PROPERTY WALK</div>
            <h2 id="schismWalkTitle">Show me the property.</h2>
          </div>
          <button type="button" class="schism-walk-close" aria-label="Close property walk">×</button>
        </div>
        <p id="schismWalkPrompt" class="schism-walk-prompt">Start with a wide view. Walk slowly and keep the property in frame.</p>
        <div class="schism-walk-video-wrap">
          <video id="schismWalkVideo" playsinline muted autoplay></video>
          <div class="schism-walk-count" id="schismWalkCount">0 photos saved</div>
        </div>
        <div class="schism-walk-status" id="schismWalkStatus">Camera is off.</div>
        <div class="schism-walk-actions">
          <button type="button" class="btn" id="schismWalkStart">Start Walk</button>
          <button type="button" class="btn btn-secondary" id="schismWalkSnap" disabled>Take Photo</button>
          <button type="button" class="btn btn-secondary" id="schismWalkFinish" disabled>Finish & Review</button>
        </div>
        <button type="button" class="schism-walk-upload" id="schismWalkUpload">Camera not available? Add saved photos instead.</button>
      </section>`;
    document.body.appendChild(overlay);

    el('schismWalkOverlay').querySelector('.schism-walk-close').addEventListener('click', close);
    el('schismWalkStart').addEventListener('click', start);
    el('schismWalkSnap').addEventListener('click', () => captureFrame(true));
    el('schismWalkFinish').addEventListener('click', finish);
    el('schismWalkUpload').addEventListener('click', () => {
      close();
      (el('uploadInput') || el('fileInput') || el('cameraInput'))?.click();
    });
  }

  function setPrompt() {
    const prompts = [
      'Start with a wide view. Walk slowly and keep the property in frame.',
      'Show me the main surfaces that may need cleaning.',
      'Move closer to stains, growth, damage, or anything unusual.',
      'Show me how the crew would reach the work area.',
      'Show me nearby plants, outlets, doors, windows, vehicles, and other things we need to protect.',
      'Show me where wash water would naturally run.',
      'Finish with any area you think needs a second look.'
    ];
    const index = Math.min(prompts.length - 1, Math.floor(seconds / 13));
    el('schismWalkPrompt').textContent = prompts[index];
  }

  async function start() {
    if (stream) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      el('schismWalkStatus').textContent = 'Live camera is not available here. You can add saved photos instead.';
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      const video = el('schismWalkVideo');
      video.srcObject = stream;
      await video.play();
      frames = [];
      frameSequence = 0;
      seconds = 0;
      el('schismWalkStart').disabled = true;
      el('schismWalkSnap').disabled = false;
      el('schismWalkFinish').disabled = false;
      el('schismWalkStatus').textContent = 'Walk slowly. I’ll save useful views as you go.';
      updateCount();
      setPrompt();

      timer = setInterval(() => {
        seconds += 1;
        setPrompt();
        el('schismWalkStatus').textContent = `Walking… ${seconds}s of ${MAX_SECONDS}s`;
        if (seconds >= MAX_SECONDS) finish();
      }, 1000);

      sampler = setInterval(() => captureFrame(false), SAMPLE_EVERY_MS);
      setTimeout(() => captureFrame(false), 1200);
    } catch (error) {
      el('schismWalkStatus').textContent = 'I could not open the camera. Check camera permission or add saved photos.';
    }
  }

  function captureFrame(manual) {
    if (!stream || frames.length >= MAX_FRAMES) {
      if (manual && frames.length >= MAX_FRAMES) {
        el('schismWalkStatus').textContent = 'I have enough walk photos. Finish and review them.';
      }
      return;
    }
    const video = el('schismWalkVideo');
    if (!video || video.readyState < 2 || !video.videoWidth) return;

    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d', { alpha: false }).drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob || frames.length >= MAX_FRAMES) return;
      const capturedAt = new Date().toISOString();
      const file = new File([blob], `property-walk-${Date.now()}-${++frameSequence}.jpg`, { type: 'image/jpeg' });
      file.schismEvidence = Object.freeze({
        kind: 'photo',
        source: manual ? 'walkaround_manual_capture' : 'walkaround_sampled_frame',
        capturedAt,
        provenance: 'schismmatrix_walkaround',
        operatorConfirmationState: manual ? 'operator_captured' : 'not_confirmed'
      });
      frames.push(file);
      updateCount();
      if (manual) el('schismWalkStatus').textContent = 'Photo saved. Keep walking when you’re ready.';
    }, 'image/jpeg', 0.76);
  }

  function updateCount() {
    const count = frames.length;
    el('schismWalkCount').textContent = `${count} photo${count === 1 ? '' : 's'} saved`;
  }

  async function finish() {
    if (el('schismWalkFinish')?.dataset.finishing === 'true') return;
    if (el('schismWalkFinish')) el('schismWalkFinish').dataset.finishing = 'true';
    stopMedia();
    if (!frames.length) {
      el('schismWalkStatus').textContent = 'No photos were saved yet. Start the walk or add saved photos.';
      el('schismWalkStart').disabled = false;
      if (el('schismWalkFinish')) delete el('schismWalkFinish').dataset.finishing;
      return;
    }
    el('schismWalkStatus').textContent = 'Preparing your property photos…';
    try {
      if (typeof window.stageFiles !== 'function') {
        throw new Error('Property photo staging is unavailable.');
      }
      await window.stageFiles(frames);
      el('schismWalkStatus').textContent = 'Walk saved. Review the photos below, then continue.';
      setTimeout(close, 650);
    } catch (error) {
      el('schismWalkStatus').textContent = 'I could not add those photos. Try saved photos instead.';
    } finally {
      if (el('schismWalkFinish')) delete el('schismWalkFinish').dataset.finishing;
    }
  }

  function stopMedia() {
    if (timer) clearInterval(timer);
    if (sampler) clearInterval(sampler);
    timer = null;
    sampler = null;
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    const video = el('schismWalkVideo');
    if (video) video.srcObject = null;
    if (el('schismWalkStart')) el('schismWalkStart').disabled = false;
    if (el('schismWalkSnap')) el('schismWalkSnap').disabled = true;
    if (el('schismWalkFinish')) {
      el('schismWalkFinish').disabled = true;
      delete el('schismWalkFinish').dataset.finishing;
    }
  }

  function open() {
    ensureUI();
    el('schismWalkOverlay').classList.add('open');
    document.body.classList.add('schism-walk-open');
  }

  function close() {
    stopMedia();
    el('schismWalkOverlay')?.classList.remove('open');
    document.body.classList.remove('schism-walk-open');
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && stream) stopMedia();
  });
  window.addEventListener('pagehide', stopMedia);

  installStyles();
  ensureLauncher();
  window.SchismWalkaround = Object.freeze({ open, close });
})();