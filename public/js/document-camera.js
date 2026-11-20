// "My account" page, identity document step: on a phone or a tablet, the document can be
// photographed with the back camera, inside a see-through outline of the chosen document (its
// shape, the photo box, the lines of text and, for a passport, the two code lines at the bottom).
// The user lines their document up with the outline and takes the photo; the photo is cropped to
// the outline and read like an uploaded one (js/id-document.js sends it to /api/id-document/scan).
// On a computer this part stays hidden: the user uploads a photo of the document instead.
(function () {
  'use strict';

  const form = document.querySelector('[data-id-doc-upload]');
  const box = form ? form.querySelector('[data-doc-cam]') : null;
  if (!box) return;

  const q = function (sel) { return box.querySelector(sel); };
  const startButton = q('[data-doc-cam-start]');
  const view = q('[data-doc-cam-view]');
  const stage = q('[data-doc-cam-stage]');
  const video = q('[data-doc-cam-video]');
  const frame = q('[data-doc-cam-frame]');
  const say = q('[data-doc-cam-say]');
  const preview = q('[data-doc-cam-preview]');
  const shot = q('[data-doc-cam-shot]');
  const typeSelect = form.elements.documentType;
  const fileInput = form.elements.document;

  const MAX_WIDTH = 2400; // big enough for the code lines to be read, small enough to send quickly
  const SVG = 'http://www.w3.org/2000/svg';

  // A phone or a tablet: a touch screen as the main pointer, and a camera the page can use.
  const canUseCamera = window.matchMedia('(pointer: coarse)').matches &&
    Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  if (!canUseCamera) return;
  box.hidden = false;

  // ---------- The outlines ----------
  // Each is drawn in a box of 1000 units wide; the height follows the document's real shape:
  // a passport's photo page is 125 x 88 mm, an ID card and a driving licence 85.6 x 54 mm.

  const SHAPES = {
    passport: {
      ratio: 125 / 88,
      say: 'Open your passport at the photo page. Fit the page inside the outline, with the two code lines at the bottom.',
      photo: { x: 50, y: 140, w: 250, h: 320 },
      lines: [[340, 160, 420], [340, 220, 520], [340, 280, 380], [340, 340, 470], [340, 400, 300]],
      code: 2
    },
    id_card: {
      ratio: 85.6 / 54,
      say: 'Fit your ID card inside the outline. If it has lines of letters and < signs on the back, photograph the back.',
      photo: { x: 45, y: 140, w: 250, h: 320 },
      lines: [[335, 160, 430], [335, 220, 520], [335, 280, 360], [335, 340, 480], [335, 400, 300]],
      code: 0
    },
    driving_licence: {
      ratio: 85.6 / 54,
      say: 'Fit the front of your driving licence inside the outline.',
      photo: { x: 45, y: 140, w: 250, h: 320 },
      lines: [[335, 160, 430], [335, 220, 520], [335, 280, 360], [335, 340, 480], [335, 400, 300], [335, 460, 240]],
      code: 0
    }
  };

  function el(name, attributes) {
    const node = document.createElementNS(SVG, name);
    Object.keys(attributes).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  function drawOutline() {
    const shape = SHAPES[typeSelect.value] || SHAPES.passport;
    const height = Math.round(1000 / shape.ratio);
    frame.style.aspectRatio = shape.ratio;
    const svg = el('svg', { viewBox: '0 0 1000 ' + height, class: 'doc-cam__guide' });

    // The title band at the top.
    svg.append(el('rect', { x: 50, y: 50, width: 560, height: 34, rx: 8, class: 'doc-cam__fill' }));
    // The photo box, with the shape of a head and shoulders.
    const p = shape.photo;
    svg.append(el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, rx: 14, class: 'doc-cam__line doc-cam__dashed' }));
    const cx = p.x + p.w / 2;
    svg.append(el('circle', { cx: cx, cy: p.y + p.h * 0.36, r: p.w * 0.24, class: 'doc-cam__line' }));
    svg.append(el('path', {
      d: 'M' + (p.x + p.w * 0.12) + ' ' + (p.y + p.h) + ' Q' + cx + ' ' + (p.y + p.h * 0.52) + ' ' + (p.x + p.w * 0.88) + ' ' + (p.y + p.h),
      class: 'doc-cam__line'
    }));
    // The lines of text next to the photo.
    shape.lines.forEach(function (line) {
      svg.append(el('rect', { x: line[0], y: line[1], width: line[2], height: 20, rx: 10, class: 'doc-cam__fill' }));
    });
    // A passport's two code lines at the bottom: where the server reads the details from.
    if (shape.code) {
      const top = height - 150;
      svg.append(el('rect', { x: 35, y: top, width: 930, height: 120, rx: 12, class: 'doc-cam__line doc-cam__dashed' }));
      ['P<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<', '<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<'].forEach(function (row, index) {
        const text = el('text', { x: 500, y: top + 50 + index * 46, class: 'doc-cam__code', 'text-anchor': 'middle', textLength: 880, lengthAdjust: 'spacingAndGlyphs' });
        text.textContent = row;
        svg.append(text);
      });
    }
    frame.replaceChildren(svg);
    say.textContent = shape.say;
  }

  // ---------- The camera ----------

  let stream = null;

  // While the camera is open, the form's own "Read the document" button is hidden (css/auth.css).
  function cameraOpen(open) {
    form.classList.toggle('is-camera', open);
  }

  function stop() {
    cameraOpen(false);
    if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
    stream = null;
    video.srcObject = null;
  }

  async function start() {
    preview.hidden = true;
    drawOutline();
    view.hidden = false;
    startButton.hidden = true;
    cameraOpen(true);
    try {
      // The back camera, in high resolution: the code lines are small.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
    } catch (err) {
      stop();
      view.hidden = true;
      startButton.hidden = false;
      say.textContent = '';
      const blocked = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
      showProblem(blocked
        ? 'The camera is blocked. Allow it in your browser, or choose a photo above.'
        : 'The camera could not start. Choose a photo above instead.');
      return;
    }
    video.srcObject = stream;
    await video.play().catch(function () {});
    q('[data-doc-cam-shoot]').focus();
  }

  function showProblem(text) {
    const error = form.querySelector('[data-id-doc-photo-error]');
    error.textContent = text;
    error.hidden = false;
  }

  // The part of the camera's picture inside the outline (with a small margin), as a JPG.
  // The video fills the stage like "object-fit: cover", so the outline's place on the screen is
  // turned back into the camera's pixels.
  function capture() {
    const stageBox = stage.getBoundingClientRect();
    const frameBox = frame.getBoundingClientRect();
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scale = Math.max(stageBox.width / vw, stageBox.height / vh);
    const offsetX = (stageBox.width - vw * scale) / 2;
    const offsetY = (stageBox.height - vh * scale) / 2;
    const margin = frameBox.width * 0.05;
    const toVideo = function (screen, offset) { return (screen - offset) / scale; };
    const left = Math.max(0, toVideo(frameBox.left - stageBox.left - margin, offsetX));
    const top = Math.max(0, toVideo(frameBox.top - stageBox.top - margin, offsetY));
    const right = Math.min(vw, toVideo(frameBox.right - stageBox.left + margin, offsetX));
    const bottom = Math.min(vh, toVideo(frameBox.bottom - stageBox.top + margin, offsetY));

    const width = right - left;
    const height = bottom - top;
    const out = Math.min(1, MAX_WIDTH / width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * out);
    canvas.height = Math.round(height * out);
    canvas.getContext('2d').drawImage(video, left, top, width, height, 0, 0, canvas.width, canvas.height);
    return new Promise(function (resolve) { canvas.toBlob(resolve, 'image/jpeg', 0.92); });
  }

  let photoUrl = null;
  let photoFile = null;

  q('[data-doc-cam-shoot]').addEventListener('click', async function () {
    if (!video.videoWidth) return;
    const blob = await capture();
    stop();
    photoFile = new File([blob], 'document.jpg', { type: 'image/jpeg' });
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(blob);
    shot.src = photoUrl;
    view.hidden = true;
    preview.hidden = false;
    cameraOpen(true);
    q('[data-doc-cam-use]').focus();
  });

  // The photo becomes the form's photo, and the form is sent: the same reading as an upload.
  q('[data-doc-cam-use]').addEventListener('click', function () {
    form.cameraPhoto = photoFile; // js/id-document.js uses it when no file was chosen
    try {
      const files = new DataTransfer();
      files.items.add(photoFile);
      fileInput.files = files.files;
    } catch (err) {
      // An older browser: js/id-document.js reads form.cameraPhoto instead.
    }
    preview.hidden = true;
    startButton.hidden = false;
    cameraOpen(false);
    form.requestSubmit();
  });

  q('[data-doc-cam-retake]').addEventListener('click', start);
  startButton.addEventListener('click', start);
  q('[data-doc-cam-cancel]').addEventListener('click', function () {
    stop();
    view.hidden = true;
    startButton.hidden = false;
    startButton.focus();
  });

  // Another document type: another outline.
  typeSelect.addEventListener('change', function () {
    if (!view.hidden) drawOutline();
  });
  // A file chosen by hand replaces the camera's photo.
  fileInput.addEventListener('change', function () {
    if (fileInput.files.length && fileInput.files[0] !== photoFile) form.cameraPhoto = null;
  });
  window.addEventListener('pagehide', stop);
})();
