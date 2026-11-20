// Admin page: the messages inbox. It uses GET /api/admin/inquiries (the table), and for one
// message GET /api/admin/inquiries/:id (open it), PATCH (mark read, close or reopen), POST
// .../replies (answer it) and DELETE (delete it). The server only accepts these from an admin.
// Messages come from visitors, so they are always shown with textContent, never as HTML.
(function () {
  'use strict';

  const panel = document.querySelector('[data-admin-messages]');
  const dialog = document.querySelector('[data-message-dialog]');
  if (!panel || !dialog) return;

  const PAGE_SIZE = 10;
  const TYPING_DELAY = 300;
  const TOPICS = {
    general: 'General question', destinations: 'Destinations', stays: 'Hotels & chalets',
    flights: 'Flight planning', 'bus-train': 'Bus & train planning', website: 'Website issue', other: 'Other',
  };
  const STATUSES = { new: 'New', read: 'Read', answered: 'Answered', closed: 'Closed' };

  const q = function (sel, root) { return (root || document).querySelector(sel); };
  const rows = q('[data-message-rows]', panel);
  const tableWrap = q('.admin-table-wrap', panel);
  const empty = q('[data-message-empty]', panel);
  const listStatus = q('[data-message-status]', panel);
  const pageText = q('[data-message-page]', panel);
  const prevButton = q('[data-message-prev]', panel);
  const nextButton = q('[data-message-next]', panel);
  const filters = q('[data-message-filters]', panel);

  const title = q('[data-message-title]', dialog);
  const dialogStatus = q('[data-message-dialog-status]', dialog);
  const text = q('[data-message-text]', dialog);
  const repliesBox = q('[data-message-replies]', dialog);
  const replyForm = q('[data-reply-form]', dialog);
  const replyHint = q('[data-reply-hint]', dialog);
  const replyError = q('[data-error-for="message"]', dialog);
  const sendButton = q('[data-reply-send]', dialog);
  const toggleButton = q('[data-message-toggle]', dialog);
  const avatar = q('[data-message-avatar]', dialog);
  const sender = q('[data-message-sender]', dialog);
  const emailLink = q('[data-message-field="email"]', dialog);
  const emailWarning = q('[data-email-warning]', dialog);
  const replyLabel = q('[data-reply-label]', dialog);
  const replyCount = q('[data-reply-count]', dialog);
  const REPLY_MAX = 2000;

  // Email addresses that are almost always a typo of a well-known one. A reply sent to them
  // never arrives, so the admin is warned before sending.
  const TYPOS = {
    'gamil.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com',
    'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gmaill.com': 'gmail.com',
    'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
    'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'outlok.com': 'outlook.com', 'outllook.com': 'outlook.com',
    'iclod.com': 'icloud.com', 'icoud.com': 'icloud.com', 'icloud.co': 'icloud.com'
  };

  // "Lara Haddad" -> "LH"
  function initials(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    return ((words[0] || '?').charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : '')).toUpperCase();
  }

  function countReply() {
    const length = replyForm.elements.message.value.length;
    replyCount.textContent = length.toLocaleString('en-US') + ' / ' + REPLY_MAX.toLocaleString('en-US');
    replyCount.classList.toggle('is-near', length > REPLY_MAX * 0.9);
  }

  let page = 1;
  let requestNumber = 0; // Only the answer to the newest list request is shown.
  let typingTimer = null;
  let current = null; // The message open in the dialog.
  let opener = null; // The button that opened it, to give the focus back.

  function formatDate(iso) {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }

  function badge(status) {
    return element('span', 'messages-badge messages-badge--' + status, STATUSES[status]);
  }

  function show(box, message, kind) {
    box.textContent = message;
    box.className = 'auth-status auth-status--' + kind;
    box.hidden = false;
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch (err) {
      return {};
    }
  }

  // Sends a request and returns { response, result }, or null when the server can't be reached.
  async function call(url, options) {
    try {
      const response = await fetch(url, options);
      return { response: response, result: await readJson(response) };
    } catch (err) {
      return null;
    }
  }

  function problem(answer, fallback) {
    if (!answer) return "We can't reach the server right now. Please try again.";
    if (answer.response.status === 401) return 'Your session has ended. Please log in again.';
    if (answer.response.status === 403) return 'Only admins can read the messages.';
    return answer.result.error || fallback;
  }

  // The totals at the top count the new messages, so they change too.
  function messagesChanged() {
    document.dispatchEvent(new CustomEvent('easytrip:inquiries-changed'));
  }

  // ---------- The table ----------

  function buildRow(inquiry) {
    const tr = document.createElement('tr');

    const from = document.createElement('td');
    from.append(element('span', 'admin-table__name', inquiry.name), element('span', 'admin-table__sub', inquiry.email));
    if (!inquiry.fromAccount) from.append(element('span', 'admin-table__sub', 'Visitor (no account)'));

    const message = document.createElement('td');
    message.append(
      element('span', 'admin-table__name', TOPICS[inquiry.topic] || inquiry.topic),
      element('span', 'admin-table__sub', inquiry.preview + (inquiry.preview.length >= 140 ? '…' : ''))
    );

    const statusCell = document.createElement('td');
    statusCell.append(badge(inquiry.status));
    if (inquiry.replyCount > 0) {
      statusCell.append(element('span', 'admin-table__sub', inquiry.replyCount + (inquiry.replyCount === 1 ? ' reply' : ' replies')));
    }

    const actions = document.createElement('td');
    actions.className = 'admin-table__actions';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'et-btn et-btn--outline admin-btn';
    open.dataset.messageId = inquiry.id;
    open.append('Open', element('span', 'et-visually-hidden', ': message from ' + inquiry.name));
    open.addEventListener('click', function () { openMessage(inquiry.id, open); });
    actions.append(open);

    tr.append(element('td', '', formatDate(inquiry.createdAt)), from, message, statusCell, actions);
    return tr;
  }

  async function loadMessages() {
    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    const search = filters.elements.q.value.trim();
    if (search) params.set('q', search);
    if (filters.elements.status.value) params.set('status', filters.elements.status.value);

    const answer = await call('/api/admin/inquiries?' + params.toString());
    if (thisRequest !== requestNumber) return;
    if (!answer || !answer.response.ok) {
      show(listStatus, problem(answer, 'The messages could not be loaded.'), 'error');
      return;
    }
    const result = answer.result;
    const total = result.pagination.total;
    // After a delete, the last page can be empty: show the page before it.
    if (result.inquiries.length === 0 && total > 0) {
      page = result.pagination.totalPages;
      return loadMessages();
    }
    const totalPages = Math.max(result.pagination.totalPages, 1);
    rows.replaceChildren(...result.inquiries.map(buildRow));
    tableWrap.hidden = total === 0;
    empty.hidden = total !== 0;
    pageText.textContent = total === 0 ? ''
      : 'Page ' + page + ' of ' + totalPages + ' · ' + total + (total === 1 ? ' message' : ' messages');
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  }

  filters.addEventListener('submit', function (event) { event.preventDefault(); });
  filters.elements.q.addEventListener('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { page = 1; loadMessages(); }, TYPING_DELAY);
  });
  filters.elements.status.addEventListener('change', function () { page = 1; loadMessages(); });
  prevButton.addEventListener('click', function () { page -= 1; loadMessages(); });
  nextButton.addEventListener('click', function () { page += 1; loadMessages(); });

  // ---------- One message ----------

  function fill(name, value) {
    q('[data-message-field="' + name + '"]', dialog).textContent = value;
  }

  function showMessage(inquiry) {
    current = inquiry;
    title.textContent = inquiry.name;
    avatar.textContent = initials(inquiry.name);
    sender.textContent = inquiry.name;
    emailLink.textContent = inquiry.email;
    emailLink.href = 'mailto:' + inquiry.email;
    fill('phone', inquiry.phone || '');
    fill('from', inquiry.fromAccount ? 'Customer account' : 'Visitor, no account');
    fill('topic', TOPICS[inquiry.topic] || inquiry.topic);
    fill('received', formatDate(inquiry.createdAt));
    q('[data-message-field="status"]', dialog).replaceChildren(badge(inquiry.status));
    text.textContent = inquiry.message;

    // The team's replies, on the right of the conversation.
    repliesBox.replaceChildren(...inquiry.replies.map(function (reply) {
      const bubble = element('article', 'msg__bubble msg__bubble--out');
      bubble.append(
        element('p', 'msg__by', (/easytrip/i.test(reply.by) ? 'EasyTrip team' : reply.by + ', EasyTrip team') + ' · ' + formatDate(reply.createdAt)),
        element('p', 'msg__text', reply.message)
      );
      return bubble;
    }));

    // A likely typo in the address: the email would never arrive.
    const domain = inquiry.email.split('@').pop().toLowerCase();
    const fixed = TYPOS[domain];
    emailWarning.hidden = !fixed;
    if (fixed) {
      emailWarning.textContent = 'Check the address: "' + domain + '" looks like a typo of "' + fixed + '", so the email ' +
        'will probably not arrive.' + (inquiry.fromAccount ? ' The customer will still see your reply on their account page.' : '');
    }

    replyLabel.textContent = 'Reply to ' + inquiry.name.split(' ')[0];
    replyHint.textContent = (inquiry.fromAccount
      ? 'Emailed to ' + inquiry.email + ' and shown on their account page.'
      : 'Emailed to ' + inquiry.email + '. Visitors have no account, so email is the only way they get it.') +
      ' Ctrl + Enter sends it.';
    toggleButton.textContent = inquiry.status === 'closed' ? 'Reopen' : 'Mark as closed';
    countReply();
  }

  replyForm.elements.message.addEventListener('input', countReply);
  // Ctrl + Enter (or Cmd + Enter on a Mac) sends the reply.
  replyForm.elements.message.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      replyForm.requestSubmit();
    }
  });

  async function openMessage(id, button) {
    const answer = await call('/api/admin/inquiries/' + id);
    if (!answer || !answer.response.ok) {
      show(listStatus, problem(answer, 'This message could not be opened.'), 'error');
      listStatus.focus();
      loadMessages();
      return;
    }
    let inquiry = answer.result.inquiry;

    // Opening a new message marks it as read.
    if (inquiry.status === 'new') {
      const marked = await call('/api/admin/inquiries/' + id, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'read' }),
      });
      if (marked && marked.response.ok) {
        inquiry = marked.result.inquiry;
        loadMessages();
        messagesChanged();
      }
    }

    opener = button;
    dialogStatus.hidden = true;
    replyForm.reset();
    replyError.hidden = true;
    replyForm.elements.message.removeAttribute('aria-invalid');
    showMessage(inquiry);
    dialog.showModal();
    title.focus();
  }

  replyForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    replyError.hidden = true;
    replyForm.elements.message.removeAttribute('aria-invalid');
    const message = replyForm.elements.message.value.trim();
    if (!message) {
      replyError.textContent = 'Write your reply.';
      replyError.hidden = false;
      replyForm.elements.message.setAttribute('aria-invalid', 'true');
      replyForm.elements.message.focus();
      return;
    }

    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    const answer = await call('/api/admin/inquiries/' + current.id + '/replies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: message }),
    });
    sendButton.disabled = false;
    sendButton.textContent = 'Send reply';

    if (answer && answer.response.ok) {
      replyForm.reset();
      showMessage(answer.result.inquiry);
      const last = repliesBox.lastElementChild;
      if (last) last.scrollIntoView({ block: 'nearest' });
      show(dialogStatus, answer.result.message, 'success');
      dialogStatus.focus();
      loadMessages();
      messagesChanged();
      return;
    }
    if (answer && answer.result.fields && answer.result.fields.message) {
      replyError.textContent = answer.result.fields.message;
      replyError.hidden = false;
      replyForm.elements.message.setAttribute('aria-invalid', 'true');
      replyForm.elements.message.focus();
      return;
    }
    show(dialogStatus, problem(answer, 'Your reply could not be saved.'), 'error');
    dialogStatus.focus();
  });

  toggleButton.addEventListener('click', async function () {
    const status = current.status === 'closed' ? 'read' : 'closed';
    const answer = await call('/api/admin/inquiries/' + current.id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status }),
    });
    if (answer && answer.response.ok) {
      showMessage(answer.result.inquiry);
      show(dialogStatus, status === 'closed' ? 'The message is closed.' : 'The message is open again.', 'success');
      loadMessages();
      messagesChanged();
    } else {
      show(dialogStatus, problem(answer, 'The status could not be changed.'), 'error');
    }
    dialogStatus.focus();
  });

  q('[data-message-delete]', dialog).addEventListener('click', async function () {
    if (!window.confirm('Delete the message from ' + current.name + ' and its replies? This can\'t be undone.')) return;
    const answer = await call('/api/admin/inquiries/' + current.id, { method: 'DELETE' });
    if (answer && answer.response.ok) {
      opener = null; // Its row is gone, so the focus goes to the message below the table.
      dialog.close();
      show(listStatus, answer.result.message, 'success');
      listStatus.focus();
      loadMessages();
      messagesChanged();
    } else {
      show(dialogStatus, problem(answer, 'The message could not be deleted.'), 'error');
      dialogStatus.focus();
    }
  });

  q('[data-message-back]', dialog).addEventListener('click', function () { dialog.close(); });
  // Give the focus back to the message's "Open" button. A reply or a status change redraws the
  // table, so the button may be a new one: it is found again by the message's id.
  dialog.addEventListener('close', function () {
    if (opener) {
      const button = document.body.contains(opener)
        ? opener
        : panel.querySelector('[data-message-id="' + current.id + '"]');
      if (button) button.focus();
    }
    opener = null;
  });

  // Start once account.js has checked that an admin is logged in.
  document.addEventListener('easytrip:admin-ready', loadMessages);
})();
