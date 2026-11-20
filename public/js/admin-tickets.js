// Admin page: the tickets (flights, buses and trains). It uses GET /api/admin/tickets (the
// table) and PATCH /api/admin/tickets/:id to confirm a pending ticket or to cancel one.
// Cancelling gives the customer's credit back. The server only accepts these from an admin.
// It works like js/admin-bookings.js: a ticket has a route where a booking has a stay.
(function () {
  'use strict';

  const panel = document.querySelector('[data-admin-tickets]');
  if (!panel) return;

  const PAGE_SIZE = 10;
  const TYPING_DELAY = 300;
  const STATUSES = { pending: 'Pending', confirmed: 'Confirmed', cancelled: 'Cancelled' };
  const TRANSPORTS = { flight: 'Flight', bus: 'Bus', train: 'Train' };
  // "premium" means something else on a plane and on a bus, so the names depend on the transport.
  const CLASSES = {
    flight: { economy: 'Economy', premium: 'Premium Economy', business: 'Business', first: 'First' },
    bus: { standard: 'Standard seating', premium: 'Premium seating' },
    train: { standard: 'Standard class', first: 'First class', sleeper: 'Sleeper' }
  };

  const q = function (sel) { return panel.querySelector(sel); };
  const rows = q('[data-ticket-rows]');
  const tableWrap = q('.admin-table-wrap');
  const empty = q('[data-ticket-empty]');
  const status = q('[data-ticket-status]');
  const pageText = q('[data-ticket-page]');
  const prevButton = q('[data-ticket-prev]');
  const nextButton = q('[data-ticket-next]');
  const filters = q('[data-ticket-filters]');

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

  // A ticket's dates are plain days ("2027-03-01"), so they are read as local days.
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
    if (answer.response.status === 403) return 'Only admins can manage tickets.';
    return answer.result.error || fallback;
  }

  function routeOf(ticket) {
    return ticket.origin + ' to ' + ticket.destination;
  }

  // A small button whose hidden text says which ticket it is for.
  function rowButton(label, ticket, extraClass) {
    const button = element('button', 'et-btn et-btn--outline admin-btn' + (extraClass ? ' ' + extraClass : ''));
    button.type = 'button';
    button.append(label, element('span', 'et-visually-hidden', ': ' + routeOf(ticket) + ', ' + ticket.user.name));
    return button;
  }

  function buildRow(ticket) {
    const tr = document.createElement('tr');

    const customer = document.createElement('td');
    customer.append(element('span', 'admin-table__name', ticket.user.name), element('span', 'admin-table__sub', ticket.user.email));

    const what = document.createElement('td');
    what.append(
      element('span', 'admin-table__name', TRANSPORTS[ticket.type] + ' · ' + routeOf(ticket)),
      element('span', 'admin-table__sub', ticket.tripType === 'round'
        ? 'Round trip · ' + showDay(ticket.departDate) + ', back on ' + showDay(ticket.returnDate)
        : 'One way · ' + showDay(ticket.departDate)),
      element('span', 'admin-table__sub',
        ticket.travelers + (ticket.travelers === 1 ? ' traveler' : ' travelers') + ' · ' + CLASSES[ticket.type][ticket.seatClass])
    );

    // A plan saved before tickets had a price has no total, and was not paid with credit.
    const total = element('td', 'credit-amount');
    total.append(element('span', 'admin-table__name', ticket.total === null ? 'No price' : money(ticket.total)));
    total.append(element('span', 'admin-table__sub', ticket.paidWithCredit === null ? 'Not paid with credit' : 'Paid with credit'));

    const statusCell = document.createElement('td');
    statusCell.append(element('span', 'messages-badge messages-badge--' + ticket.status, STATUSES[ticket.status]));

    const actions = element('td', 'admin-table__actions');
    if (ticket.status === 'pending') {
      const confirmButton = rowButton('Confirm', ticket);
      confirmButton.addEventListener('click', function () { change(ticket, 'confirmed'); });
      actions.append(confirmButton);
    }
    if (ticket.status !== 'cancelled') {
      const cancelButton = rowButton('Cancel', ticket, 'admin-btn--danger');
      cancelButton.addEventListener('click', function () { change(ticket, 'cancelled'); });
      actions.append(cancelButton);
    }

    tr.append(element('td', '', showDateTime(ticket.createdAt)), customer, what, total, statusCell, actions);
    return tr;
  }

  async function load() {
    const thisRequest = ++requestNumber;
    const params = new URLSearchParams({ page: page, limit: PAGE_SIZE });
    const search = filters.elements.q.value.trim();
    if (search) params.set('q', search);
    if (filters.elements.type.value) params.set('type', filters.elements.type.value);
    if (filters.elements.status.value) params.set('status', filters.elements.status.value);

    const answer = await call('/api/admin/tickets?' + params.toString());
    if (thisRequest !== requestNumber) return;
    if (!answer || !answer.response.ok) {
      show(problem(answer, 'The tickets could not be loaded.'), 'error');
      return;
    }
    const result = answer.result;
    const total = result.pagination.total;
    // The status filter can empty the last page after a change: show the page before it.
    if (result.tickets.length === 0 && total > 0) {
      page = result.pagination.totalPages;
      return load();
    }
    const totalPages = Math.max(result.pagination.totalPages, 1);
    rows.replaceChildren(...result.tickets.map(buildRow));
    tableWrap.hidden = total === 0;
    empty.hidden = total !== 0;
    pageText.textContent = total === 0 ? ''
      : 'Page ' + page + ' of ' + totalPages + ' · ' + total + (total === 1 ? ' ticket' : ' tickets');
    prevButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;
  }

  async function change(ticket, newStatus) {
    if (newStatus === 'cancelled') {
      const refund = ticket.paidWithCredit === null
        ? 'It was not paid with credit, so nothing is refunded.'
        : money(ticket.paidWithCredit) + ' goes back to ' + ticket.user.name + "'s credit.";
      if (!window.confirm('Cancel the ticket from ' + routeOf(ticket) + '? ' + refund)) return;
    }

    const answer = await call('/api/admin/tickets/' + ticket.id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    // The table is drawn again either way: after an error it shows what the server has.
    await load();
    if (answer && answer.response.ok) {
      show(answer.result.message, 'success');
      // The customers' credit changes after a refund, so the other sections read their data again.
      document.dispatchEvent(new CustomEvent('easytrip:bookings-changed'));
    } else {
      show(problem(answer, 'The ticket could not be changed.'), 'error');
    }
    status.focus(); // The row's buttons were redrawn, so the focus goes to the message.
  }

  filters.addEventListener('submit', function (event) { event.preventDefault(); });
  filters.elements.q.addEventListener('input', function () {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(function () { page = 1; load(); }, TYPING_DELAY);
  });
  ['type', 'status'].forEach(function (name) {
    filters.elements[name].addEventListener('change', function () { page = 1; load(); });
  });
  prevButton.addEventListener('click', function () { page -= 1; load(); });
  nextButton.addEventListener('click', function () { page += 1; load(); });

  // Start once account.js has checked that an admin is logged in.
  document.addEventListener('easytrip:admin-ready', load);
})();
