// Admin page: identity verifications. GET /api/admin/verifications lists the saved documents
// (the ones waiting for a review first). Opening one shows its details (GET
// /api/admin/verifications/:userId) and the selfie (.../selfie), and the admin approves or
// rejects it (POST /api/admin/verifications/:userId). Text is shown with textContent only.
(function () {
  'use strict';

  const panel = document.querySelector('[data-admin-verifications]');
  const dialog = document.querySelector('[data-verify-dialog]');
  if (!panel || !dialog) return;

  const PAGE_SIZE = 10;
  const TYPING_DELAY = 300;
  const STATUSES = { unverified: 'No selfie yet', pending: 'Waiting', verified: 'Verified', rejected: 'Rejected' };
  const DETAILS = { surname: 'surname', given_names: 'given names', document_number: 'number', date_of_birth: 'date of birth', expiry_date: 'expiry date' };

  const q = function (sel, root) { return (root || panel).querySelector(sel); };
  const rows = q('[data-verify-rows]');
  const tableWrap = q('.admin-table-wrap');
  const empty = q('[data-verify-empty]');
  const status = q('[data-verify-status]');
  const pageText = q('[data-verify-page]');
  const prevButton = q('[data-verify-prev]');
  const nextButton = q('[data-verify-next]');
  const filters = q('[data-verify-filters]');

  const form = q('[data-verify-form]', dialog);
  const title = q('[data-verify-title]', dialog);
  const email = q('[data-verify-email]', dialog);
  const dialogStatus = q('[data-verify-dialog-status]', dialog);
  const selfie = q('[data-verify-selfie]', dialog);
  const frames = q('[data-verify-frames]', dialog);
  const FRAMES = { straight: 'Looking straight', left: 'Turned left', right: 'Turned right', closer: 'Closer' };
  const noSelfie = q('[data-verify-no-selfie]', dialog);
  const documentPhoto = q('[data-verify-document]', dialog);
  const documentLink = q('[data-verify-document-link]', dialog);
  const documentCaption = q('[data-verify-document-caption]', dialog);
  const details = q('[data-verify-details]', dialog);
  const decide = q('[data-verify-decide]', dialog);
  const noteError = form.querySelector('[data-error-for="note"]');
  const approveButton = q('[data-verify-approve]', dialog);
  const rejectButton = q('[data-verify-reject]', dialog);

  let page = 1;
  let requestNumber = 0;
  let typingTimer = null;
  let current = null; // The document open in the dialog.

  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }

  function showDay(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function showDateTime(iso) {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function show(box, message, kind) {
    box.textContent = message;
    box.className = 'auth-status auth-status--' + kind;
    box.hidden = false;
  }

  async function call(url, options) {
    try {
      const response = await fetch(url, options);
      return { response: response, result: await response.json() };
    } catch (err) {
      return null;
    }
  }

  function problem(answer, fallback) {
    if (!answer) return "We can't reach the server right now. Please try again.";
    if (answer.response.status === 401) return 'Your session has ended. Please log in again.';
    if (answer.response.status === 403) return 'Only admins can review identities.';
    return answer.result.error || fallback;
  }

  function badge(value) {
    return element('span', 'messages-badge messages-badge--' + value, STATUSES[value]);
  }

  // ---------- The table ----------

  function buildRow(item) {
    const tr = document.createElement('tr');
    const who = document.createElement('td');
    who.append(element('span', 'admin-table__name', item.user.name), element('span', 'admin-table__sub', item.user.email));

    const doc = document.createElement('td');
    doc.append(
      element('span', 'admin-table__name', item.documentTypeName.charAt(0).toUpperCase() + item.documentTypeName.slice(1)),
      element('span', 'admin-table__sub', (item.givenNames ? item.givenNames + ' ' : '') + item.surname + ' · ' + item.issuingCountry)
    );

    const statusCell = document.createElement('td');
    statusCell.append(badge(item.status));
    if (item.expired) statusCell.append(element('span', 'admin-table__sub', 'Document expired'));

    const actions = element('td', 'admin-table__actions');
    const open = element('button', 'et-btn et-btn--outline admin-btn');
    open.type = 'button';
    open.dataset.userId = item.userId;
    open.append(item.status === 'pending' ? 'Review' : 'Open', element('span', 'et-visually-hidden', ': ' + item.user.name));
    open.addEventListener('click', function () { openOne(item.userId, open); });
    actions.append(open);

    tr.append(who, doc, element('td', '', item.submittedAt ? showDateTime(item.submittedAt) : '—'), statusCell, actions);
    return tr;
  }

  async function load() {
    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    if (filters.elements.q.value.trim()) params.set('q', filters.elements.q.value.trim());
    if (filters.elements.status.value) params.set('status', filters.elements.status.value);

    const answer = await call('/api/admin/verifications?' + params.toString());
    if (thisRequest !== requestNumber) return;
    if (!answer || !answer.response.ok) {
      show(status, problem(answer, 'The verifications could not be loaded.'), 'error');
      return;
    }
    const result = answer.result;
    const total = result.pagination.total;
    if (result.verifications.length === 0 && total > 0) {
      page = result.pagination.totalPages;
      return load();
    }
    const totalPages = Math.max(result.pagination.totalPages, 1);
    rows.replaceChildren(...result.verifications.map(buildRow));
    tableWrap.hidden = total === 0;
    empty.hidden = total !== 0;
    pageText.textContent = total === 0 ? '' : 'Page ' + page + ' of ' + totalPages + ' · ' + total + (total === 1 ? ' document' : ' documents');
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  }

  filters.addEventListener('submit', function (event) { event.preventDefault(); });
  filters.elements.q.addEventListener('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { page = 1; load(); }, TYPING_DELAY);
  });
  filters.elements.status.addEventListener('change', function () { page = 1; load(); });
  prevButton.addEventListener('click', function () { page -= 1; load(); });
  nextButton.addEventListener('click', function () { page += 1; load(); });

  // ---------- One document ----------

  // One line of the details: a label, a value, and a warning when a check didn't pass.
  function detail(label, value, warning) {
    const box = document.createElement('div');
    const dd = element('dd', '', value);
    if (warning) dd.append(element('span', 'verify-review__warn', warning));
    box.append(element('dt', '', label), dd);
    return box;
  }

  function fill(item) {
    current = item;
    title.textContent = 'Identity of ' + item.user.name;
    email.textContent = item.user.email;

    const readNote = item.readMethod === 'machine_code'
      ? 'Read from the machine code' + (item.checkDigitsValid ? '' : ', check digits did not match') +
        (item.sameAsRead ? '' : ', corrected by the customer')
      : 'Typed by the customer';
    const missing = item.foundOnPhoto
      ? Object.keys(DETAILS).filter(function (key) { return item.foundOnPhoto.indexOf(key) === -1; }).map(function (key) { return DETAILS[key]; })
      : [];

    details.replaceChildren(
      detail('Document', item.documentTypeName.charAt(0).toUpperCase() + item.documentTypeName.slice(1)),
      detail('Name on the document', (item.givenNames ? item.givenNames + ' ' : '') + item.surname),
      detail('Account name', item.user.name),
      detail('Number', item.documentNumber),
      detail('Issued by', item.issuingCountry + (item.nationality ? ' · nationality ' + item.nationality : '')),
      detail('Date of birth', showDay(item.dateOfBirth)),
      detail('Expiry date', item.expiryDate ? showDay(item.expiryDate) : 'No expiry date', item.expired ? 'Expired' : ''),
      detail('Camera check', item.hasSelfie
        ? (item.livenessSteps.length === 4 ? 'Done: looked straight, turned left and right, came closer' : 'Not done: the photo was uploaded')
        : '—',
        item.hasSelfie && item.livenessSteps.length !== 4 ? 'Without the camera check, the photo could be of another photo.' : ''),
      detail('How the details were saved', readNote,
        item.readMethod === 'typed' && missing.length ? 'Not found on the document photo: ' + missing.join(', ') : ''),
      detail('Status', STATUSES[item.status] +
        (item.reviewedAt ? ' · ' + showDateTime(item.reviewedAt) + (item.reviewedBy ? ' by ' + item.reviewedBy : '') : ''),
        item.reviewNote ? 'Note: ' + item.reviewNote : '')
    );

    // The photo of the document the customer scanned first. It is deleted once the identity is
    // verified, and documents saved before photos were kept have none.
    if (item.hasDocumentPhoto) {
      const url = '/api/admin/verifications/' + item.userId + '/document?t=' + Date.now();
      documentPhoto.src = url;
      documentPhoto.alt = 'The ' + item.documentTypeName + ' scanned by ' + item.user.name;
      documentLink.href = url;
      documentLink.hidden = false;
      documentCaption.textContent = 'The scanned ' + item.documentTypeName + ' (click to see it full size)';
    } else {
      documentPhoto.removeAttribute('src');
      documentLink.removeAttribute('href');
      documentLink.hidden = true;
      documentCaption.textContent = item.status === 'verified'
        ? 'No photo of the ' + item.documentTypeName + ': it is deleted once the identity is verified.'
        : 'No photo of the ' + item.documentTypeName + ': it was saved before photos were kept. Ask the customer to scan it again if needed.';
    }

    // The selfie is asked for with the session cookie, like any page file. A new address each
    // time stops the browser from showing an older photo.
    if (item.hasSelfie) {
      selfie.src = '/api/admin/verifications/' + item.userId + '/selfie?t=' + Date.now();
      selfie.alt = 'Selfie sent by ' + item.user.name + ', holding the document';
      selfie.hidden = false;
      noSelfie.hidden = true;
    } else {
      selfie.removeAttribute('src');
      selfie.hidden = true;
      noSelfie.hidden = false;
    }
    // The movement photos, small, under the selfie: the head should really turn and come closer.
    frames.replaceChildren(...(item.hasSelfie ? item.livenessSteps : []).map(function (frame) {
      const figure = element('figure', 'verify-review__frame');
      const img = document.createElement('img');
      img.src = '/api/admin/verifications/' + item.userId + '/selfie?frame=' + frame + '&t=' + Date.now();
      img.alt = FRAMES[frame] + ', from the camera check';
      figure.append(img, element('figcaption', '', FRAMES[frame]));
      return figure;
    }));
    frames.hidden = frames.children.length === 0;
    decide.hidden = item.status !== 'pending';
    approveButton.disabled = item.expired;
    form.reset();
    noteError.hidden = true;
    form.elements.note.removeAttribute('aria-invalid');
  }

  let opener = null;
  async function openOne(userId, button) {
    const answer = await call('/api/admin/verifications/' + userId);
    if (!answer || !answer.response.ok) {
      show(status, problem(answer, 'This document could not be opened.'), 'error');
      status.focus();
      load();
      return;
    }
    opener = button;
    dialogStatus.hidden = true;
    fill(answer.result.verification);
    dialog.showModal();
    title.focus();
  }

  async function sendDecision(decision) {
    noteError.hidden = true;
    form.elements.note.removeAttribute('aria-invalid');
    const note = form.elements.note.value.trim();
    if (decision === 'reject' && !note) {
      noteError.textContent = 'Say why, so the customer knows what to fix.';
      noteError.hidden = false;
      form.elements.note.setAttribute('aria-invalid', 'true');
      form.elements.note.focus();
      return;
    }
    approveButton.disabled = true;
    rejectButton.disabled = true;
    const answer = await call('/api/admin/verifications/' + current.userId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: decision, note: note })
    });
    approveButton.disabled = false;
    rejectButton.disabled = false;

    if (answer && answer.response.ok) {
      fill(answer.result.verification);
      show(dialogStatus, answer.result.message, 'success');
      dialogStatus.focus();
      load();
      document.dispatchEvent(new CustomEvent('easytrip:verifications-changed'));
      return;
    }
    if (answer && answer.result.fields && answer.result.fields.note) {
      noteError.textContent = answer.result.fields.note;
      noteError.hidden = false;
      form.elements.note.setAttribute('aria-invalid', 'true');
      form.elements.note.focus();
      return;
    }
    show(dialogStatus, problem(answer, 'The decision could not be saved.'), 'error');
    dialogStatus.focus();
  }

  form.addEventListener('submit', function (event) { event.preventDefault(); });
  approveButton.addEventListener('click', function () { sendDecision('approve'); });
  rejectButton.addEventListener('click', function () { sendDecision('reject'); });
  q('[data-verify-close]', dialog).addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', function () {
    selfie.removeAttribute('src'); // The photos aren't kept on the page after the dialog closes.
    documentPhoto.removeAttribute('src');
    documentLink.removeAttribute('href');
    frames.replaceChildren();
    const button = opener && (document.body.contains(opener) ? opener : panel.querySelector('[data-user-id="' + current.userId + '"]'));
    if (button) button.focus();
    opener = null;
  });

  document.addEventListener('easytrip:admin-ready', load);
})();
