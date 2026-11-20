// Admin page: the accounts and their credit. It uses GET /api/admin/users (the table), and for
// one account GET /api/admin/users/:id/credit (its credit history) and POST to the same address
// to add or remove credit. Customers pay for their bookings with this credit.
// Names, emails and notes are always shown with textContent, never as HTML.
(function () {
  'use strict';

  const panel = document.querySelector('[data-admin-users]');
  const dialog = document.querySelector('[data-credit-dialog]');
  if (!panel || !dialog) return;

  const PAGE_SIZE = 10;
  const TYPING_DELAY = 300;

  const q = function (sel, root) { return (root || panel).querySelector(sel); };
  const rows = q('[data-user-rows]');
  const tableWrap = q('.admin-table-wrap');
  const empty = q('[data-user-empty]');
  const listStatus = q('[data-user-status]');
  const pageText = q('[data-user-page]');
  const prevButton = q('[data-user-prev]');
  const nextButton = q('[data-user-next]');
  const filters = q('[data-user-filters]');

  const form = q('[data-credit-form]', dialog);
  const title = q('[data-credit-title]', dialog);
  const email = q('[data-credit-email]', dialog);
  const creditNow = q('[data-credit-now]', dialog);
  const dialogStatus = q('[data-credit-status]', dialog);
  const saveButton = q('[data-credit-save]', dialog);
  const historyList = q('[data-credit-list]', dialog);
  const historyNone = q('[data-credit-none]', dialog);

  let page = 1;
  let requestNumber = 0; // Only the answer to the newest list request is shown.
  let typingTimer = null;
  let current = null; // The account open in the dialog.

  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }

  // "$560" for a whole amount, "$1,000.50" with cents.
  function money(amount) {
    const digits = Number.isInteger(amount) ? 0 : 2;
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function showDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function show(box, message, kind) {
    box.textContent = message;
    box.className = 'auth-status auth-status--' + kind;
    box.hidden = false;
  }

  // Sends a request and returns { response, result }, or null when the server can't be reached.
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
    if (answer.response.status === 403) return 'Only admins can change credit.';
    return answer.result.error || fallback;
  }

  // ---------- The table ----------

  const ID_STATUSES = { none: 'No document', unverified: 'No selfie yet', pending: 'Waiting', verified: 'Verified', rejected: 'Rejected' };

  // A small button whose hidden text says which account it is for.
  function rowButton(label, user, extraClass) {
    const button = element('button', 'et-btn et-btn--outline admin-btn' + (extraClass ? ' ' + extraClass : ''));
    button.type = 'button';
    button.append(label, element('span', 'et-visually-hidden', ': ' + user.name));
    return button;
  }

  // PATCH /api/admin/users/:id: customer to admin, or back.
  async function changeRole(user) {
    const role = user.role === 'admin' ? 'customer' : 'admin';
    const question = role === 'admin'
      ? 'Make ' + user.name + ' an admin? They will see this dashboard, change credit and delete accounts.'
      : 'Make ' + user.name + ' a customer? They will no longer open this dashboard.';
    if (!window.confirm(question)) return;
    const answer = await call('/api/admin/users/' + user.id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: role })
    });
    await load();
    show(listStatus, answer && answer.response.ok ? answer.result.message : problem(answer, 'The role could not be changed.'),
      answer && answer.response.ok ? 'success' : 'error');
    listStatus.focus();
    document.dispatchEvent(new CustomEvent('easytrip:bookings-changed')); // the totals count customers
  }

  // DELETE /api/admin/users/:id
  async function deleteAccount(user) {
    const what = (user.bookings + user.tickets) > 0
      ? ' Their ' + user.bookings + ' bookings and ' + user.tickets + ' tickets are deleted too.'
      : '';
    if (!window.confirm('Delete the account of ' + user.name + ' (' + user.email + ')? This can\x27t be undone.' + what)) return;
    const answer = await call('/api/admin/users/' + user.id, { method: 'DELETE' });
    await load();
    show(listStatus, answer && answer.response.ok ? answer.result.message : problem(answer, 'The account could not be deleted.'),
      answer && answer.response.ok ? 'success' : 'error');
    listStatus.focus();
    document.dispatchEvent(new CustomEvent('easytrip:bookings-changed'));
  }

  function buildRow(user) {
    const tr = document.createElement('tr');

    const account = document.createElement('td');
    account.append(element('span', 'admin-table__name', user.name), element('span', 'admin-table__sub', user.email));
    if (user.role === 'admin') account.append(element('span', 'admin-table__sub', 'Admin'));

    const credit = element('td', 'credit-amount admin-table__credit' + (user.credit === 0 ? ' admin-table__credit--none' : ''),
      money(user.credit));

    // The identity check, with the same words as the Verifications section.
    const identity = document.createElement('td');
    const idStatus = user.idStatus || 'none';
    identity.append(element('span', 'messages-badge messages-badge--' + idStatus, ID_STATUSES[idStatus]));

    const actions = element('td', 'admin-table__actions admin-table__actions--wrap');
    const button = rowButton('Change credit', user);
    button.dataset.userId = user.id;
    button.addEventListener('click', function () { openCredit(user); });
    actions.append(button);
    // An admin can't change or delete their own account (the server refuses it too).
    if (!user.isYou) {
      const roleButton = rowButton(user.role === 'admin' ? 'Make customer' : 'Make admin', user);
      roleButton.addEventListener('click', function () { changeRole(user); });
      const deleteButton = rowButton('Delete', user, 'admin-btn--danger');
      deleteButton.addEventListener('click', function () { deleteAccount(user); });
      actions.append(roleButton, deleteButton);
    } else {
      actions.append(element('span', 'admin-table__sub', 'Your account'));
    }

    tr.append(account, element('td', '', showDate(user.createdAt)), identity,
      element('td', 'credit-amount', user.bookings + user.tickets), credit, actions);
    return tr;
  }

  async function load() {
    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    const search = filters.elements.q.value.trim();
    if (search) params.set('q', search);

    const answer = await call('/api/admin/users?' + params.toString());
    if (thisRequest !== requestNumber) return;
    if (!answer || !answer.response.ok) {
      show(listStatus, problem(answer, 'The accounts could not be loaded.'), 'error');
      return;
    }
    const result = answer.result;
    const total = result.pagination.total;
    const totalPages = Math.max(result.pagination.totalPages, 1);
    rows.replaceChildren(...result.users.map(buildRow));
    tableWrap.hidden = total === 0;
    empty.hidden = total !== 0;
    pageText.textContent = total === 0 ? ''
      : 'Page ' + page + ' of ' + totalPages + ' · ' + total + (total === 1 ? ' account' : ' accounts');
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  }

  filters.addEventListener('submit', function (event) { event.preventDefault(); });
  filters.elements.q.addEventListener('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { page = 1; load(); }, TYPING_DELAY);
  });
  prevButton.addEventListener('click', function () { page -= 1; load(); });
  nextButton.addEventListener('click', function () { page += 1; load(); });

  // ---------- The credit dialog ----------

  // What a line of the history says, in the admin's words.
  function describe(change) {
    const route = change.ticket ? change.ticket.type + ', ' + change.ticket.origin + ' to ' + change.ticket.destination : '';
    if (change.type === 'booking') return 'Paid for a booking: ' + (change.stay || 'a stay');
    if (change.type === 'ticket') return 'Paid for a ticket: ' + (route || 'a ticket');
    if (change.type === 'refund') return 'Refund: ' + (route || change.stay || 'a cancelled booking');
    const what = change.type === 'top_up' ? 'Credit added' : 'Credit removed';
    return change.note ? what + ' (' + change.note + ')' : what;
  }

  function showHistory(history) {
    historyList.replaceChildren(...history.map(function (change) {
      const item = element('li', 'admin-feed__item');
      const text = element('div', 'admin-feed__text');
      text.append(
        element('span', 'admin-feed__title', describe(change)),
        element('span', 'admin-feed__sub', showDate(change.createdAt) + ' · credit after: ' + money(change.balanceAfter))
      );
      const adding = change.amount > 0;
      // The sign is written out, so the meaning never depends on the colour.
      item.append(text, element('span', 'admin-feed__amount' + (adding ? ' admin-feed__amount--in' : ''),
        (adding ? '+' : '−') + money(Math.abs(change.amount))));
      return item;
    }));
    historyNone.hidden = history.length > 0;
  }

  function clearErrors() {
    form.querySelectorAll('[data-error-for]').forEach(function (p) {
      p.textContent = '';
      p.hidden = true;
    });
    form.querySelectorAll('[aria-invalid]').forEach(function (field) { field.removeAttribute('aria-invalid'); });
  }

  async function openCredit(user) {
    const answer = await call('/api/admin/users/' + user.id + '/credit');
    if (!answer || !answer.response.ok) {
      show(listStatus, problem(answer, "This account's credit could not be opened."), 'error');
      listStatus.focus();
      load();
      return;
    }

    current = user;
    form.reset();
    clearErrors();
    dialogStatus.hidden = true;
    title.textContent = 'Credit of ' + user.name;
    email.textContent = user.email;
    creditNow.textContent = money(answer.result.credit);
    showHistory(answer.result.history);
    dialog.showModal();
    form.elements.amount.focus();
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearErrors();
    dialogStatus.hidden = true;

    // The same rule as the server: an amount like 200 or 49.99.
    const amount = form.elements.amount.value.trim();
    if (!/^[0-9]{1,6}(\.[0-9]{1,2})?$/.test(amount) || Number(amount) <= 0) {
      const errorText = form.querySelector('[data-error-for="amount"]');
      errorText.textContent = 'Enter an amount like 200 or 49.99.';
      errorText.hidden = false;
      form.elements.amount.setAttribute('aria-invalid', 'true');
      form.elements.amount.focus();
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    const answer = await call('/api/admin/users/' + current.id + '/credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: form.elements.action.value,
        amount: amount,
        note: form.elements.note.value
      })
    });
    saveButton.disabled = false;
    saveButton.textContent = 'Save';

    if (answer && answer.response.ok) {
      form.reset();
      creditNow.textContent = money(answer.result.credit);
      showHistory(answer.result.history);
      show(dialogStatus, answer.result.message, 'success');
      dialogStatus.focus();
      load(); // The table behind the dialog shows the new credit.
      return;
    }

    // 400 or 409: the server says which field is wrong (for example, more than the account has).
    if (answer && answer.result.fields) {
      let first = null;
      Object.keys(answer.result.fields).forEach(function (name) {
        const errorText = form.querySelector('[data-error-for="' + name + '"]');
        if (!errorText) return;
        errorText.textContent = answer.result.fields[name];
        errorText.hidden = false;
        const field = form.elements[name];
        // "action" is two radio buttons, so it has no single field to mark.
        if (field && field.setAttribute) {
          field.setAttribute('aria-invalid', 'true');
          if (!first) first = field;
        }
      });
      if (first) {
        first.focus();
        return;
      }
    }
    show(dialogStatus, problem(answer, 'The credit could not be changed.'), 'error');
    dialogStatus.focus();
  });

  q('[data-credit-close]', dialog).addEventListener('click', function () { dialog.close(); });
  // Give the focus back to the account's "Change credit" button. The table was redrawn after a
  // change, so the button is found again by the account's id.
  dialog.addEventListener('close', function () {
    const button = current ? panel.querySelector('[data-user-id="' + current.id + '"]') : null;
    if (button) button.focus();
  });

  // Start once account.js has checked that an admin is logged in. A cancelled booking gives
  // credit back, so the table is read again when a booking changes.
  document.addEventListener('easytrip:admin-ready', load);
  document.addEventListener('easytrip:bookings-changed', load);
})();
