// Admin page: the bookings. It uses GET /api/admin/bookings (the table) and
// PATCH /api/admin/bookings/:id to confirm a pending booking or to cancel one. Cancelling gives
// the customer's credit back. The server only accepts these from an admin.
(function () {
  'use strict';

  const panel = document.querySelector('[data-admin-bookings]');
  if (!panel) return;

  const PAGE_SIZE = 10;
  const TYPING_DELAY = 300;
  const STATUSES = { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' };

  const q = function (sel) { return panel.querySelector(sel); };
  const rows = q('[data-booking-rows]');
  const tableWrap = q('.admin-table-wrap');
  const empty = q('[data-booking-empty]');
  const status = q('[data-booking-status]');
  const pageText = q('[data-booking-page]');
  const prevButton = q('[data-booking-prev]');
  const nextButton = q('[data-booking-next]');
  const filters = q('[data-booking-filters]');

  let page = 1;
  let requestNumber = 0; // Only the answer to the newest list request is shown.
  let typingTimer = null;

  function element(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content !== undefined) el.textContent = content;
    return el;
  }

  function money(amount) {
    const digits = Number.isInteger(amount) ? 0 : 2;
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  // A booking's dates are plain days ("2027-01-18"), so they are read as local days.
  function showDay(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function showDateTime(iso) {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function show(message, kind) {
    status.textContent = message;
    status.className = 'auth-status auth-status--' + kind;
    status.hidden = false;
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
    if (answer.response.status === 403) return 'Only admins can manage bookings.';
    return answer.result.error || fallback;
  }

  // A small button whose hidden text says which booking it is for.
  function rowButton(label, booking, extraClass) {
    const button = element('button', 'et-btn et-btn--outline admin-btn' + (extraClass ? ' ' + extraClass : ''));
    button.type = 'button';
    button.append(label, element('span', 'et-visually-hidden', ': ' + booking.stay.name + ', ' + booking.user.name));
    return button;
  }

  function buildRow(booking) {
    const tr = document.createElement('tr');

    const customer = document.createElement('td');
    customer.append(element('span', 'admin-table__name', booking.user.name), element('span', 'admin-table__sub', booking.user.email));

    const stay = document.createElement('td');
    stay.append(
      element('span', 'admin-table__name', booking.stay.name),
      element('span', 'admin-table__sub', showDay(booking.startDate) + ' to ' + showDay(booking.endDate)),
      element('span', 'admin-table__sub',
        booking.nights + (booking.nights === 1 ? ' night' : ' nights') + ' · ' +
        booking.travelers + (booking.travelers === 1 ? ' traveler' : ' travelers'))
    );

    const total = element('td', 'credit-amount');
    total.append(element('span', 'admin-table__name', money(booking.total)));
    // A booking made before credit existed was not paid with credit, so it has no refund.
    total.append(element('span', 'admin-table__sub', booking.paidWithCredit === null ? 'Not paid with credit' : 'Paid with credit'));

    const statusCell = document.createElement('td');
    statusCell.append(element('span', 'messages-badge messages-badge--' + booking.status, STATUSES[booking.status]));

    const actions = element('td', 'admin-table__actions');
    if (booking.status === 'pending') {
      const confirmButton = rowButton('Confirm', booking);
      confirmButton.addEventListener('click', function () { change(booking, 'confirmed'); });
      actions.append(confirmButton);
    }
    if (booking.status !== 'cancelled') {
      const cancelButton = rowButton('Cancel', booking, 'admin-btn--danger');
      cancelButton.addEventListener('click', function () { change(booking, 'cancelled'); });
      actions.append(cancelButton);
    }

    tr.append(element('td', '', showDateTime(booking.createdAt)), customer, stay, total, statusCell, actions);
    return tr;
  }

  async function load() {
    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    const search = filters.elements.q.value.trim();
    if (search) params.set('q', search);
    if (filters.elements.status.value) params.set('status', filters.elements.status.value);

    const answer = await call('/api/admin/bookings?' + params.toString());
    if (thisRequest !== requestNumber) return;
    if (!answer || !answer.response.ok) {
      show(problem(answer, 'The bookings could not be loaded.'), 'error');
      return;
    }
    const result = answer.result;
    const total = result.pagination.total;
    // The status filter can empty the last page after a change: show the page before it.
    if (result.bookings.length === 0 && total > 0) {
      page = result.pagination.totalPages;
      return load();
    }
    const totalPages = Math.max(result.pagination.totalPages, 1);
    rows.replaceChildren(...result.bookings.map(buildRow));
    tableWrap.hidden = total === 0;
    empty.hidden = total !== 0;
    pageText.textContent = total === 0 ? ''
      : 'Page ' + page + ' of ' + totalPages + ' · ' + total + (total === 1 ? ' booking' : ' bookings');
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  }

  async function change(booking, newStatus) {
    if (newStatus === 'cancelled') {
      const refund = booking.paidWithCredit === null
        ? 'It was not paid with credit, so nothing is refunded.'
        : money(booking.paidWithCredit) + ' goes back to ' + booking.user.name + "'s credit.";
      if (!window.confirm('Cancel the booking of "' + booking.stay.name + '"? ' + refund)) return;
    }

    const answer = await call('/api/admin/bookings/' + booking.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    // The table is drawn again either way: after an error it shows what the server has.
    await load();
    if (answer && answer.response.ok) {
      show(answer.result.message, 'success');
      // The totals, the charts and the customers' credit change too.
      document.dispatchEvent(new CustomEvent('easytrip:bookings-changed'));
    } else {
      show(problem(answer, 'The booking could not be changed.'), 'error');
    }
    status.focus(); // The row's buttons were redrawn, so the focus goes to the message.
  }

  filters.addEventListener('submit', function (event) { event.preventDefault(); });
  filters.elements.q.addEventListener('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { page = 1; load(); }, TYPING_DELAY);
  });
  filters.elements.status.addEventListener('change', function () { page = 1; load(); });
  prevButton.addEventListener('click', function () { page -= 1; load(); });
  nextButton.addEventListener('click', function () { page += 1; load(); });

  // Start once account.js has checked that an admin is logged in.
  document.addEventListener('easytrip:admin-ready', load);
})();
