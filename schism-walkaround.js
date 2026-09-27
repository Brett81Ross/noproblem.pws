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

  function el(id) { return document.getElementById(id); }

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
      el('fileInput')?.click();
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
      frames.push(new File([blob], `property-walk-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      updateCount();
      if (manual) el('schismWalkStatus').textContent = 'Photo saved. Keep walking when you’re ready.';
    }, 'image/jpeg', 0.76);
  }

  function updateCount() {
    const count = frames.length;
    el('schismWalkCount').textContent = `${count} photo${count === 1 ? '' : 's'} saved`;
  }

  async function finish() {
    stopMedia();
    if (!frames.length) {
      el('schismWalkStatus').textContent = 'No photos were saved yet. Start the walk or add saved photos.';
      el('schismWalkStart').disabled = false;
      return;
    }
    el('schismWalkStatus').textContent = 'Preparing your property photos…';
    try {
      if (typeof window.stageFiles === 'function') await window.stageFiles(frames);
      el('schismWalkStatus').textContent = 'Walk saved. Review the photos below, then continue.';
      setTimeout(close, 650);
    } catch (error) {
      el('schismWalkStatus').textContent = 'I could not add those photos. Try saved photos instead.';
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
    if (el('schismWalkFinish')) el('schismWalkFinish').disabled = true;
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

  window.SchismWalkaround = Object.freeze({ open, close });
})();