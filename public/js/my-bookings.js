// "My account" page: the user's credit, their bookings, their tickets and the credit history.
// GET /api/credit/mine gives the credit and its changes, GET /api/bookings/mine the bookings and
// GET /api/tickets/mine the tickets. POST /api/bookings/:id/cancel and POST
// /api/tickets/:id/cancel cancel one (its price goes back to the credit).
// Everything is shown with textContent, so a name or a note can never run as HTML.
(function () {
  'use strict';

  const bookingsPanel = document.querySelector('[data-my-bookings]');
  const ticketsPanel = document.querySelector('[data-my-tickets]');
  const historyPanel = document.querySelector('[data-credit-history]');
  if (!bookingsPanel || !ticketsPanel || !historyPanel) return;

  const balance = document.querySelector('[data-credit-balance]');
  const creditRows = historyPanel.querySelector('[data-credit-rows]');
  const creditWrap = historyPanel.querySelector('[data-credit-wrap]');
  const creditEmpty = historyPanel.querySelector('[data-credit-empty]');

  const STATUSES = { pending: 'Waiting for confirmation', confirmed: 'Confirmed', cancelled: 'Cancelled' };
  const TRANSPORTS = { flight: 'Flight', bus: 'Bus', train: 'Train' };
  // "premium" means something else on a plane and on a bus, so the names depend on the transport.
  const CLASSES = {
    flight: { economy: 'Economy', premium: 'Premium Economy', business: 'Business', first: 'First' },
    bus: { standard: 'Standard seating', premium: 'Premium seating' },
    train: { standard: 'Standard class', first: 'First class', sleeper: 'Sleeper' }
  };

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  // "$560" for a whole amount, "$1,000.50" with cents.
  function money(amount) {
    const digits = Number.isInteger(amount) ? 0 : 2;
    return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  // A booking's or a ticket's dates are plain days ("2027-01-18"), so they are read as local days.
  function showDay(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function showDateTime(iso) {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function todayIso() {
    const now = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
  }

  function count(number, one, many) {
    return number + ' ' + (number === 1 ? one : many);
  }

  async function call(url, options) {
    try {
      const response = await fetch(url, options);
      return { response: response, result: await response.json() };
    } catch (err) {
      return null;
    }
  }

  // What was paid, and where the money is now.
  function totalLine(item) {
    if (item.total === null) return 'Not paid with credit';
    if (!item.paidWithCredit) return money(item.total);
    return money(item.total) + (item.status === 'cancelled' ? ', given back to your credit' : ', paid with your credit');
  }

  // ---------- Credit ----------

  function routeOf(ticket) {
    return TRANSPORTS[ticket.type] + ', ' + ticket.origin + ' to ' + ticket.destination;
  }

  // What a line of the history says, in the customer's words.
  function describe(change) {
    if (change.type === 'booking') return 'Booking: ' + (change.stay || 'a stay');
    if (change.type === 'ticket') return 'Ticket: ' + (change.ticket ? routeOf(change.ticket) : 'a ticket');
    if (change.type === 'refund') {
      if (change.ticket) return 'Refund: ' + routeOf(change.ticket);
      return 'Refund: ' + (change.stay || 'a cancelled booking');
    }
    const what = change.type === 'top_up' ? 'Credit added by EasyTrip' : 'Credit removed by EasyTrip';
    return change.note ? what + ' (' + change.note + ')' : what;
  }

  function historyRow(change) {
    const tr = document.createElement('tr');
    const adding = change.amount > 0;
    tr.append(
      element('td', '', showDateTime(change.createdAt)),
      element('td', '', describe(change)),
      // The sign is written out, so the meaning never depends on the colour.
      element('td', 'credit-amount credit-amount--' + (adding ? 'in' : 'out'),
        (adding ? '+' : '−') + money(Math.abs(change.amount))),
      element('td', 'credit-amount', money(change.balanceAfter))
    );
    // On a phone the table becomes stacked rows; these labels name the two amounts there.
    tr.children[2].dataset.label = 'Amount';
    tr.children[3].dataset.label = 'Credit after';
    return tr;
  }

  async function loadCredit() {
    const answer = await call('/api/credit/mine');
    if (!answer || !answer.response.ok) return; // The lists below say when the server is unreachable.
    balance.textContent = money(answer.result.credit);
    creditRows.replaceChildren(...answer.result.history.map(historyRow));
    creditWrap.hidden = answer.result.history.length === 0;
    creditEmpty.hidden = answer.result.history.length !== 0;
  }

  // ---------- One list: the bookings, or the tickets ----------

  // The two lists work the same way. Each one says where its items come from, how one item
  // is drawn, and the words of its messages.
  function makeList(panel, config) {
    const list = panel.querySelector('[data-list]');
    const status = panel.querySelector('[data-list-status]');

    function showStatus(text, kind) {
      status.textContent = text;
      status.className = 'auth-status' + (kind ? ' auth-status--' + kind : '');
      status.hidden = false;
    }

    function cancelButton(item) {
      const button = element('button', 'et-btn et-btn--outline admin-btn admin-btn--danger');
      button.type = 'button';
      button.append('Cancel this ' + config.noun, element('span', 'et-visually-hidden', ': ' + config.nameOf(item)));
      button.addEventListener('click', function () { cancel(item, button); });
      return button;
    }

    async function load() {
      const answer = await call(config.listUrl);
      if (!answer) {
        showStatus("We can't reach the server right now, so your " + config.noun + "s can't be shown.", 'error');
        return;
      }
      if (!answer.response.ok) {
        showStatus(answer.result.error || 'Your ' + config.noun + "s couldn't be loaded.", 'error');
        return;
      }
      const items = answer.result[config.key];
      list.replaceChildren(...items.map(function (item) {
        // One that has started, or a cancelled one, can't be cancelled here.
        const canCancel = item.status !== 'cancelled' && config.startOf(item) > todayIso();
        return config.draw(item, canCancel ? cancelButton(item) : null);
      }));
      if (items.length === 0) showStatus(config.empty);
      else status.hidden = true;
    }

    async function cancel(item, button) {
      const refund = item.paidWithCredit ? ' ' + money(item.paidWithCredit) + ' goes back to your credit.' : '';
      if (!window.confirm('Cancel your ' + config.noun + ' (' + config.nameOf(item) + ')?' + refund)) return;

      button.disabled = true;
      const answer = await call(config.cancelUrl(item), { method: 'POST' });
      if (!answer) {
        button.disabled = false;
        showStatus("We can't reach the server right now. Please try again.", 'error');
        status.focus();
        return;
      }
      // The list is drawn again either way: after an error it shows what the server has.
      await Promise.all([load(), loadCredit()]);
      showStatus(answer.response.ok ? answer.result.message : (answer.result.error || 'It could not be cancelled.'),
        answer.response.ok ? 'success' : 'error');
      status.focus();
    }

    return { load: load };
  }

  function badge(item) {
    return element('span', 'messages-badge messages-badge--' + item.status, STATUSES[item.status]);
  }

  // ---------- Bookings ----------

  const bookings = makeList(bookingsPanel, {
    key: 'bookings',
    noun: 'booking',
    listUrl: '/api/bookings/mine',
    cancelUrl: function (booking) { return '/api/bookings/' + booking.id + '/cancel'; },
    nameOf: function (booking) { return booking.stay.name; },
    startOf: function (booking) { return booking.startDate; },
    empty: 'You have no bookings yet. Open a hotel or a chalet and choose "Book with my credit".',
    draw: function (booking, button) {
      const item = element('li', 'messages-item booking-item');

      const img = document.createElement('img');
      img.className = 'booking-item__img';
      img.src = booking.stay.image;
      img.alt = '';
      img.width = 96;
      img.height = 72;
      img.loading = 'lazy';

      const body = document.createElement('div');
      const head = element('div', 'messages-item__head');
      head.append(element('span', 'messages-item__topic', booking.stay.name), badge(booking));
      body.append(
        head,
        element('p', 'booking-item__text', booking.stay.location),
        element('p', 'booking-item__text',
          showDay(booking.startDate) + ' to ' + showDay(booking.endDate) + ' · ' +
          count(booking.nights, 'night', 'nights') + ' · ' + count(booking.travelers, 'traveler', 'travelers')),
        element('p', 'booking-item__total', totalLine(booking))
      );
      if (button) body.append(button);

      item.append(img, body);
      return item;
    }
  });

  // ---------- Tickets ----------

  const tickets = makeList(ticketsPanel, {
    key: 'tickets',
    noun: 'ticket',
    listUrl: '/api/tickets/mine',
    cancelUrl: function (ticket) { return '/api/tickets/' + ticket.id + '/cancel'; },
    nameOf: function (ticket) { return TRANSPORTS[ticket.type].toLowerCase() + ', ' + ticket.origin + ' to ' + ticket.destination; },
    startOf: function (ticket) { return ticket.departDate; },
    empty: 'You have no tickets yet. Plan a flight, or a bus or train journey, and choose "Buy with my credit".',
    draw: function (ticket, button) {
      const item = element('li', 'messages-item');
      const head = element('div', 'messages-item__head');

      // "Beirut → Paris". Screen readers hear "Beirut to Paris".
      const route = element('span', 'messages-item__topic');
      const arrow = element('span', '', ticket.tripType === 'round' ? ' ⇄ ' : ' → ');
      arrow.setAttribute('aria-hidden', 'true');
      route.append(TRANSPORTS[ticket.type] + ' · ' + ticket.origin, arrow, element('span', 'et-visually-hidden', ' to '), ticket.destination);
      head.append(route, badge(ticket));

      item.append(
        head,
        element('p', 'booking-item__text',
          ticket.tripType === 'round'
            ? 'Round trip · ' + showDay(ticket.departDate) + ', back on ' + showDay(ticket.returnDate)
            : 'One way · ' + showDay(ticket.departDate)),
        element('p', 'booking-item__text',
          count(ticket.travelers, 'traveler', 'travelers') + ' · ' + CLASSES[ticket.type][ticket.seatClass]),
        element('p', 'booking-item__total', totalLine(ticket))
      );
      if (button) item.append(button);
      return item;
    }
  });

  // Start once account.js has checked with the server who is logged in.
  document.addEventListener('easytrip:account-ready', function () {
    bookings.load();
    tickets.load();
    loadCredit();
  });
})();
