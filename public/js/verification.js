// "My account" page: identity verification. js/id-document.js tells this script which document is
// saved (the event "easytrip:id-doc-changed"). The user then does the camera check:
//   1. the camera starts, and face-api (open source, in public/vendor/face-api/) finds the face
//      and its 68 points in each frame, in the browser;
//   2. the page asks to look straight, turn left, turn right and move closer
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

  function markSteps() {
    const current = tracker && tracker.step ? tracker.step.id : 'document';
    stepsList.querySelectorAll('li').forEach(function (li) {
      const id = li.dataset.step;
      li.classList.toggle('is-done', Boolean(photos[id]));
      li.classList.toggle('is-current', id === current && !photos[id]);
      if (id === current) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
  }

  function showStep() {
    stepStarted = Date.now();
    markSteps();
    if (tracker.step) {
      say.textContent = tracker.step.say;
      arrow.textContent = ARROWS[tracker.step.id] || '';
      shootButton.hidden = true;
    } else {
      say.textContent = 'Last step: hold your identity document next to your face, with its photo facing the camera, then press "Take the photo".';
      arrow.textContent = '';
      hint.textContent = '';
      shootButton.hidden = false;
      shootButton.focus();
    }
  }

  // One frame: find the face, give its pose to the tracker, keep the photo when a movement is done.
  async function tick() {
    if (!running) return;
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

    if (tracker.step) {
      const result = tracker.feed(lastPose);
      oval.classList.toggle('is-matching', result.hint === 'Hold it...' || Boolean(result.done));
      oval.classList.toggle('is-lost', !lastPose);
      if (result.done) {
        photos[result.done] = await capture(FRAME_WIDTH);
        hint.textContent = '';
        showStep();
      } else {
        const slow = Date.now() - stepStarted > 20000;
        hint.textContent = result.hint + (slow ? ' Make the movement bigger, and keep your whole face in the oval.' : '');
      }
    } else {
      // The document step: the oval says whether the face is seen.
      oval.classList.toggle('is-matching', Boolean(lastPose));
      oval.classList.toggle('is-lost', !lastPose);
      hint.textContent = lastPose ? '' : 'We can\'t see your face. Keep it in the oval, next to your document.';
    }
    setTimeout(tick, 100);
  }

  async function startCamera() {
    showMessage('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      noCamera('This browser can\'t use a camera here.');
      return;
    }
    forgetPhotos();
    showPart('camera');
    say.textContent = 'Starting the camera...';
    hint.textContent = '';
    arrow.textContent = '';
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
    tracker = rules.createTracker();
    running = true;
    showStep();
    tick();
  }

  function noCamera(reason) {
    showPart('intro');
    uploadBox.open = true;
    showMessage(reason + ' You can also upload a photo below.', 'error');
    message.focus();
  }

  q('[data-live-start]').addEventListener('click', startCamera);
  q('[data-live-again]').addEventListener('click', startCamera);
  q('[data-live-cancel]').addEventListener('click', function () {
    stopCamera();
    forgetPhotos();
    showPart('intro');
    q('[data-live-start]').focus();
  });

  shootButton.addEventListener('click', async function () {
    if (!lastPose) {
      hint.textContent = 'We can\'t see your face. Keep it in the oval, next to your document, then press "Take the photo".';
      return;
    }
    photos.selfie = await capture(SELFIE_WIDTH);
    stopCamera();
    showReview();
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
