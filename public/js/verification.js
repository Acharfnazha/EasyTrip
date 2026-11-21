// "My account" page: identity verification. js/id-document.js tells this script which document is
// saved (the event "easytrip:id-doc-changed"). The user then does the camera check:
//   1. the camera starts, and face-api (open source, in public/vendor/face-api/) finds the face
//      and its 68 points in each frame, in the browser;
//   2. step by step, a cartoon shows the movement, then the camera opens; the page asks to
//      look straight, turn left, turn right and move closer
//      (js/liveness-pose.mjs decides when each movement is done) and keeps one photo of each;
//   3. the user holds their document next to their face and takes the photo;
//   4. they check the five photos and send them (POST /api/id-document/selfie).
// A printed photo or a picture on a screen can't turn its head, so the four movement photos show
// the admin that a real person was in front of the camera. Without a camera, one photo can be
// uploaded instead; the admin then sees that there was no camera check.
// Booking a stay and buying a ticket need a verified identity.
(function () {
  'use strict';

  const card = document.querySelector('[data-verify]');
  if (!card) return;

  const q = function (sel) { return card.querySelector(sel); };
  const badge = q('[data-verify-badge]');
  const text = q('[data-verify-text]');
  const message = q('[data-verify-message]');
  const box = q('[data-verify-form]');
  const intro = q('[data-live-intro]');
  const camera = q('[data-live-camera]');
  const video = q('[data-live-video]');
  const oval = q('[data-live-oval]');
  const arrow = q('[data-live-arrow]');
  const say = q('[data-live-say]');
  const hint = q('[data-live-hint]');
  const count = q('[data-live-count]');
  const flash = q('[data-live-flash]');
  const retakeButton = q('[data-live-retake]');
  const stepsList = q('[data-live-steps]');
  const shootButton = q('[data-live-shoot]');
  const review = q('[data-live-review]');
  const reviewTitle = q('[data-live-review-title]');
  const photosBox = q('[data-live-photos]');
  const sendButton = q('[data-verify-send]');
  const uploadBox = q('[data-live-upload]');
  const uploadForm = q('[data-upload-form]');
  const uploadButton = q('[data-upload-send]');
  const selfieError = uploadForm.querySelector('[data-error-for="selfie"]');

  const MODELS = '/vendor/face-api/model';
  const FRAME_WIDTH = 480; // the movement photos: small, they only need to show the head
  const SELFIE_WIDTH = 1280; // the selfie with the document: big enough to read the document
  const ARROWS = { left: '←', right: '→', closer: '⤢' }; // on the mirrored picture, left is on the left
  const CAPTIONS = { straight: 'Looking straight', left: 'Turned left', right: 'Turned right', closer: 'Closer', selfie: 'With your document' };
  const BADGES = {
    none: 'Not verified', unverified: 'Not verified', pending: 'Waiting for our check',
    verified: 'Verified', rejected: 'Not accepted'
  };

  let faceapi = null; // the library, loaded the first time the camera check starts
  let rules = null; // js/liveness-pose.mjs
  let stream = null;
  let running = false;
  let tracker = null;
  let lastPose = null;
  let stepStarted = 0;
  let photos = {}; // { straight: Blob, left: Blob, right: Blob, closer: Blob, selfie: Blob }
  let photoUrls = [];

  // The last step: the document's photo is a face too. When a second, smaller face is seen next to
  // the user's face for a moment, the document is held up: a countdown starts and the photo is taken
  // by itself. "Take the photo" still works at any time.
  const DOC_FRAMES_NEEDED = 4; // frames in a row with the document seen, before the countdown
  const DOC_MISSES_ALLOWED = 4; // frames without it before the countdown stops
  const COUNTDOWN_SECONDS = 3;
  let faceSeen = false;
  let docHits = 0;
  let docMisses = 0;
  let countdownStart = 0; // 0: no countdown
  let shooting = false;

  // ---------- Messages ----------

  function showMessage(textValue, kind) {
    message.textContent = textValue;
    message.className = 'auth-status' + (kind ? ' auth-status--' + kind : '');
    message.hidden = !textValue;
  }

  function setSelfieError(textValue) {
    selfieError.textContent = textValue;
    selfieError.hidden = !textValue;
    if (textValue) uploadForm.elements.selfie.setAttribute('aria-invalid', 'true');
    else uploadForm.elements.selfie.removeAttribute('aria-invalid');
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ---------- The card, for the saved document ----------

  function showPart(part) {
    intro.hidden = part !== 'intro';
    camera.hidden = part !== 'camera';
    review.hidden = part !== 'review';
    uploadBox.hidden = part === 'camera';
  }

  // Shows the verification for the saved document, or for no document (doc is null).
  function show(doc) {
    stopCamera();
    const status = doc ? doc.status : 'none';
    badge.textContent = BADGES[status];
    badge.className = 'verify-status verify-status--' + status;
    uploadForm.reset();
    setSelfieError('');
    showPart('intro');

    if (!doc) {
      text.textContent = 'To book stays and buy tickets, verify your identity: first save your identity document above, then do the camera check.';
      box.hidden = true;
      return;
    }
    if (doc.expired && status !== 'pending') {
      text.textContent = 'Your saved document has expired. Scan a valid document above, then do the camera check.';
      box.hidden = true;
      return;
    }
    if (status === 'verified') {
      text.textContent = 'Our team checked your photos and your ' + doc.documentTypeName + ': you can book stays and buy tickets.' +
        (doc.reviewedAt ? ' Verified on ' + formatDate(doc.reviewedAt) + '.' : '');
      box.hidden = true;
      return;
    }
    if (status === 'pending') {
      text.textContent = 'Your ' + (doc.livenessChecked ? 'camera check was' : 'selfie was') + ' sent' +
        (doc.submittedAt ? ' on ' + formatDate(doc.submittedAt) : '') +
        '. Our team will check it with your ' + doc.documentTypeName + ', usually within a day, and email you. ' +
        'You can do it again if a photo was not clear.';
      box.hidden = false;
      return;
    }
    if (status === 'rejected') {
      const reason = (doc.reviewNote || 'not given').trim();
      text.textContent = 'Our team could not verify your identity. The reason: ' + reason + (/[.!?]$/.test(reason) ? '' : '.') +
        ' Do the camera check again, or scan your document again if its details were wrong.';
      box.hidden = false;
      return;
    }
    text.textContent = 'Your ' + doc.documentTypeName + ' is saved. Now do a short camera check, so our team can see that it is yours. ' +
      'Until then you can\'t book stays or buy tickets.';
    box.hidden = false;
  }

  document.addEventListener('easytrip:id-doc-changed', function (event) {
    showMessage('');
    show(event.detail);
  });

  // ---------- The camera ----------

  function stopCamera() {
    running = false;
    stopCountdown();
    clearTimeout(clock);
    clearTimeout(doneTimer);
    if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
    stream = null;
    video.srcObject = null;
  }

  function forgetPhotos() {
    photoUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    photoUrls = [];
    photos = {};
  }

  // The camera's picture as a JPG, at most maxWidth wide. It is drawn as the camera sees it
  // (not mirrored), so the document's text reads the right way.
  function capture(maxWidth) {
    const scale = Math.min(1, maxWidth / video.videoWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.88); });
  }

  function stopCountdown() {
    countdownStart = 0;
    count.textContent = '';
  }

  // ---------- One step at a time ----------
  // Each step has two phases in the same card: "guide" (the cartoon shows the movement, and the
  // camera opens by itself after GUIDE_MS, or at once with "I'm ready") and "action" (the camera:
  // the movement is checked, and its photo kept). When a step is done, "Step done" shows for a
  // moment, then the next step's guide. If a step isn't done after HESITATION_MS, the guide plays
  // again ("again"), then the camera opens again. The camera keeps running the whole time; faces
  // are only looked for in the "action" phase.

  const STEPS = [
    {
      id: 'straight', title: 'Look straight at the camera',
      guide: 'Watch how: your face in the oval, looking straight ahead, in good light.',
      action: 'Look straight at the camera, with your whole face inside the oval.'
    },
    {
      id: 'left', title: 'Turn your head slightly left',
      guide: 'Watch how: a small turn of the head to the left, then hold it.',
      action: 'Turn your head a little to the left and hold it, with your face in the oval.'
    },
    {
      id: 'right', title: 'Turn your head slightly right',
      guide: 'Watch how: a small turn of the head to the right, then hold it.',
      action: 'Turn your head a little to the right and hold it, with your face in the oval.'
    },
    {
      id: 'closer', title: 'Move closer to the camera',
      guide: 'Watch how: bring your face closer, until it fills the oval.',
      action: 'Move a little closer to the camera, until your face fills the oval.'
    },
    {
      id: 'document', title: 'Hold your ID or passport next to your face',
      guide: 'Watch how: your document next to your face, its photo facing the camera, without covering your face.',
      action: 'Hold your document next to your face, inside the frame. Hold still: the photo is taken by itself, ' +
        'or press "Take the photo".'
    }
  ];
  const GUIDE_MS = 4500; // the guide plays this long, then the camera opens
  const HESITATION_MS = { movement: 12000, document: 16000 }; // then the guide plays again
  const BADGE_FROM_MS = 5000; // "Guide again in 5s" shows in the last 5 seconds
  const DONE_MS = 900; // "Step done" shows this long

  const flow = q('[data-live-flow]');
  const stepCount = q('[data-flow-count]');
  const pill = q('[data-flow-pill]');
  const desc = q('[data-flow-desc]');
  const badgeLeft = q('[data-flow-badge]');
  const goButton = q('[data-flow-go]');
  const replayButton = q('[data-flow-replay]');
  let phase = 'guide'; // guide, again, action or done
  let phaseStarted = 0;
  let clock = 0; // the timer that counts the guide's seconds and the hesitation
  let doneTimer = 0;

  function stepIndex() {
    const id = tracker && tracker.step ? tracker.step.id : 'document';
    return STEPS.findIndex(function (step) { return step.id === id; });
  }

  function markSteps() {
    const current = STEPS[stepIndex()].id;
    stepsList.querySelectorAll('li').forEach(function (li) {
      const id = li.dataset.step;
      const done = id === 'document' ? false : Boolean(photos[id]);
      li.classList.toggle('is-done', done);
      li.classList.toggle('is-current', id === current && !done);
      if (id === current) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  function setPhase(next) {
    phase = next;
    phaseStarted = Date.now();
    flow.dataset.phase = next;
    clockTick();
  }

  // The guide for the current step. again: it plays again because the step took long.
  function showGuide(again) {
    const index = stepIndex();
    const step = STEPS[index];
    flow.dataset.step = String(index);
    stepCount.textContent = 'Step ' + (index + 1) + ' of ' + STEPS.length;
    say.textContent = step.title;
    desc.textContent = step.guide;
    hint.textContent = '';
    arrow.textContent = '';
    badgeLeft.hidden = true;
    stopCountdown();
    goButton.hidden = false;
    shootButton.hidden = true;
    replayButton.hidden = true;
    markSteps();
    setPhase(again ? 'again' : 'guide');
  }

  // The camera, for the current step.
  function showAction() {
    const index = stepIndex();
    const step = STEPS[index];
    stepStarted = Date.now();
    desc.textContent = step.action;
    hint.textContent = '';
    goButton.hidden = true;
    replayButton.hidden = false;
    if (tracker.step) {
      arrow.textContent = ARROWS[tracker.step.id] || '';
      shootButton.hidden = true;
    } else {
      arrow.textContent = '';
      docHits = 0;
      docMisses = 0;
      faceSeen = false;
      stopCountdown();
      shootButton.hidden = false;
    }
    video.play().catch(function () {});
    setPhase('action');
    (tracker.step ? replayButton : shootButton).focus();
  }

  // A movement is done: its photo is kept; "Step done", then the next step's guide.
  function stepDone() {
    arrow.textContent = '';
    hint.textContent = '';
    badgeLeft.hidden = true;
    setPhase('done');
    doneTimer = setTimeout(function () {
      if (running) showGuide(false);
    }, DONE_MS);
  }

  // Four times a second: the guide's seconds before the camera opens, and in the camera the
  // seconds before the guide plays again.
  function clockTick() {
    clearTimeout(clock);
    if (!running) return;
    const spent = Date.now() - phaseStarted;
    const bar = stepsList.querySelector('li.is-current .kyc-flow__fill');

    if (phase === 'guide' || phase === 'again') {
      const left = Math.max(0, Math.ceil((GUIDE_MS - spent) / 1000));
      pill.textContent = (phase === 'again' ? 'Watch again' : 'Watch the guide') + ' · camera in ' + left + 's';
      if (bar) bar.style.width = Math.min(100, spent / GUIDE_MS * 50) + '%';
      if (spent >= GUIDE_MS) {
        showAction();
        return;
      }
    } else if (phase === 'action') {
      pill.textContent = 'Your turn';
      if (bar) bar.style.width = '100%';
      const limit = tracker.step ? HESITATION_MS.movement : HESITATION_MS.document;
      // Not while the movement is being held, or while the document is seen.
      const busy = oval.classList.contains('is-matching') || countdownStart || shooting;
      if (busy) phaseStarted = Date.now() - Math.min(spent, limit - BADGE_FROM_MS);
      const left = limit - (Date.now() - phaseStarted);
      badgeLeft.hidden = left > BADGE_FROM_MS;
      badgeLeft.textContent = 'Guide again in ' + Math.max(1, Math.ceil(left / 1000)) + 's';
      if (left <= 0) {
        showGuide(true);
        return;
      }
    } else {
      pill.textContent = 'Step done';
    }
    clock = setTimeout(clockTick, 250);
  }

  goButton.addEventListener('click', showAction);
  replayButton.addEventListener('click', function () { showGuide(true); });

  // Is the document held up? Among the faces found, the biggest is the user's. The document's photo
  // is a smaller face next to it (not on it), at about the same height.
  function documentNextToFace(boxes) {
    if (boxes.length < 2) return false;
    const sorted = boxes.slice().sort(function (a, b) { return b.height - a.height; });
    const face = sorted[0];
    return sorted.slice(1).some(function (box) {
      const smaller = box.height < face.height * 0.7 && box.height > face.height * 0.12;
      const beside = Math.abs((box.x + box.width / 2) - (face.x + face.width / 2)) > face.width * 0.6;
      const level = Math.abs((box.y + box.height / 2) - (face.y + face.height / 2)) < face.height * 1.2;
      return smaller && beside && level;
    });
  }

  // The photo with the document: taken by the button or by the countdown.
  async function takeDocumentPhoto() {
    if (shooting) return;
    shooting = true;
    stopCountdown();
    flash.classList.remove('is-on');
    void flash.offsetWidth; // restarts the flash animation
    flash.classList.add('is-on');
    photos.selfie = await capture(SELFIE_WIDTH);
    running = false; // no more frames
    await new Promise(function (resolve) { setTimeout(resolve, 450); }); // the flash is seen
    shooting = false;
    stopCamera();
    showReview();
  }

  // One frame of the last step: is the face seen, and the document next to it?
  async function documentTick() {
    let boxes = [];
    try {
      // A bigger input finds the small face of the document's photo.
      const found = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.35 }));
      boxes = found.map(function (detection) { return detection.box; });
    } catch (err) {
      boxes = [];
    }
    if (!running) return;
    faceSeen = boxes.length > 0;
    oval.classList.toggle('is-lost', !faceSeen);

    const held = documentNextToFace(boxes);
    if (held) {
      docHits += 1;
      docMisses = 0;
    } else {
      docMisses += 1;
      if (docMisses > DOC_MISSES_ALLOWED) {
        docHits = 0;
        stopCountdown();
      }
    }
    oval.classList.toggle('is-matching', docHits >= DOC_FRAMES_NEEDED);

    if (docHits >= DOC_FRAMES_NEEDED && !countdownStart) countdownStart = Date.now();
    if (countdownStart) {
      const left = COUNTDOWN_SECONDS - Math.floor((Date.now() - countdownStart) / 1000);
      if (left <= 0) {
        await takeDocumentPhoto();
        return;
      }
      count.textContent = String(left);
      hint.textContent = 'Your document is seen. Hold still...';
    } else if (!faceSeen) {
      hint.textContent = 'We can\'t see your face. Keep it in the oval, next to your document.';
    } else if (Date.now() - stepStarted > 6000) {
      hint.textContent = 'Hold the document next to your cheek, with its photo facing the camera and not too far. ' +
        'If it isn\'t seen, press "Take the photo".';
    } else {
      hint.textContent = '';
    }
  }

  // One frame: find the face, give its pose to the tracker, keep the photo when a movement is done.
  async function tick() {
    if (!running) return;
    if (phase !== 'action') {
      setTimeout(tick, 150);
      return;
    }
    if (!tracker.step) {
      await documentTick();
      if (running) setTimeout(tick, 100);
      return;
    }
    let detection = null;
    try {
      detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks();
    } catch (err) {
      detection = null;
    }
    if (!running) return;
    lastPose = detection ? rules.poseOf(detection.landmarks.positions, video.videoWidth) : null;

    const result = tracker.feed(lastPose);
    oval.classList.toggle('is-matching', result.hint === 'Hold it...' || Boolean(result.done));
    oval.classList.toggle('is-lost', !lastPose);
    if (result.done) {
      photos[result.done] = await capture(FRAME_WIDTH);
      stepDone();
    } else {
      const slow = Date.now() - stepStarted > 7000;
      hint.textContent = result.hint + (slow ? ' Make the movement bigger, and keep your whole face in the oval.' : '');
    }
    setTimeout(tick, 100);
  }

  // onlyDocument: retake only the photo with the document, and keep the four movement photos.
  async function startCamera(onlyDocument) {
    showMessage('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      noCamera('This browser can\'t use a camera here.');
      return;
    }
    if (onlyDocument) {
      photoUrls.forEach(function (url) { URL.revokeObjectURL(url); });
      photoUrls = [];
      delete photos.selfie;
    } else {
      forgetPhotos();
    }
    showPart('camera');
    flow.dataset.step = onlyDocument ? '4' : '0';
    flow.dataset.phase = 'guide';
    stepCount.textContent = 'Step ' + (onlyDocument ? 5 : 1) + ' of ' + STEPS.length;
    pill.textContent = 'Starting...';
    say.textContent = 'Starting the camera...';
    desc.textContent = 'Allow the camera if your browser asks.';
    hint.textContent = '';
    arrow.textContent = '';
    badgeLeft.hidden = true;
    goButton.hidden = true;
    replayButton.hidden = true;
    shootButton.hidden = true;
    stepsList.querySelectorAll('li').forEach(function (li) { li.className = ''; });

    try {
      // The library and the two small models are on this server: nothing is downloaded from
      // anywhere else, and the camera's picture never leaves the browser until "Send".
      if (!faceapi) {
        const loaded = await Promise.all([import('/vendor/face-api/face-api.esm.js'), import('/js/liveness-pose.mjs')]);
        faceapi = loaded[0];
        rules = loaded[1];
        say.textContent = 'Preparing the face check...';
        // The graphics card (WebGL) is fast. Without one, the processor does the work: slower,
        // but it needs no extra file (the library's other choice, WebAssembly, would).
        let backend = false;
        try { backend = await faceapi.tf.setBackend('webgl'); } catch (err) { backend = false; }
        if (!backend) await faceapi.tf.setBackend('cpu');
        await faceapi.tf.ready();
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODELS),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS)
        ]);
      }
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
    } catch (err) {
      stopCamera();
      if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
        noCamera('The camera is blocked. Allow it in your browser\'s address bar and press "Start the camera check" again.');
      } else if (err && (err.name === 'NotFoundError' || err.name === 'OverconstrainedError')) {
        noCamera('No camera was found on this device.');
      } else {
        noCamera('The camera check could not start.');
      }
      return;
    }

    video.srcObject = stream;
    await video.play().catch(function () {});
    // With the movements already done, the camera opens on the last step (no step left).
    tracker = onlyDocument ? { step: null } : rules.createTracker();
    running = true;
    showGuide(false);
    tick();
  }

  function noCamera(reason) {
    showPart('intro');
    uploadBox.open = true;
    showMessage(reason + ' You can also upload a photo below.', 'error');
    message.focus();
  }

  q('[data-live-start]').addEventListener('click', function () { startCamera(false); });
  q('[data-live-again]').addEventListener('click', function () { startCamera(false); });
  retakeButton.addEventListener('click', function () { startCamera(true); });
  q('[data-live-cancel]').addEventListener('click', function () {
    stopCamera();
    forgetPhotos();
    showPart('intro');
    q('[data-live-start]').focus();
  });

  shootButton.addEventListener('click', function () {
    if (!faceSeen) {
      hint.textContent = 'We can\'t see your face. Keep it in the oval, next to your document, then press "Take the photo".';
      return;
    }
    takeDocumentPhoto();
  });

  // Don't keep the camera on when the user leaves the page.
  window.addEventListener('pagehide', stopCamera);

  // ---------- Check and send ----------

  function showReview() {
    photoUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    photoUrls = [];
    photosBox.replaceChildren(...['selfie', 'straight', 'left', 'right', 'closer'].map(function (id) {
      const figure = document.createElement('figure');
      figure.className = 'liveness__photo' + (id === 'selfie' ? ' liveness__photo--main' : '');
      const img = document.createElement('img');
      const url = URL.createObjectURL(photos[id]);
      photoUrls.push(url);
      img.src = url;
      img.alt = CAPTIONS[id];
      const caption = document.createElement('figcaption');
      caption.textContent = CAPTIONS[id];
      figure.append(img, caption);
      return figure;
    }));
    showPart('review');
    reviewTitle.focus();
  }

  // Sends the photos (FormData: multipart/form-data) and shows the answer.
  async function send(data, button, label) {
    showMessage('');
    button.disabled = true;
    button.textContent = 'Sending...';
    let response;
    let result;
    try {
      response = await fetch('/api/id-document/selfie', { method: 'POST', body: data });
      result = await response.json();
    } catch (err) {
      showMessage("We can't reach the server right now. Please try again.", 'error');
      message.focus();
      return false;
    } finally {
      button.disabled = false;
      button.textContent = label;
    }

    if (response.ok) {
      forgetPhotos();
      show(result.document);
      document.dispatchEvent(new CustomEvent('easytrip:id-doc-reviewed', { detail: result.document }));
      showMessage(result.message, 'success');
      message.focus();
      return true;
    }
    if (result.fields && result.fields.selfie && button === uploadButton) {
      setSelfieError(result.fields.selfie);
      uploadForm.elements.selfie.focus();
      return false;
    }
    showMessage((result.fields && result.fields.selfie) || result.error || 'Your photos could not be sent. Please try again.', 'error');
    message.focus();
    return false;
  }

  sendButton.addEventListener('click', function () {
    const data = new FormData();
    data.append('selfie', photos.selfie, 'selfie.jpg');
    ['straight', 'left', 'right', 'closer'].forEach(function (id) { data.append(id, photos[id], id + '.jpg'); });
    send(data, sendButton, 'Send my photos');
  });

  // ---------- Without a camera: one uploaded photo ----------

  uploadForm.elements.selfie.addEventListener('change', function () { setSelfieError(''); });

  uploadForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const file = uploadForm.elements.selfie.files[0];
    if (!file) {
      setSelfieError('Choose your selfie.');
      uploadForm.elements.selfie.focus();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSelfieError('The photo must be 5 MB or smaller.');
      uploadForm.elements.selfie.focus();
      return;
    }
    send(new FormData(uploadForm), uploadButton, 'Send this photo');
  });
})();
