// "My account" page: the identity document (a passport, an ID card or a driving licence).
// Step 1: the type and the photo are sent to POST /api/id-document/scan. The server reads the
//         photo in memory and never saves it. It reads the document's code if it has one
//         (passports, most ID cards); otherwise the user types the details (most driving licences).
// Step 2: the user checks, corrects or types the details, and PUT /api/id-document saves them.
// The saved details come from GET /api/id-document and can be deleted with DELETE /api/id-document.
// A good reading is never shown as a verified identity: the details are saved as not verified.
(function () {
  'use strict';

  const panel = document.querySelector('[data-id-doc]');
  if (!panel) return;

  const q = function (sel) { return panel.querySelector(sel); };
  const message = q('[data-id-doc-message]');
  const saved = q('[data-id-doc-saved]');
  const savedNotice = q('[data-id-doc-notice]');
  const upload = q('[data-id-doc-upload]');
  const typeSelect = upload.elements.documentType;
  const typeError = q('[data-id-doc-type-error]');
  const photo = upload.elements.document;
  const photoHint = q('[data-id-doc-photo-hint]');
  const photoError = q('[data-id-doc-photo-error]');
  const readButton = q('[data-id-doc-read]');
  const uploadCancel = q('[data-id-doc-upload-cancel]');
  const review = q('[data-id-doc-review]');
  const reviewTitle = q('[data-id-doc-review-title]');
  const reviewNotice = q('[data-id-doc-review-notice]');
  const numberLabel = q('[data-id-doc-number-label]');
  const nationalityField = q('[data-id-doc-nationality]');
  const noExpiryField = q('[data-id-doc-no-expiry-field]');
  const noExpiry = q('[data-id-doc-no-expiry]');
  const checksList = q('[data-id-doc-checks]');
  const warningsList = q('[data-id-doc-warnings]');
  const reviewError = q('[data-id-doc-review-error]');
  const saveButton = q('[data-id-doc-save]');

  const FIELDS = ['surname', 'givenNames', 'documentNumber', 'issuingCountry', 'nationality', 'dateOfBirth', 'expiryDate'];
  const PHOTO_HINTS = {
    passport: 'Show the whole photo page, flat and in good light, with the two code lines at the bottom ' +
      '(letters, numbers and < signs) in focus and without glare.',
    id_card: 'Show the side with the code lines (letters, numbers and < signs), usually the back. ' +
      'If your card has no code, show the side with your name and dates.',
    driving_licence: 'Show the side with your name, dates and licence number, flat, in good light and in focus.',
  };
  const NUMBER_LABELS = { passport: 'Passport number', id_card: 'Card number', driving_licence: 'Licence number' };
  const DETAIL_NAMES = {
    surname: 'surname', given_names: 'given names', document_number: 'number',
    date_of_birth: 'date of birth', expiry_date: 'expiry date',
  };
  let current = null; // The saved document, or null.
  let reviewType = ''; // The type of the document being checked.

  function showMessage(text, kind) {
    message.textContent = text;
    message.className = 'auth-status auth-status--' + kind;
    message.hidden = false;
  }

  function hideMessage() {
    message.hidden = true;
  }

  function connectionProblem() {
    return "We can't reach the server right now. Please try again.";
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch (err) {
      return {};
    }
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    });
  }

  function country(code, name) {
    return code + (name ? ' (' + name + ')' : '');
  }

  function listItem(text, kind) {
    const li = document.createElement('li');
    li.className = 'id-doc-checks__item id-doc-checks__item--' + kind;
    li.textContent = text;
    return li;
  }

  // ---------- Which part is shown ----------

  // The admin's review, in the user's words.
  const REVIEW = {
    unverified: 'not verified yet', pending: 'waiting for our check', verified: 'verified by EasyTrip',
    rejected: 'not verified (see below)'
  };

  function statusText(doc) {
    const review = REVIEW[doc.status] || 'not verified';
    if (doc.readMethod === 'machine_code') {
      return 'Read from the code, ' + review +
        (doc.sameAsRead ? '' : ' (you corrected what was read)') +
        (doc.checkDigitsValid ? '' : '. Some check digits did not match.');
    }
    const missing = doc.checkedOnPhoto.filter(function (detail) { return doc.foundOnPhoto.indexOf(detail) === -1; });
    return 'Typed by you, ' + review + '. Found on the photo: ' + doc.foundOnPhoto.length + ' of ' +
      doc.checkedOnPhoto.length + ' details' +
      (missing.length ? ' (not found: ' + missing.map(function (d) { return DETAIL_NAMES[d]; }).join(', ') + ')' : '') + '.';
  }

  function showSaved(doc, notice) {
    current = doc;
    const fill = function (name, value) { q('[data-saved="' + name + '"]').textContent = value; };
    fill('type', doc.documentTypeName.charAt(0).toUpperCase() + doc.documentTypeName.slice(1));
    fill('name', (doc.givenNames ? doc.givenNames + ' ' : '') + doc.surname);
    fill('number', 'Ending in ' + doc.documentNumberEnd);
    fill('issuingCountry', country(doc.issuingCountry, doc.issuingCountryName));
    q('[data-saved-nationality]').hidden = !doc.nationality;
    fill('nationality', doc.nationality ? country(doc.nationality, doc.nationalityName) : '');
    fill('dateOfBirth', formatDate(doc.dateOfBirth));
    fill('expiryDate', doc.expiryDate ? formatDate(doc.expiryDate) + (doc.expired ? ' (expired)' : '') : 'No expiry date');
    fill('status', statusText(doc));
    savedNotice.textContent = doc.status === 'verified'
      ? 'Our team checked these details with your selfie: your identity is verified. Scanning another document starts the check again.'
      : (notice || '');
    saved.hidden = false;
    upload.hidden = true;
    review.hidden = true;
    // js/verification.js shows the verification step for this document.
    document.dispatchEvent(new CustomEvent('easytrip:id-doc-changed', { detail: doc }));
  }

  function showHint() {
    photoHint.textContent = 'A JPG, PNG or WebP photo, 5 MB or smaller. ' + PHOTO_HINTS[typeSelect.value];
  }

  function showUpload(canCancel) {
    upload.reset();
    showHint();
    [typeError, photoError].forEach(function (p) { p.hidden = true; });
    [typeSelect, photo].forEach(function (field) { field.removeAttribute('aria-invalid'); });
    uploadCancel.hidden = !canCancel;
    saved.hidden = true;
    review.hidden = true;
    upload.hidden = false;
  }

  function backToStart() {
    if (current) showSaved(current, savedNotice.textContent);
    else showUpload(false);
  }

  // ---------- Step 1: read the photo ----------

  function showFieldError(field, errorText, text) {
    errorText.textContent = text;
    errorText.hidden = false;
    field.setAttribute('aria-invalid', 'true');
    field.focus();
  }

  typeSelect.addEventListener('change', function () {
    showHint();
    typeError.hidden = true;
    typeSelect.removeAttribute('aria-invalid');
  });

  upload.addEventListener('submit', async function (event) {
    event.preventDefault();
    hideMessage();
    [typeError, photoError].forEach(function (p) { p.hidden = true; });
    [typeSelect, photo].forEach(function (field) { field.removeAttribute('aria-invalid'); });

    // A chosen file, or the photo taken with the camera (js/document-camera.js).
    const file = photo.files[0] || upload.cameraPhoto;
    if (!file) {
      showFieldError(photo, photoError, 'Choose a photo of your document.');
      return;
    }

    const data = new FormData();
    data.append('documentType', typeSelect.value);
    data.append('document', file);
    readButton.disabled = true;
    readButton.textContent = 'Reading the document...';

    let response;
    let result;
    try {
      response = await fetch('/api/id-document/scan', { method: 'POST', body: data });
      result = await readJson(response);
    } catch (err) {
      showFieldError(photo, photoError, connectionProblem());
      return;
    } finally {
      readButton.disabled = false;
      readButton.textContent = 'Read the document';
    }

    if (response.status === 401) {
      showFieldError(photo, photoError, 'Your session has ended. Please log in again.');
      return;
    }
    if (!response.ok) {
      // 400: a problem with the type or the file. 422: the photo can't be used (see the message).
      // 429: too many scans.
      if (result.fields && result.fields.documentType) {
        showFieldError(typeSelect, typeError, result.fields.documentType);
        return;
      }
      // The photo shows another type of document: choose it, so "Read" can simply be pressed again.
      if (result.reason === 'wrong-type' && result.detectedType && PHOTO_HINTS[result.detectedType]) {
        typeSelect.value = result.detectedType;
        showHint();
      }
      showFieldError(photo, photoError, result.error || "The photo couldn't be read. Please try another photo.");
      return;
    }

    upload.reset(); // The browser forgets the chosen file too.
    showReview(result);
  });

  uploadCancel.addEventListener('click', backToStart);

  // ---------- Step 2: check (or type), correct and save ----------

  function clearReviewErrors() {
    reviewError.hidden = true;
    review.querySelectorAll('[data-error-for]').forEach(function (p) {
      p.hidden = true;
      p.textContent = '';
    });
    review.querySelectorAll('[aria-invalid]').forEach(function (field) {
      field.removeAttribute('aria-invalid');
    });
  }

  function codeChecks(result) {
    const checks = result.checks;
    return [
      listItem('Code found: ' + (result.documentType === 'passport' ? 'a passport' : 'an ID card'), 'ok'),
      checks.checkDigitsValid
        ? listItem('Check digits: they all match', 'ok')
        : listItem("Check digits: they don't match for the " + checks.failedCheckDigits.join(', '), 'problem'),
      checks.namesMatchPrintedText
        ? listItem('Names: the same as the names printed on the document', 'ok')
        : listItem('Names: not found in the printed text, so check them', 'problem'),
      checks.countryCodesRecognised
        ? listItem('Country codes: recognised', 'ok')
        : listItem('Country codes: not recognised', 'problem'),
      checks.expired ? listItem('Expiry: this document has expired', 'problem') : listItem('Expiry: not expired', 'ok'),
    ];
  }

  // A document without a code: the details found in its printed text are filled in, the others are
  // left empty for the user to type.
  function typedChecks(result) {
    const shown = FIELDS.filter(function (name) {
      return !(name === 'nationality' && result.documentType === 'driving_licence');
    });
    const filled = shown.filter(function (name) { return result.details[name]; }).length;
    if (filled === 0) {
      return [listItem('No machine-readable code, and no details could be read: type them exactly as they ' +
        'are printed on your ' + result.documentTypeName + '.', 'warning')];
    }
    const items = [listItem(filled + ' of ' + shown.length + ' details were read from the text printed on your ' +
      result.documentTypeName + '. Check each one against the ' + result.documentTypeName + '.', 'ok')];
    if (filled < shown.length) {
      items.push(listItem('Type the empty fields exactly as they are printed.', 'warning'));
    }
    return items;
  }

  // The same date limits as the server (validators/id-document.js): the holder is 18 to 120 years
  // old, and the document expires between today and 30 years from now. With min and max, the
  // calendar opens on possible dates only (for the birth date, around 18 years ago, not today).
  function yearsFromToday(years) {
    const date = new Date();
    date.setFullYear(date.getFullYear() + years);
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function setDateLimits() {
    review.elements.dateOfBirth.min = yearsFromToday(-120);
    review.elements.dateOfBirth.max = yearsFromToday(-18);
    review.elements.expiryDate.min = yearsFromToday(0);
    review.elements.expiryDate.max = yearsFromToday(30);
  }

  function showReview(result) {
    clearReviewErrors();
    reviewType = result.documentType;
    const typed = result.readMethod === 'typed';
    FIELDS.forEach(function (name) {
      review.elements[name].value = result.details[name] || '';
    });

    reviewTitle.textContent = typed ? 'Type the details' : 'Check the details';
    numberLabel.textContent = NUMBER_LABELS[reviewType];
    review.elements.documentNumber.maxLength = reviewType === 'passport' ? 9 : 20;
    nationalityField.hidden = reviewType === 'driving_licence';
    // A passport always has an expiry date; some ID cards and licences have none.
    noExpiryField.hidden = reviewType === 'passport';
    setNoExpiry(false);
    setDateLimits();

    checksList.replaceChildren(...(typed ? typedChecks(result) : codeChecks(result)));
    warningsList.replaceChildren(...result.warnings.map(function (text) { return listItem(text, 'warning'); }));
    warningsList.hidden = result.warnings.length === 0;
    reviewNotice.textContent = result.notice;

    saved.hidden = true;
    upload.hidden = true;
    review.hidden = false;
    reviewTitle.focus();
  }

  review.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearReviewErrors();

    const details = {};
    FIELDS.forEach(function (name) { details[name] = review.elements[name].value; });
    if (reviewType === 'driving_licence') delete details.nationality;
    details.noExpiry = reviewType !== 'passport' && noExpiry.checked;

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    let response;
    let result;
    try {
      response = await fetch('/api/id-document', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });
      result = await readJson(response);
    } catch (err) {
      reviewError.textContent = connectionProblem();
      reviewError.hidden = false;
      reviewError.focus();
      return;
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save these details';
    }

    if (response.ok) {
      showSaved(result.document, result.notice);
      showMessage(result.message, 'success');
      message.focus();
      return;
    }

    reviewError.textContent = response.status === 401
      ? 'Your session has ended. Please log in again.'
      : result.error || "The details couldn't be saved.";
    reviewError.hidden = false;
    let first = null;
    Object.keys(result.fields || {}).forEach(function (name) {
      const field = review.elements[name];
      const errorText = review.querySelector('[data-error-for="' + name + '"]');
      if (errorText) {
        errorText.textContent = result.fields[name];
        errorText.hidden = false;
      }
      if (field) {
        field.setAttribute('aria-invalid', 'true');
        if (!first) first = field;
      }
    });
    (first || reviewError).focus();
  });

  // The message under a field goes away when the user changes that field.
  review.addEventListener('input', function (event) {
    const field = event.target;
    if (!field.name || field.getAttribute('aria-invalid') !== 'true') return;
    field.removeAttribute('aria-invalid');
    const errorText = review.querySelector('[data-error-for="' + field.name + '"]');
    if (errorText) errorText.hidden = true;
  });

  // "No expiry date" empties and turns off the expiry date field.
  function setNoExpiry(on) {
    noExpiry.checked = on;
    review.elements.expiryDate.disabled = on;
    if (on) review.elements.expiryDate.value = '';
  }

  noExpiry.addEventListener('change', function () {
    setNoExpiry(noExpiry.checked);
    review.elements.expiryDate.removeAttribute('aria-invalid');
    review.querySelector('[data-error-for="expiryDate"]').hidden = true;
  });

  q('[data-id-doc-review-cancel]').addEventListener('click', function () {
    hideMessage();
    backToStart();
  });

  // ---------- The saved details ----------

  q('[data-id-doc-rescan]').addEventListener('click', function () {
    hideMessage();
    showUpload(true);
    typeSelect.focus();
  });

  q('[data-id-doc-delete]').addEventListener('click', async function () {
    if (!window.confirm('Delete your saved document details? This can\'t be undone.')) return;
    let response;
    let result;
    try {
      response = await fetch('/api/id-document', { method: 'DELETE' });
      result = await readJson(response);
    } catch (err) {
      showMessage(connectionProblem(), 'error');
      message.focus();
      return;
    }
    if (response.ok) {
      current = null;
      showUpload(false);
      document.dispatchEvent(new CustomEvent('easytrip:id-doc-changed', { detail: null }));
      showMessage(result.message, 'success');
    } else {
      showMessage(result.error || "The details couldn't be deleted.", 'error');
    }
    message.focus();
  });

  // ---------- Start ----------

  async function start() {
    let response;
    let result;
    try {
      response = await fetch('/api/id-document');
      result = await readJson(response);
    } catch (err) {
      showMessage(connectionProblem(), 'error');
      return;
    }
    if (!response.ok) {
      showMessage(result.error || "Your document details couldn't be loaded.", 'error');
      return;
    }
    if (result.document) showSaved(result.document, result.notice);
    else {
      showUpload(false);
      document.dispatchEvent(new CustomEvent('easytrip:id-doc-changed', { detail: null }));
    }
  }

  // After a selfie, js/verification.js has the document with its new status.
  document.addEventListener('easytrip:id-doc-reviewed', function (event) {
    if (current) {
      current = event.detail;
      q('[data-saved="status"]').textContent = statusText(current);
    }
  });

  // Start once account.js has checked with the server who is logged in.
  document.addEventListener('easytrip:account-ready', start);
})();
